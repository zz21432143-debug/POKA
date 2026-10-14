import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3Icon, Grid3x3Icon, ListOrderedIcon, PercentIcon, PieChartIcon, GraduationCapIcon, TargetIcon } from "lucide-react";
import { BOARD_STICKER, BoardTitle, OniSticker } from "@/components/brand/oni";

const TITLE = "홀덤 공부 — GTO 푸시폴드 · 승률 계산기 · ICM · 핸드 레인지 · 족보 (무료)";
const DESCRIPTION =
  "직접 계산하고 검증한 무료 홀덤 공부 도구 모음. 포지션별 GTO 푸시폴드 차트, 승률 계산기, ICM 딜 계산기, 핸드 레인지 순위, 족보 순위, 딜러 연습장까지 로그인 없이.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/study" },
};

const CARDS = [
  { href: "/info/push-fold", icon: Grid3x3Icon, title: "GTO 푸시폴드 차트", body: "6인 · 9인 포지션별 올인 / 콜 범위, 헤즈업, 버블 · 파이널(ICM)까지.", tag: "인기" },
  { href: "/community/equity", icon: PercentIcon, title: "승률 계산기", body: "내 패 vs 상대 패(또는 상위 X% 범위) 프리플랍~리버 승률, 맞춰 보기, 팟 오즈 콜 판단.", tag: "인기" },
  { href: "/info/icm", icon: PieChartIcon, title: "ICM 계산기", body: "총상금 · 비율로 파이널 딜 금액을 공정하게. 이미 지급된 순위는 자동으로 빼요." },
  { href: "/community/hand-ranges", icon: BarChart3Icon, title: "핸드 레인지 순위", body: "169개 시작 패 강한 순서. 상대 수별 순위, 상위 10 · 15 · 20% 범위." },
  { href: "/community/hand-rankings", icon: ListOrderedIcon, title: "족보 순위", body: "카드 그림으로 보는 족보 10가지, 헷갈리는 상황, 실제 확률." },
  { href: "/tools/practice", icon: TargetIcon, title: "딜러 연습장", body: "사이드팟 계산기와 팟 계산 연습 · 난이도별 랭킹(회원)." },
  { href: "/info/guide", icon: GraduationCapIcon, title: "딜러 가이드", body: "자리 · 블라인드 · 액션 순서 · 쇼다운 · 시급 · 복장 등 18편." },
] as const;

export default function StudyHubPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.study}>홀덤 공부</BoardTitle>
        <p className="mt-2">전부 무료, 로그인 없이 써요. 숫자는 POKA가 직접 계산하고 검증했어요.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="ink-panel touch-target flex min-h-28 flex-col rounded-2xl p-5 hover:bg-[#241c1e]">
              <span className="flex items-center gap-2">
                <card.icon className="size-5 text-[#C59B27]" />
                {"tag" in card ? <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">{card.tag}</span> : null}
              </span>
              <p className="mt-3 font-bold text-white">{card.title}</p>
              <p className="mt-1 text-sm text-[#D1D5DB]">{card.body}</p>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-[#d1c7b5]">
        <OniSticker name="idea" className="h-12" />
        <p>
          원하는 계산기가 있으면{" "}
          <Link href="/boards/suggestions" className="font-bold text-[#f3d9a4] underline underline-offset-4">
            건의사항
          </Link>
          에 남겨 주세요.
        </p>
      </div>
    </div>
  );
}
