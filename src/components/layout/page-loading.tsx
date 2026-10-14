import { Loader2Icon } from "lucide-react";
import { OniSticker, type OniStickerName } from "@/components/brand/oni";

/** 화면이 넘어가는 동안: 눌렀다는 게 바로 보이게(오니 + 여는 중) */
export function PageLoading({ sticker = "work" }: { sticker?: OniStickerName }) {
  return (
    <div data-page-loading role="status" aria-live="polite" className="ink-panel mx-auto grid w-full max-w-md justify-items-center gap-3 rounded-2xl px-5 py-10 text-center">
      <OniSticker name={sticker} className="h-16 animate-bounce" />
      <p className="flex items-center gap-2 text-base font-black text-white">
        <Loader2Icon className="size-5 animate-spin text-[#e7c98a]" />
        여는 중…
      </p>
    </div>
  );
}
