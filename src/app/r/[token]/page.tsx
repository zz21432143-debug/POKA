import type { Metadata } from "next";
import { loadShared } from "@/lib/rotation-server";
import { RotationViewer } from "@/components/tools/rotation-viewer";

export const metadata: Metadata = { title: "교대표", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** 보기 전용 교대표(로그인 없이 링크로). 주인이 공유를 끄면 열리지 않습니다. */
export default async function SharedRotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tv?: string; sec?: string }>;
}) {
  const { token } = await params;
  const { tv, sec } = await searchParams;
  // TV 쪽 넘김 간격(초): 공유 탭에서 고른 값 · 없으면 10초
  const pageSeconds = [5, 10, 20, 30].includes(Number(sec)) ? Number(sec) : 10;
  const initial = await loadShared(token).catch(() => null);
  if (!initial) {
    return (
      <section className="ink-panel mx-auto grid max-w-lg gap-2 rounded-2xl px-5 py-10 text-center">
        <h1 className="text-xl font-black text-white">교대표를 볼 수 없습니다</h1>
        <p className="text-sm text-[#D1D5DB]">공유가 꺼졌거나 잘못된 링크입니다. 담당자에게 새 링크를 받아 주세요.</p>
      </section>
    );
  }
  return <RotationViewer token={token} initial={initial} tv={tv === "1"} pageSeconds={pageSeconds} />;
}
