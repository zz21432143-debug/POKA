import { cn } from "cn";

export function PokaLogo({
  className = "text-2xl",
  alt = "POKA",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-foreground", className)}>
      <span className="relative font-black tracking-tight leading-none">
        <span className="absolute -top-2.5 left-0 text-[0.45em] text-amber-400">♛</span>
        {alt}
      </span>
      <span className="hidden text-[9px] leading-3 font-semibold tracking-[0.12em] text-muted-foreground sm:block">
        BETTER PEOPLE
        <br />
        BIGGER OPPORTUNITIES
      </span>
    </span>
  );
}
