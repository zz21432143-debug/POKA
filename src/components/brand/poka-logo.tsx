import { cn } from "cn";

export function PokaLogo({
  className = "text-[1.85rem]",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("poka-sign inline-flex items-center gap-2", compact && "poka-sign-compact", className)}>
      <span className="poka-sign-crown" aria-hidden>
        ♛
      </span>
      <span className="poka-sign-letters">POKA</span>
    </span>
  );
}
