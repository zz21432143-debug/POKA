import { cn } from "cn";

export function PokaLogo({
  className = "text-2xl",
  alt = "POKA",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="h-[1.2em] w-[1.2em] shrink-0"
      >
        <rect width="40" height="40" rx="12" fill="#22C55E" />
        <path
          d="M20 7.2c4.4 5.8 8.8 8.9 8.8 13.4 0 4-3.2 7-8.8 7s-8.8-3-8.8-7c0-4.5 4.4-7.6 8.8-13.4Z"
          fill="#fff"
        />
        <rect x="18.3" y="26.4" width="3.4" height="5.6" rx="0.7" fill="#fff" />
      </svg>
      <span className="relative font-bold tracking-tight leading-none">
        {alt}
        <span className="absolute -top-2 right-[-0.55em] text-[0.42em] text-amber-400">♛</span>
      </span>
    </span>
  );
}
