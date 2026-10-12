import { prisma } from "@/lib/db";
import {
  MAX_DEALERS,
  MAX_TABLES,
  isDealerStatus,
  normalizeTime,
  type RotationAction,
  type RotationStateView,
} from "@/lib/rotation";

const META_ID = "default";

async function meta() {
  return prisma.rotationMeta.upsert({ where: { id: META_ID }, create: { id: META_ID }, update: {} });
}

/** 지금 로테이션 상태 전체(근무일 시작 이후 기록 포함) */
export async function loadRotation(): Promise<RotationStateView> {
  const m = await meta();
  const [dealers, events] = await Promise.all([
    prisma.rotationDealer.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] }),
    prisma.rotationEvent.findMany({ where: { at: { gte: m.dayStartedAt } }, orderBy: { at: "asc" }, take: 5000 }),
  ]);
  return {
    version: m.version,
    tableCount: m.tableCount,
    dayStartedAt: m.dayStartedAt.toISOString(),
    dealers: dealers.map((d) => ({
      id: d.id,
      name: d.name,
      startTime: d.startTime,
      status: isDealerStatus(d.status) ? d.status : "OFF",
      tableNo: d.tableNo,
      statusSince: d.statusSince.toISOString(),
      sort: d.sort,
    })),
    events: events.map((e) => ({
      dealerId: e.dealerId,
      status: isDealerStatus(e.status) ? e.status : "OFF",
      tableNo: e.tableNo,
      at: e.at.toISOString(),
    })),
  };
}

export async function rotationVersion() {
  return (await meta()).version;
}

export class RotationError extends Error {}

/** 상태를 바꾸고 기록을 남깁니다. 다른 기기는 version이 바뀐 걸 보고 새로 받습니다. */
export async function applyRotation(action: RotationAction) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const setDealer = async (id: string, status: string, tableNo: number | null) => {
      await tx.rotationDealer.update({ where: { id }, data: { status, tableNo, statusSince: now } });
      await tx.rotationEvent.create({ data: { dealerId: id, status, tableNo, at: now } });
    };

    switch (action.type) {
      case "addDealers": {
        const count = await tx.rotationDealer.count();
        const rows = action.dealers
          .map((d) => ({ name: d.name.trim().slice(0, 20), startTime: normalizeTime(d.startTime) }))
          .filter((d) => d.name);
        if (count + rows.length > MAX_DEALERS) throw new RotationError(`딜러는 최대 ${MAX_DEALERS}명까지 등록할 수 있습니다.`);
        const last = await tx.rotationDealer.aggregate({ _max: { sort: true } });
        let sort = (last._max.sort ?? 0) + 1;
        for (const row of rows) {
          await tx.rotationDealer.create({ data: { ...row, status: "OFF", sort: sort++ } });
        }
        break;
      }
      case "updateDealer": {
        await tx.rotationDealer.update({
          where: { id: action.id },
          data: {
            ...(action.name !== undefined ? { name: action.name.trim().slice(0, 20) } : {}),
            ...(action.startTime !== undefined ? { startTime: normalizeTime(action.startTime) } : {}),
          },
        });
        break;
      }
      case "removeDealer": {
        await tx.rotationEvent.deleteMany({ where: { dealerId: action.id } });
        await tx.rotationDealer.delete({ where: { id: action.id } });
        break;
      }
      case "assign": {
        const m = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        const tableCount = m?.tableCount ?? 20;
        if (!Number.isInteger(action.tableNo) || action.tableNo < 1 || action.tableNo > tableCount) {
          throw new RotationError(`테이블 번호는 1~${tableCount}번입니다.`);
        }
        // 그 테이블에 있던 딜러는 휴식으로 빠집니다(교대).
        const sitting = await tx.rotationDealer.findMany({
          where: { tableNo: action.tableNo, status: "WORKING", NOT: { id: action.id } },
        });
        for (const dealer of sitting) await setDealer(dealer.id, "BREAK", null);
        await setDealer(action.id, "WORKING", action.tableNo);
        break;
      }
      case "setStatus": {
        // 요청 값은 밖에서 오므로 다시 확인합니다(근무중은 테이블 배정으로만).
        const status: string = action.status;
        if (!isDealerStatus(status) || status === "WORKING") throw new RotationError("상태를 확인하세요.");
        await setDealer(action.id, status, null);
        break;
      }
      case "clearTable": {
        const sitting = await tx.rotationDealer.findMany({ where: { tableNo: action.tableNo, status: "WORKING" } });
        for (const dealer of sitting) await setDealer(dealer.id, "BREAK", null);
        break;
      }
      case "setTableCount": {
        const count = Math.max(1, Math.min(MAX_TABLES, Math.floor(action.tableCount)));
        // 줄어든 테이블에 있던 딜러는 휴식으로
        const outside = await tx.rotationDealer.findMany({ where: { status: "WORKING", tableNo: { gt: count } } });
        for (const dealer of outside) await setDealer(dealer.id, "BREAK", null);
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { tableCount: count } });
        break;
      }
      case "newDay": {
        // 새 근무일: 모두 휴무로, 지난 기록은 집계에서 빠집니다(지난 기록은 7일 지나면 지움).
        await tx.rotationDealer.updateMany({ data: { status: "OFF", tableNo: null, statusSince: now } });
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { dayStartedAt: now } });
        await tx.rotationEvent.deleteMany({ where: { at: { lt: new Date(now.getTime() - 7 * 24 * 3600 * 1000) } } });
        break;
      }
    }
    await tx.rotationMeta.update({ where: { id: META_ID }, data: { version: { increment: 1 } } });
  });
}
