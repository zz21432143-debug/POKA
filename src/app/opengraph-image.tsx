import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/seo";

export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 카톡·SNS 링크 미리보기 그림. 마스코트(앱 아이콘)와 POKA 이름을 함께 보여 줍니다. */
export default async function OpenGraphImage() {
  const mascot = await readFile(join(process.cwd(), "public/icons/poka-512.png"));
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "72px",
          gap: "64px",
          background: "linear-gradient(160deg, #120b0b 0%, #2a0f10 55%, #4a1416 100%)",
          color: "#f6efe6",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascotSrc} width={360} height={360} alt="" style={{ borderRadius: 80 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, letterSpacing: 6, color: "#e7c98a" }}>POKERWIKI.CO.KR</div>
          <div style={{ marginTop: 18, fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>POKA</div>
          <div style={{ marginTop: 16, fontSize: 42, color: "#f3dcc4" }}>홀덤·딜러 커뮤니티</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#c9a98a" }}>딜러 구인부터 매장 운영까지, POKA 하나로</div>
        </div>
      </div>
    ),
    size,
  );
}
