import Link from "next/link";
import { SendIcon } from "lucide-react";

export function TalkCta() {
  return (
    <Link
      href="/boards/free/write"
      className="touch-target flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm hover:border-primary/40"
    >
      <span>
        <span className="block text-sm font-semibold">지금, 함께 이야기해요</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          당신의 이야기가 누군가에겐 큰 힘이 됩니다.
        </span>
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <SendIcon className="size-4" />
      </span>
    </Link>
  );
}
