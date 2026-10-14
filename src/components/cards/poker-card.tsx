import { cn } from "cn";

const SUITS: Record<string, { glyph: string; red: boolean; name: string }> = {
  s: { glyph: "♠", red: false, name: "스페이드" },
  h: { glyph: "♥", red: true, name: "하트" },
  d: { glyph: "♦", red: true, name: "다이아" },
  c: { glyph: "♣", red: false, name: "클럽" },
};

/** 흰 카드 한 장("As", "Th"). highlight면 금색 테두리(족보를 만드는 카드), dim이면 흐리게 */
export function PokerCard({ code, highlight = false, dim = false, size = "md" }: { code: string; highlight?: boolean; dim?: boolean; size?: "sm" | "md" }) {
  const suit = SUITS[code[1]];
  const rank = code[0] === "T" ? "10" : code[0];
  return (
    <span
      role="img"
      aria-label={`${suit?.name ?? ""} ${rank}`}
      className={cn(
        "inline-flex shrink-0 flex-col items-center justify-center rounded-md border-2 bg-white font-black leading-none shadow-sm",
        size === "sm" ? "h-12 w-9 text-sm" : "h-16 w-12 text-lg sm:h-[4.5rem] sm:w-[3.25rem]",
        suit?.red ? "text-red-600" : "text-zinc-900",
        highlight ? "border-[#c9a25c] ring-2 ring-[#c9a25c]/60" : "border-zinc-300",
        dim && "opacity-40",
      )}
    >
      <span>{rank}</span>
      <span>{suit?.glyph}</span>
    </span>
  );
}

/** 카드 여러 장. hl = 강조할 카드 번호(0부터) */
export function CardRow({ cards, hl, size }: { cards: string[]; hl?: number[]; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {cards.map((code, i) => (
        <PokerCard key={`${code}-${i}`} code={code} size={size} highlight={hl ? hl.includes(i) : false} dim={hl ? !hl.includes(i) : false} />
      ))}
    </span>
  );
}
