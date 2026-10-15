import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { INVITE_CODE_RE, INVITEE_POINTS, inviterByCode } from "@/lib/invite";

export const alt = "POKA 친구 초대";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 초대 링크 카톡 미리보기: 마스코트 · 「○○님이 초대했어요」 · 가입 선물 */
export default async function InviteOgImage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const inviter = INVITE_CODE_RE.test(code.toLowerCase())
    ? await inviterByCode(code).catch(() => null)
    : null;
  const mascot = await readFile(
    join(process.cwd(), "public/icons/poka-512.png"),
  );
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;
  const name = (inviter?.nickname ?? "친구").slice(0, 12);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "64px",
        gap: "56px",
        background:
          "linear-gradient(160deg, #120b0b 0%, #2a0f10 55%, #4a1416 100%)",
        color: "#f6efe6",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mascotSrc}
        width={320}
        height={320}
        alt=""
        style={{ borderRadius: 72 }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30, color: "#e7c98a" }}>
          🤝 친구 초대 · POKA
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#f5d76e",
          }}
        >
          {`${name}님이`}
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.15 }}>
          POKA에 초대했어요
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            padding: "14px 26px",
            borderRadius: 24,
            background: "#FEE500",
            color: "#111",
            fontSize: 36,
            fontWeight: 800,
          }}
        >
          {`🎁 가입하고 첫 출석하면 ${INVITEE_POINTS}P`}
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: "#c9a98a" }}>
          홀덤 딜러 · 홀덤인 커뮤니티 · pokerwiki.co.kr
        </div>
      </div>
    </div>,
    size,
  );
}
