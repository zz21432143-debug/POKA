import type { MetadataRoute } from "next";
import {
  PWA_BACKGROUND_COLOR,
  PWA_DISPLAY,
  PWA_ICON_192,
  PWA_ICON_512,
  PWA_ICON_MASKABLE_192,
  PWA_ICON_MASKABLE_512,
  PWA_NAME,
  PWA_SHORT_NAME,
  PWA_START_URL,
  PWA_THEME_COLOR,
} from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PWA_NAME,
    short_name: PWA_SHORT_NAME,
    description: "홀덤 플레이어와 딜러를 위한 커뮤니티",
    start_url: PWA_START_URL,
    display: PWA_DISPLAY,
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    lang: "ko",
    orientation: "portrait-primary",
    icons: [
      {
        src: PWA_ICON_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_MASKABLE_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: PWA_ICON_MASKABLE_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // 앱 아이콘을 길게 누르면 바로 열기(안드로이드 · 일부 브라우저)
    shortcuts: [
      { name: "샷클락", short_name: "샷클락", url: "/tools/shot-clock", icons: [{ src: PWA_ICON_192, sizes: "192x192", type: "image/png" }] },
      { name: "딜러 로테이션", short_name: "로테이션", url: "/tools/rotation", icons: [{ src: PWA_ICON_192, sizes: "192x192", type: "image/png" }] },
      { name: "딜러 구인", short_name: "구인", url: "/boards/jobs", icons: [{ src: PWA_ICON_192, sizes: "192x192", type: "image/png" }] },
    ],
  };
}
