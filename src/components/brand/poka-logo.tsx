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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/poka-lockup.svg"
        alt=""
        width={compact ? 132 : 168}
        height={compact ? 124 : 156}
        className={cn(
          "w-auto shrink-0",
          compact ? "h-11" : "h-[3.35rem] sm:h-[3.7rem]",
        )}
      />
      <span className="sr-only">POKA</span>
    </span>
  );
}
