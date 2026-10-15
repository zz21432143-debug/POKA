import type { ReactNode } from "react";
import { Press_Start_2P } from "next/font/google";

/** 게임방 전용: 아케이드 픽셀 글씨(영문 · 숫자 — READY · VS · WIN …) */
const arcade = Press_Start_2P({
  variable: "--font-arcade",
  subsets: ["latin"],
  weight: "400",
});

export default function GamesLayout({ children }: { children: ReactNode }) {
  return <div className={`${arcade.variable} arcade-root`}>{children}</div>;
}
