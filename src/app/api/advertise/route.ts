import { NextResponse } from "next/server";
import { clientIp } from "@/lib/request";
import { CoolDownError, REPORT_COOLDOWN_MS, writeAudit } from "@/lib/security";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
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
    const key = `ad:ip:${ip}`;
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
      detail: JSON.stringify({ company, contact, product, message: message.slice(0, 500) }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: "문의가 접수되지 않았습니다." }, { status: 500 });
  }
}
