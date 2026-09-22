import { cn } from "cn";
import { parseCard, suitGlyph } from "@/lib/hand-review";

export function PlayingCard({
  code,
  selected = false,
  dimmed = false,
  onClick,
  size = "md",
}: {
  code: string;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  const parsed = parseCard(code);
  const sizes = {
    sm: "h-11 min-h-11 w-8 shrink-0 text-[11px]",
    md: "h-12 min-h-11 w-9 shrink-0 text-sm sm:h-14 sm:w-10",
    lg: "h-12 min-h-11 w-9 shrink-0 text-sm sm:h-20 sm:w-14 sm:text-base",
  };

  const inner = parsed ? (
    <>
      <span className="font-bold leading-none">{parsed.rank}</span>
      <span className="leading-none">{suitGlyph(parsed.suit)}</span>
    </>
  ) : (
    <span>?</span>
  );

  const color = parsed?.red ? "text-red-500" : "text-zinc-100";
  const className = cn(
    "inline-flex flex-col items-center justify-center rounded-md border bg-[#1b1f1c] font-semibold shadow-sm",
    sizes[size],
    color,
    selected ? "border-primary ring-2 ring-primary" : "border-border",
    dimmed && "opacity-40",
    onClick && "touch-target cursor-pointer",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-pressed={selected}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function CardSlot({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-target inline-flex h-12 w-9 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 text-[10px] text-muted-foreground sm:h-14 sm:w-10"
    >
      {label}
    </button>
  );
}
