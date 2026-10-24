import { Fragment } from "react";

/**
 * 글 속 카드 표기 [As Kd] · [9h 8h 2s]를 카드 칩으로(무늬 기호 · 하트 다이아는 빨강).
 * 가이드 본문 · 참고 표에서 씀. 표기가 아니면 글자 그대로.
 */
const CARD_GROUP = /\[((?:[2-9TJQKA][shdc])(?:\s+[2-9TJQKA][shdc])*)\]/g;
const SUIT: Record<string, { glyph: string; red: boolean }> = {
  s: { glyph: "♠", red: false },
  h: { glyph: "♥", red: true },
  d: { glyph: "♦", red: true },
  c: { glyph: "♣", red: false },
};

export function CardChips({ codes }: { codes: string[] }) {
  return (
    <span className="mx-0.5 inline-flex translate-y-[-1px] gap-0.5 align-middle">
      {codes.map((code, i) => {
        const suit = SUIT[code[1]];
        return (
          <span
            key={`${code}-${i}`}
            data-card={code}
            className={`inline-flex min-w-[1.9em] items-center justify-center rounded-[5px] border border-black/20 bg-[#f6f1e7] px-1 text-[0.9em] leading-[1.5] font-black ${suit.red ? "text-[#c81e1e]" : "text-[#111]"}`}
          >
            {code[0] === "T" ? "10" : code[0]}
            {suit.glyph}
          </span>
        );
      })}
    </span>
  );
}

export function CardText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CARD_GROUP)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(<CardChips key={at} codes={m[1].split(/\s+/)} />);
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}
