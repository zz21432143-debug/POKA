import { cn } from "cn";

export function PokaLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/poka-mark.svg"
        alt=""
        width={compact ? 32 : 40}
        height={compact ? 32 : 40}
        className={cn("shrink-0", compact ? "size-8" : "size-9 sm:size-10")}
      />
      <span
        className={cn(
          "font-black tracking-[-0.04em] text-[#16a34a]",
          compact ? "text-[1.45rem]" : "text-[1.7rem] sm:text-[1.9rem]",
        )}
      >
        POKA
      </span>
    </span>
  );
}
