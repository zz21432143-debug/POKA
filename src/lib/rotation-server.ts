import { prisma } from "@/lib/db";
import {
  MAX_DEALERS,
  normalizeTime,
  parseTableLabels,
  tableLabelsOf,
  toDealerStatus,
  type RotationAction,
  type RotationStateView,
  type TableState,
} from "@/lib/rotation";
import type { RotationPlan } from "@/lib/rotation-plan";

const META_ID = "default";
/** 시간표 칸 수 상한(5분 간격 24시간 = 288칸) */
const MAX_SLOTS = 300;

async function meta() {
  return prisma.rotationMeta.upsert({ where: { id: META_ID }, create: { id: META_ID }, update: {} });
}

function parseTableState(json: string | null): Record<string, TableState> {
  if (!json) return {};
  try {
    const value = JSON.parse(json) as Record<string, TableState>;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function parsePlan(json: string | null): RotationPlan | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as RotationPlan;
  } catch {
    return null;
  }
}

/** 지금 로테이션 상태 전체 */
export async function loadRotation(): Promise<RotationStateView> {
  const m = await meta();
  const dealers = await prisma.rotationDealer.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }] });
  return {
    version: m.version,
    tableCount: m.tableCount,
    tableLabels: tableLabelsOf({ tableCount: m.tableCount, tableLabels: m.tableLabels ? parseTableLabels(m.tableLabels).labels : null }),
    setupMinutes: m.setupMinutes,
    tableState: parseTableState(m.tableStateJson),
    interval: m.interval,
    planStart: m.planStart,
    planEnd: m.planEnd,
    plan: parsePlan(m.planJson),
    dealers: dealers.map((d) => ({
      id: d.id,
      name: d.name,
      startTime: d.startTime,
      status: toDealerStatus(d.status),
      checkedInAt: d.checkedInAt?.toISOString() ?? null,
      leftAt: d.leftAt?.toISOString() ?? null,
      sort: d.sort,
    })),
  };
}

export async function rotationVersion() {
  return (await meta()).version;
}

export class RotationError extends Error {}

/** 시간표가 형식에 맞는지(딜러 id는 문자열, 칸 수 상한) 확인 */
function validPlan(plan: RotationPlan, tableCount: number) {
  return (
    Array.isArray(plan.slots) &&
    plan.slots.length <= MAX_SLOTS &&
    plan.tables === tableCount &&
    plan.slots.every(
      (slot) =>
        Number.isFinite(slot.at) &&
        Array.isArray(slot.seats) &&
        slot.seats.length === tableCount &&
        slot.seats.every((id) => id === null || typeof id === "string") &&
        Array.isArray(slot.rest) &&
        slot.rest.every((id) => typeof id === "string"),
    )
  );
}

/** 상태를 바꿉니다. 다른 기기는 version이 바뀐 걸 보고 새로 받습니다. */
export async function applyRotation(action: RotationAction) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    switch (action.type) {
      case "addDealers": {
        const count = await tx.rotationDealer.count();
        const rows = action.dealers
          .map((d) => ({ name: String(d.name ?? "").trim().slice(0, 20), startTime: normalizeTime(d.startTime) }))
          .filter((d) => d.name);
        if (count + rows.length > MAX_DEALERS) throw new RotationError(`딜러는 최대 ${MAX_DEALERS}명까지 등록할 수 있습니다.`);
        const last = await tx.rotationDealer.aggregate({ _max: { sort: true } });
        let sort = (last._max.sort ?? 0) + 1;
        for (const row of rows) await tx.rotationDealer.create({ data: { ...row, status: "WAIT", sort: sort++ } });
        break;
      }
      case "updateDealer": {
        await tx.rotationDealer.update({
          where: { id: action.id },
          data: {
            ...(action.name !== undefined ? { name: String(action.name).trim().slice(0, 20) } : {}),
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
      case "checkIn": {
        await tx.rotationDealer.update({ where: { id: action.id }, data: { status: "IN", checkedInAt: now, leftAt: null, statusSince: now } });
        break;
      }
      case "setStatus": {
        const status: string = action.status;
        if (status !== "WAIT" && status !== "OFF" && status !== "LEFT") throw new RotationError("상태를 확인하세요.");
        await tx.rotationDealer.update({
          where: { id: action.id },
          data: {
            status,
            statusSince: now,
            ...(status === "LEFT" ? { leftAt: now } : { leftAt: null }),
            ...(status === "WAIT" ? { checkedInAt: null } : {}),
          },
        });
        break;
      }
      case "setSettings": {
        const data: { tableCount?: number; tableLabels?: string; interval?: number; planStart?: string; planEnd?: string; setupMinutes?: number } = {};
        if (action.tableLabels !== undefined) {
          const { labels, errors } = parseTableLabels(String(action.tableLabels));
          if (labels.length === 0 || errors.length) throw new RotationError(`테이블 번호를 확인하세요${errors.length ? `: ${errors.join(", ")}` : ""}`);
          data.tableCount = labels.length;
          data.tableLabels = labels.join(",");
        }
        if (action.setupMinutes !== undefined) data.setupMinutes = Math.max(0, Math.min(120, Math.floor(Number(action.setupMinutes) || 0)));
        if (action.interval !== undefined) data.interval = Math.max(5, Math.min(120, Math.floor(Number(action.interval) || 20)));
        if (action.planStart !== undefined) {
          const t = normalizeTime(action.planStart);
          if (!t) throw new RotationError("시작 시각을 확인하세요.");
          data.planStart = t;
        }
        if (action.planEnd !== undefined) {
          const t = normalizeTime(action.planEnd);
          if (!t) throw new RotationError("끝 시각을 확인하세요.");
          data.planEnd = t;
        }
        // 테이블 수가 바뀌면 짜 둔 시간표는 맞지 않으므로 비웁니다(다시 짜기).
        const current = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        const tablesChanged = data.tableCount !== undefined && data.tableCount !== current?.tableCount;
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { ...data, ...(tablesChanged ? { planJson: null } : {}) } });
        break;
      }
      case "savePlan": {
        const m = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        if (action.plan && !validPlan(action.plan, m?.tableCount ?? 20)) {
          throw new RotationError("시간표 형식이 맞지 않습니다. 다시 짜 주세요.");
        }
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { planJson: action.plan ? JSON.stringify(action.plan) : null } });
        break;
      }
      case "setTable": {
        // 버튼 자리(1~10)·컨바인 시각. 값을 안 주면 그대로, null이면 지움
        const m = await tx.rotationMeta.findUnique({ where: { id: META_ID } });
        const all = parseTableState(m?.tableStateJson ?? null);
        const key = String(Math.floor(Number(action.label)));
        const row: TableState = { ...(all[key] ?? {}) };
        if (action.button !== undefined) {
          const b = action.button == null ? null : Math.floor(Number(action.button));
          row.button = b != null && b >= 1 && b <= 10 ? b : null;
        }
        if (action.closedAt !== undefined) row.closedAt = action.closedAt == null || !Number.isFinite(Number(action.closedAt)) ? null : Math.floor(Number(action.closedAt));
        all[key] = row;
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { tableStateJson: JSON.stringify(all) } });
        break;
      }
      case "newDay": {
        // 새 근무일: 출근 기록을 지우고 모두 '출근 전'으로, 시간표도 비웁니다.
        await tx.rotationDealer.updateMany({ data: { status: "WAIT", tableNo: null, checkedInAt: null, leftAt: null, statusSince: now } });
        await tx.rotationMeta.update({ where: { id: META_ID }, data: { dayStartedAt: now, planJson: null, tableStateJson: null } });
        await tx.rotationEvent.deleteMany({});
        break;
      }
    }
    await tx.rotationMeta.update({ where: { id: META_ID }, data: { version: { increment: 1 } } });
  });
}
