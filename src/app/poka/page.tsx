import type { Metadata } from "next";
import { SidebarHub } from "@/components/layout/sidebar-hub";

// 메뉴 모음 화면이라 검색에서는 뺌(각 메뉴 화면이 검색 대상)
export const metadata: Metadata = { title: "POKA 안내", robots: { index: false, follow: true } };

export default function PokaHubPage() {
  return <SidebarHub title="POKA" intro="공지 · 공식 홍보 · 건의 · 제휴 문의. POKA 운영 소식과 문의는 여기에서." sticker="community" />;
}
