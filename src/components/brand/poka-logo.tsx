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
        "inline-flex items-center gap-2.5 whitespace-nowrap bg-transparent",
        !onDark && "rounded-xl bg-[#07150f] px-2 py-1",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-flame.png"
        alt=""
        width={40}
        height={40}
        className={cn(
          "shrink-0 rounded-[7px] object-cover shadow-[0_0_8px_rgba(255,68,68,0.4)]",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      />
      <span className={cn("font-black leading-none tracking-tight text-white", compact ? "text-xl" : "text-[1.65rem]")}>
        POKA
      </span>
    </span>
  );
}
