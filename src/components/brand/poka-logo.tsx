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
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="h-[1.15em] w-[1.15em] shrink-0"
      >
        <circle cx="20" cy="20" r="18" fill="none" stroke="#10B981" strokeWidth="1.6" />
        <path
          d="M20 7.5c4.6 6.2 9.2 9.4 9.2 14.1 0 4.2-3.4 7.4-9.2 7.4s-9.2-3.2-9.2-7.4c0-4.7 4.6-7.9 9.2-14.1Z"
          fill="#10B981"
        />
        <rect x="18.2" y="27.2" width="3.6" height="6.2" rx="0.6" fill="#10B981" />
      </svg>
      <span className="font-semibold tracking-[0.32em] leading-none">{alt}</span>
    </span>
  );
}
