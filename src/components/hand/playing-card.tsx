import { cn } from "cn";
import { parseCard, suitGlyph } from "@/lib/hand-review";

export function PlayingCard({
  code,
  selected = false,
  dimmed = false,
  onClick,
  size = "md",
  variant = "dark",
}: {
  code: string;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "felt";
}) {
  const parsed = parseCard(code);
  const sizes = {
    sm: "h-11 min-h-11 w-8 shrink-0 text-[11px]",
    md: "h-12 min-h-11 w-9 shrink-0 text-sm sm:h-14 sm:w-10",
    lg: "h-12 min-h-11 w-9 shrink-0 text-sm sm:h-20 sm:w-14 sm:text-base",
  };
  const feltSizes = {
    sm: "h-9 w-[1.6rem] text-[11px]",
    md: "h-11 w-8 text-sm",
    lg: "h-14 w-10 text-base sm:h-16 sm:w-11",
  };

  const inner = parsed ? (
    <>
      <span className="font-bold leading-none">{parsed.rank}</span>
      <span className="leading-none">{suitGlyph(parsed.suit)}</span>
    </>
  ) : (
    <span>?</span>
  );

  const felt = variant === "felt";
  const color = parsed?.red ? (felt ? "text-red-600" : "text-red-500") : felt ? "text-zinc-900" : "text-zinc-100";
  const className = cn(
    "inline-flex flex-col items-center justify-center rounded-md border font-semibold shadow-sm",
    felt ? feltSizes[size] : sizes[size],
    color,
    felt ? "border-zinc-300 bg-white" : selected ? "border-primary bg-[#1b1f1c] ring-2 ring-primary" : "border-border bg-[#1b1f1c]",
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

export function FaceDownCard({ size = "sm" }: { size?: "sm" | "md" }) {
  const box = size === "md" ? "h-11 w-8" : "h-9 w-[1.6rem]";
  return (
    <div
      className={cn(
        box,
        "shrink-0 rounded-md border border-indigo-300/40 bg-[repeating-linear-gradient(135deg,#1e3a8a,#1e3a8a_6px,#1d4ed8_6px,#1d4ed8_12px)] shadow-sm",
      )}
      aria-label="뒷면"
    />
  );
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
