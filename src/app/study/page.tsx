import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { BarChart3Icon, BookOpenIcon, Grid3x3Icon, ListOrderedIcon, PercentIcon, PieChartIcon, GraduationCapIcon, TargetIcon } from "lucide-react";
import { BOARD_STICKER, BoardTitle, OniSticker } from "@/components/brand/oni";
import { ToolCard } from "@/components/tools/tool-card";
import { StudyAd } from "@/components/ads/board-bottom-ad";

const TITLE = "홀덤 공부 — GTO 푸시폴드 · 승률 계산기 · ICM · 핸드 레인지 · 족보 (무료)";
const DESCRIPTION =
  "직접 계산하고 검증한 무료 홀덤 공부 도구 모음. 포지션별 GTO 푸시폴드 차트, 승률 계산기, ICM 딜 계산기, 핸드 레인지 순위, 족보 순위, 팟 계산까지 로그인 없이.";

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
  { href: "/tools/practice", icon: TargetIcon, title: "팟 계산", body: "사이드팟 계산기와 팟 계산 연습 · 난이도별 랭킹(회원)." },
  { href: "/info/holdem", icon: BookOpenIcon, title: "홀덤 가이드", body: "포지션 · 레인지 · 팟 오즈 · 3벳 · 블러프 · 밸류벳 · SPR · 토너먼트 스택. 플레이어용 전략 24편을 예시 핸드와 숫자로.", tag: "NEW" },
  { href: "/info/guide", icon: GraduationCapIcon, title: "딜러 가이드", body: "자리 · 블라인드 · 액션 순서 · 쇼다운 · 사이드팟 · 급여 · 복장 등 딜러 실무 74편." },
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
            <ToolCard href={card.href} icon={card.icon} title={card.title} body={card.body} tag={"tag" in card ? card.tag : undefined} />
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
      {/* 구글 광고(하단): 검색으로 많이 들어오는 공부 도구 · 랭킹 */}
      <StudyAd />
    </div>
  );
}
