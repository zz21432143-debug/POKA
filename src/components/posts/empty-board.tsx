import Link from "@/components/ui/link";
import { PenSquareIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { OniSticker } from "@/components/brand/oni";

export type EmptyAction = { href: string; label: string };

/** 글이 없는 게시판. 문구만 두지 않고 첫 글 쓰기 버튼을 함께 보여줍니다. */
export function EmptyBoard({
  text,
  action,
  framed = true,
}: {
  text: string;
  action?: EmptyAction;
  framed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-4 py-10 text-center",
        framed && "ink-panel rounded-2xl",
      )}
    >
      {framed ? <OniSticker name="think" className="h-16 opacity-90" /> : null}
      <p className={framed ? "text-base text-[#D1D5DB]" : "text-sm text-[#9CA3AF]"}>{text}</p>
      {action ? (
        <>
          <p className="text-sm text-[#9CA3AF]">첫 글을 올려 이 공간을 시작해 보세요.</p>
          <Link href={action.href} className={cn(buttonVariants({ size: "touch" }), "relative z-10 gap-1.5")}>
            <PenSquareIcon className="size-4" />
            {action.label}
          </Link>
        </>
      ) : null}
    </div>
  );
}
