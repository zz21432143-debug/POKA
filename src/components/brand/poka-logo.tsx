import { cn } from "cn";

export function PokaLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const size = compact ? 32 : 40;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PokaChip size={size} />
      <span className="flex flex-col justify-center leading-none">
        <span
          className={cn(
            "font-black tracking-[-0.06em] text-[#1a2433]",
            compact ? "text-[1.35rem]" : "text-[1.7rem] sm:text-[1.9rem]",
          )}
        >
          P
          <span className="text-primary">O</span>
          KA
        </span>
        {compact ? null : (
          <span className="mt-1 hidden text-[11px] font-semibold tracking-[0.02em] text-primary sm:block">
            홀덤 커뮤니티
          </span>
        )}
      </span>
    </span>
  );
}

function PokaChip({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="20" cy="20" r="20" fill="#22C55E" />
      <circle
        cx="20"
        cy="20"
        r="16.2"
        fill="none"
        stroke="#ECFDF3"
        strokeWidth="1.4"
        strokeDasharray="3.1 2.15"
      />
      <circle cx="20" cy="20" r="12.4" fill="#16A34A" />
      <path
        fill="#fff"
        d="M16.1 12.2h6.05c3.12 0 5.15 1.72 5.15 4.42 0 2.68-2.03 4.4-5.15 4.4H19.3v6.78h-3.2V12.2Zm3.2 6.22h2.55c1.42 0 2.22-.74 2.22-1.8 0-1.08-.8-1.82-2.22-1.82H19.3v3.62Z"
      />
    </svg>
  );
}
