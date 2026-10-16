import { LinkifiedText } from "@/components/posts/linkified-text";
import { todayKstDate } from "@/lib/dates";
import { splitPastScheduleLines } from "@/lib/job-dates";

/** 구인 본문: 오늘보다 지난 날짜 줄은 아래 「지난 일정」으로 접어 둠(글을 매번 고치지 않아도 됨) */
export function JobScheduleText({ text }: { text: string }) {
  const { current, past } = splitPastScheduleLines(text, todayKstDate());
  return (
    <>
      <LinkifiedText text={current} />
      {past.length ? (
        <details data-job-past-lines={past.length} className="mt-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-400">
          <summary className="cursor-pointer font-bold">지난 일정 {past.length}개(마감) 보기</summary>
          <ul className="mt-1.5 grid gap-1">
            {past.map((l, i) => (
              <li key={i} className="line-through decoration-zinc-500">
                {l}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
