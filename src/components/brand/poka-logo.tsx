import { cn } from "cn";

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
      <span className={cn("inline-flex items-center whitespace-nowrap", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme/poka-lockup.png"
          alt=""
          width={107}
          height={34}
          className={cn("h-8 w-auto max-w-full shrink-0", compact ? "h-7" : "sm:h-9")}
        />
        <span className="sr-only">POKA</span>
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
