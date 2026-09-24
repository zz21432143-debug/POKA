import { cn } from "cn";

export function PokaLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "poka-sign inline-flex items-center gap-2 rounded-[1.15rem] bg-white py-1 pr-3 pl-1.5 ring-1 ring-emerald-200/90",
        compact ? "gap-1.5 py-0.5 pr-2.5" : "sm:pr-3.5",
        className,
      )}
    >
      <PokaChip compact={compact} />
      <span className="flex min-w-0 flex-col justify-center leading-none" aria-hidden>
        <span
          className={cn(
            "flex items-center font-black tracking-[-0.08em] text-[#102033]",
            compact ? "text-[1.35rem]" : "text-[1.65rem] sm:text-[1.85rem]",
          )}
        >
          <span>P</span>
          <span
            className={cn(
              "mx-[0.06em] inline-flex shrink-0 items-center justify-center rounded-full border-primary",
              compact
                ? "h-[0.72em] w-[0.72em] border-[3px]"
                : "h-[0.74em] w-[0.74em] border-[3.5px] sm:border-4",
            )}
          >
            <span className="block h-[38%] w-[38%] rounded-full bg-emerald-700/80" />
          </span>
          <span>KA</span>
        </span>
        {compact ? null : (
          <span className="mt-0.5 hidden text-[10px] font-bold tracking-[0.18em] text-emerald-600 sm:block">
            HOLDEM
          </span>
        )}
      </span>
      <span className="sr-only">POKA</span>
    </span>
  );
}

function PokaChip({ compact }: { compact: boolean }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={compact ? 30 : 36}
      height={compact ? 30 : 36}
      className={cn("shrink-0", compact ? "size-[30px]" : "size-9")}
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
