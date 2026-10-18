import type { Metadata } from "next";
import { SidebarHub } from "@/components/layout/sidebar-hub";

// 메뉴 모음 화면이라 검색에서는 뺌(각 메뉴 화면이 검색 대상)
export const metadata: Metadata = { title: "포인트 · 놀이", robots: { index: false, follow: true } };

export default function PlayHubPage() {
  return <SidebarHub title="포인트 · 놀이" intro="출석 · 퀴즈로 포인트를 모으고, 요괴를 키우고, 친구와 한 판. 레벨 · 랭킹 · 마크 상점도 여기에 있어요." sticker="community" />;
}
