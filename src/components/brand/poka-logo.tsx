import { cn } from "cn";

export function PokaLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span
        className={cn(
          "flex items-center font-[family-name:var(--font-logo)] font-semibold uppercase text-[#16324f]",
          compact
            ? "gap-2 text-[1.35rem] tracking-[0.18em]"
            : "gap-2.5 text-[1.7rem] tracking-[0.22em] sm:gap-3 sm:text-[1.95rem] sm:tracking-[0.28em]",
        )}
        aria-hidden
      >
        <span>P</span>
        <SunMark compact={compact} />
        <span>K</span>
        <span>A</span>
      </span>
      <span className="sr-only">POKA</span>
    </span>
  );
}

function SunMark({ compact }: { compact: boolean }) {
  const size = compact ? 22 : 28;
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0 translate-y-[-0.06em]", compact ? "size-[1.05em]" : "size-[1.1em]")}
      aria-hidden
    >
      <g fill="#F4B429">
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x="14.35"
            y="0.6"
            width="3.3"
            height="7.2"
            rx="1.65"
            transform={`rotate(${i * 45} 16 16)`}
          />
        ))}
      </g>
      <circle cx="16" cy="16" r="8.1" fill="#F6C445" />
      <circle cx="16" cy="16" r="5.4" fill="#FFE9A8" />
    </svg>
  );
}
