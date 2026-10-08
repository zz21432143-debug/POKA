import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";
import { cn } from "@/lib/utils";

function KakaoBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.58 2 11c0 2.79 1.86 5.24 4.66 6.67-.15.55-.95 3.43-.98 3.64-.05.3.14.3.29.22.12-.06 1.98-1.35 2.78-1.89.72.14 1.47.21 2.25.21 5.52 0 10-3.58 10-8S17.52 3 12 3z"
      />
    </svg>
  );
}

export function KakaoOpenChatCta({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <a
        href={KAKAO_OPEN_CHAT_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="POKA 공식 오픈채팅방 참여하기"
        className={cn(
          "btn-3d-gold touch-target inline-flex size-11 items-center justify-center rounded-full sm:h-10 sm:w-auto sm:max-w-[12.5rem] sm:gap-1.5 sm:px-3",
          className,
        )}
      >
        <KakaoBubbleIcon className="size-5 shrink-0" />
        <span className="hidden truncate text-[13px] font-bold sm:inline">공식 오픈채팅</span>
      </a>
    );
  }

  return (
    <a
      href={KAKAO_OPEN_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "btn-3d-gold touch-target flex w-full items-center gap-3 rounded-[1.25rem] px-4 py-3.5",
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#191919] text-[#FEE500]">
        <KakaoBubbleIcon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wide text-[#191919]/70">카카오톡 공식</span>
        <span className="mt-0.5 block text-sm font-bold leading-snug">POKA 공식 오픈채팅방 참여하기</span>
      </span>
    </a>
  );
}
