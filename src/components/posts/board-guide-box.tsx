import Link from "@/components/ui/link";
import type { BoardType } from "@/generated/prisma/enums";
import { ACCEPT_POINTS } from "@/lib/accept-answer";

type Guide = { title: string; lines: string[]; links: { href: string; label: string }[] };

/** 게시판별 「처음 왔다면」 필독(접어 둠 · 목록을 가리지 않게) */
const GUIDES: Partial<Record<BoardType, Guide>> = {
  FREE: {
    title: "자유게시판 쓰는 법",
    lines: [
      "잡담 · 근무 이야기 · 질문 모두 환영해요. 룰 질문은 「질문」, 현장 사진은 「현장 스케치」 말머리를 쓰면 찾기 쉬워요.",
      "🃏 「오늘의 한 판」 태그: 억울한 판 · 자랑하고 싶은 판을 금액 대신 칩 · bb로 올려 주세요.",
      "안 되는 것: 욕설 · 저격 · 개인 정보, 돈을 거는 게임 모집, 광고(홍보 게시판으로), 구인 글(구인구직으로).",
    ],
    links: [
      { href: "/study/glossary", label: "용어 사전" },
      { href: "/boards/hand-review", label: "핸드리뷰 게시판" },
    ],
  },
  HAND_REVIEW: {
    title: "핸드리뷰 질문 · 답변하는 법",
    lines: [
      "핸드를 그림으로 그리고 「📝 질문 틀 넣기」로 궁금한 곳 · 내 선택과 이유 · 상대 정보를 적어 주세요.",
      "답할 땐 결과보다 결정을 봐 주세요. 이유와 숫자(팟 오즈 · 레인지)를 같이 쓰면 더 좋아요.",
      `도움이 된 댓글은 글쓴이가 「채택」해 주세요. 답변자에게 +${ACCEPT_POINTS}P와 요괴 밥 1번이 가요.`,
    ],
    links: [
      { href: "/info/guide/reading-hand-reviews", label: "핸드리뷰 읽는 법" },
      { href: "/info/holdem/hand-history-review", label: "핸드 복기법" },
    ],
  },
  RULE_QA: {
    title: "룰 질문 · 답변하는 법",
    lines: [
      "상황(몇 명 · 누가 어떤 액션 · 칩 크기)을 적어 주세요. 「📝 질문 틀 넣기」를 누르면 빈칸이 생겨요.",
      "답할 땐 TDA 룰 번호나 근거를 같이 써 주세요. 매장마다 하우스 룰이 있으면 그 룰이 우선이에요.",
      `도움이 된 답은 글쓴이가 「채택」해 주세요. 답변자에게 +${ACCEPT_POINTS}P가 가요.`,
    ],
    links: [
      { href: "/study/floor-cases", label: "현장 판정 사례" },
      { href: "/info/guide/tda-core-rules", label: "TDA 핵심 룰 10가지" },
      { href: "/study/glossary", label: "용어 사전" },
    ],
  },
};

export function BoardGuideBox({ boardType }: { boardType: BoardType }) {
  const guide = GUIDES[boardType];
  if (!guide) return null;
  return (
    <details data-board-guide className="group rounded-xl border border-[#c9a25c]/40 bg-[#c9a25c]/10 px-3 py-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-black text-[#f3d9a4] [&::-webkit-details-marker]:hidden">
        📌 처음 왔다면 · {guide.title}
        <span className="ml-auto text-xs transition-transform group-open:rotate-180">▾</span>
      </summary>
      <ul className="grid gap-1.5 pb-2 text-sm leading-6 text-[#E5E7EB]">
        {guide.lines.map((line) => (
          <li key={line}>• {line}</li>
        ))}
      </ul>
      <p className="flex flex-wrap gap-2 pb-2">
        {guide.links.map((link) => (
          <Link key={link.href} href={link.href} className="inline-flex min-h-9 items-center rounded-full border border-[#c9a25c]/50 px-3 text-xs font-bold text-[#e7c98a]">
            {link.label} →
          </Link>
        ))}
      </p>
    </details>
  );
}
