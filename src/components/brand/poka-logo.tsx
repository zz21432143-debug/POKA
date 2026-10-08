import { cn } from "cn";

function CatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#ef2d3a" d="M9 22 15.5 7.5 22 19.5c.6-.4 1.4-.7 2-.7s1.4.3 2 .7L32.5 7.5 39 22c2.2 1.2 4 3.6 4 6.6C43 36.2 34.6 43 24 43S5 36.2 5 28.6C5 25.6 6.8 23.2 9 22Z" />
      <ellipse cx="24" cy="29" rx="9" ry="8" fill="#fff7ef" />
      <circle cx="20.2" cy="27.2" r="1.7" fill="#1a1210" />
      <circle cx="27.8" cy="27.2" r="1.7" fill="#1a1210" />
      <path d="M21.2 32.2c.8 1.1 1.7 1.6 2.8 1.6s2-.5 2.8-1.6" fill="none" stroke="#1a1210" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PokaLogo({
  className,
  compact = false,
  onDark = false,
}: {
  className?: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  if (onDark) {
    return (
      <span className={cn("inline-flex items-center gap-2 whitespace-nowrap bg-transparent", className)}>
        <CatMark className={cn("shrink-0", compact ? "size-8" : "size-10")} />
        <span className={cn("font-black leading-none tracking-tight text-white", compact ? "text-xl" : "text-[1.65rem]")}>
          POKA
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center",
        "rounded-xl bg-[#07150f] px-2 py-1",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/poka-wordmark.png"
        alt=""
        width={204}
        height={53}
        className={cn("h-8 w-auto max-w-full shrink-0 sm:h-9", compact ? "h-7" : null)}
      />
      <span className="sr-only">POKA</span>
    </span>
  );
}
