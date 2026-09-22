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
    sm: "h-11 w-8 text-[11px]",
    md: "h-14 w-10 text-sm",
    lg: "h-20 w-14 text-base",
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
      className="touch-target inline-flex h-14 w-10 flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/50 text-[10px] text-muted-foreground"
    >
      {label}
    </button>
  );
}
