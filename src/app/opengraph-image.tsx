import { ImageResponse } from "next/og";
import { SITE_TITLE } from "@/lib/seo";

export const alt = SITE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "72px",
          background: "linear-gradient(160deg, #07150f 0%, #0d2a1c 55%, #123d28 100%)",
          color: "#f4f7f2",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#8fbfa3" }}>POKERWIKI.CO.KR</div>
        <div style={{ marginTop: 18, fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>POKA</div>
        <div style={{ marginTop: 16, fontSize: 40, color: "#d7eadf" }}>홀덤·딜러 커뮤니티</div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#9ec9b4" }}>포커를 더 즐겁게 / 함께하는 공간</div>
      </div>
    ),
    size,
  );
}
