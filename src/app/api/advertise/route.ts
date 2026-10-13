import { NextResponse } from "next/server";
import { clientIp } from "@/lib/request";
import { CoolDownError, REPORT_COOLDOWN_MS, assertAttemptLimit, writeAudit } from "@/lib/security";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { notifyAdmins } from "@/lib/push";

/** 제휴·광고(무료 홍보 이벤트 포함) 문의. 로그인한 회원만 보낼 수 있습니다. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인 후 문의를 보낼 수 있습니다." }, { status: 401 });
    }
    const body = (await request.json()) as {
      company?: string;
      contact?: string;
      product?: string;
      message?: string;
    };
    const company = body.company?.trim() ?? "";
    const contact = body.contact?.trim() ?? "";
    const product = body.product?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    if (company.length < 2 || contact.length < 5 || message.length < 8) {
      return NextResponse.json({ error: "업체명, 연락처, 내용을 확인해 주세요." }, { status: 400 });
    }

    const ip = clientIp(request);
    // 같은 IP에서 하루 5건까지(도배 막기)
    await assertAttemptLimit({ kind: "AD_INQUIRY", ip, max: 5, windowMs: 24 * 60 * 60 * 1000, message: "오늘 문의를 너무 많이 보냈습니다. 내일 다시 보내 주세요." });
    const key = `ad:user:${user.id}`;
    const last = await prisma.writeThrottle.findUnique({ where: { key } });
    if (last && Date.now() - last.lastAt.getTime() < REPORT_COOLDOWN_MS) {
      return NextResponse.json({ error: "잠시 후 다시 보내 주세요." }, { status: 429 });
    }
    await prisma.writeThrottle.upsert({
      where: { key },
      create: { key, lastAt: new Date() },
      update: { lastAt: new Date() },
    });

    await writeAudit({
      kind: "AD_INQUIRY",
      ip,
      detail: JSON.stringify({ nickname: user.nickname, company, contact, product, message: message.slice(0, 500) }),
    });

    // 관리자 휴대폰·PC로 알림(알림을 켜 둔 기기만). 실패해도 문의 접수는 성공으로 둡니다.
    await notifyAdmins({
      title: "POKA 새 광고 문의",
      body: `${user.nickname} · ${company}${product ? ` · ${product}` : ""}`.slice(0, 120),
      url: "/admin/inquiries",
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: "문의가 접수되지 않았습니다." }, { status: 500 });
  }
}
