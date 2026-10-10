import Link from "next/link";
import { ListIcon } from "lucide-react";
import { cn } from "cn";

export function BackToList({ href, label = "목록으로", className }: { href: string; label?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "touch-target inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#c9a25c]/40 bg-[#1d1611] px-4 text-sm font-bold text-[#f3eadb] hover:border-[#c9a25c]/75 hover:bg-[#2a2017]",
        className,
      )}
    >
      <ListIcon className="size-4 text-[#e7c98a]" />
      {label}
    </Link>
  );
}
