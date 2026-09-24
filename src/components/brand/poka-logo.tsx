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
        <PokaWordmark compact={compact} />
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

function PokaWordmark({ compact }: { compact: boolean }) {
  const height = compact ? 22 : 28;
  return (
    <svg
      height={height}
      viewBox="0 0 118 28"
      className={cn("w-auto", compact ? "h-[1.35rem]" : "h-7 sm:h-8")}
      aria-hidden
    >
      <title>POKA</title>
      <path
        fill="#1a2433"
        d="M1.2 2.2h12.4c6.35 0 10.55 3.55 10.55 9.05 0 5.5-4.2 9.05-10.55 9.05H7.7V25.8H1.2V2.2Zm6.5 12.7h5.35c2.85 0 4.5-1.5 4.5-3.85 0-2.35-1.65-3.85-4.5-3.85H7.7v7.7Z"
      />
      <circle cx="40.6" cy="14" r="11.2" fill="none" stroke="#22C55E" strokeWidth="3.4" />
      <circle cx="40.6" cy="14" r="5.4" fill="none" stroke="#16A34A" strokeWidth="2.2" />
      <path
        fill="#1a2433"
        d="M56.2 2.2h6.9l5.55 14.15L74.1 2.2h6.7L69.7 25.8h-7.05L56.2 2.2Z"
      />
      <path
        fill="#1a2433"
        d="M84.1 2.2h6.5l8.85 14.4V2.2h6.35V25.8h-6.5l-8.85-14.4v14.4H84.1V2.2Z"
      />
    </svg>
  );
}
