import { AlertTriangleIcon } from "lucide-react";
import { ANONYMOUS_BOARD_WARNING } from "@/lib/legal";

export function LiabilityNotice({ text = ANONYMOUS_BOARD_WARNING }: { text?: string }) {
  return (
    <aside
      role="note"
      className="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm leading-6 text-amber-200"
    >
      <p className="flex items-start gap-2 font-semibold">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-700" />
        작성 책임 안내
      </p>
      <p className="mt-1 pl-6">{text}</p>
    </aside>
  );
}
