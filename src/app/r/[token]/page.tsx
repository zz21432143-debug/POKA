import type { Metadata } from "next";
import { lookupShared } from "@/lib/rotation-server";
import { formatWorkDate } from "@/lib/rotation";
import { RotationViewer } from "@/components/tools/rotation-viewer";

export const metadata: Metadata = { title: "교대표", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** 보기 전용 교대표(로그인 없이 링크로). 주인이 공유를 끄면 열리지 않습니다. */
export default async function SharedRotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tv?: string; sec?: string; theme?: string }>;
}) {
  const { token } = await params;
  const { tv, sec, theme } = await searchParams;
  // TV 쪽 넘김 간격(초): 공유 탭에서 고른 값 · 없으면 10초
  const pageSeconds = [5, 10, 20, 30].includes(Number(sec)) ? Number(sec) : 10;
  const found = await lookupShared(token).catch((error: unknown) => {
    console.error("rotation share lookup failed", error);
    return { reason: "error" as const };
  });
  if (!("view" in found)) {
    // 못 여는 까닭을 그대로 알려 줌(담당자가 바로 고칠 수 있게)
    const why =
      found.reason === "expired"
        ? `'${found.gameName}' 교대표는 근무일 ${formatWorkDate(found.workDate)} 다음 날이 지나 자동으로 닫혔어요. 담당자가 로테이션 화면에서 게임 날짜를 오늘로 바꾸면 이 링크가 다시 열려요.`
        : found.reason === "error"
          ? "잠깐 서버에 문제가 있었어요. 잠시 뒤 새로고침해 주세요."
          : "공유가 꺼졌거나, 공유를 다시 켜면서 링크가 바뀌었어요. 담당자에게 새 링크를 받아 주세요.";
    return (
      <section data-share-closed={found.reason} className="ink-panel mx-auto grid max-w-lg gap-2 rounded-2xl px-5 py-10 text-center">
        <h1 className="text-xl font-black text-white">교대표를 볼 수 없습니다</h1>
        <p className="text-sm leading-6 text-[#D1D5DB]">{why}</p>
      </section>
    );
  }
  return <RotationViewer token={token} initial={found.view} tv={tv === "1"} pageSeconds={pageSeconds} theme={theme === "light" ? "light" : "dark"} />;
}
