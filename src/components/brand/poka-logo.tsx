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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        !onDark && "rounded-xl bg-[#07150f] px-2 py-1",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/poka-cloud.svg"
        alt=""
        width={36}
        height={36}
        className={cn("w-auto shrink-0", compact ? "h-7" : "h-8 sm:h-9")}
      />
      <span
        className={cn(
          "font-black tracking-tight text-white",
          compact ? "text-lg" : "text-xl sm:text-2xl",
        )}
      >
        POKA
      </span>
      <span className="sr-only">POKA</span>
    </span>
  );
}
