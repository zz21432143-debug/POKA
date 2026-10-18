import type { GameBoardData } from "@/lib/game-board";

const n = (v: number) => v.toLocaleString("ko-KR");

/** "5시간 20분" */
function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`;
}

/** 새 현황판 창: 고른 시작 방법으로 만들면 TV에 어떻게 보이는지 · 블라인드 구조 미리보기 */
export function BoardTemplatePreview({ data, loading = false }: { data: GameBoardData | null; loading?: boolean }) {
  if (loading || !data) {
    return (
      <div data-template-preview="loading" className="grid h-40 place-items-center rounded-xl border border-white/10 bg-black/40 text-xs text-zinc-400">
        {loading ? "미리보기 불러오는 중…" : "미리보기를 볼 수 없어요"}
      </div>
    );
  }
  const play = data.levels.filter((l) => !l.isBreak);
  const breaks = data.levels.length - play.length;
  const total = data.levels.reduce((sum, l) => sum + l.minutes, 0);
  const first = data.levels.find((l) => !l.isBreak) ?? data.levels[0];
  const shown = data.levels.slice(0, 6);
  // 휴식 빼고 센 레벨 번호
  let lv = 0;
  const rows = shown.map((l) => (l.isBreak ? { l, no: 0 } : { l, no: ++lv }));
  return (
    <div data-template-preview className="grid gap-2">
      <p className="text-xs font-bold text-zinc-300">미리보기 · 만들면 이렇게 시작해요</p>
      {/* TV 화면 축소판 */}
      <div className="grid gap-1 rounded-xl border border-amber-400/50 bg-[radial-gradient(circle_at_50%_0%,#3a2a0c_0%,#0b0706_70%)] px-3 py-3 text-center">
        <p className="truncate text-sm font-black text-white">{data.name}</p>
        {data.subtitle ? <p className="truncate text-[11px] text-zinc-300">{data.subtitle}</p> : null}
        <p className="text-[10px] font-black tracking-[0.25em] text-amber-300">LEVEL 1</p>
        <p className="text-2xl leading-none font-black text-white tabular-nums">
          {n(first.sb)} / {n(first.bb)}
        </p>
        <p className="text-[11px] font-bold text-zinc-300 tabular-nums">
          {first.ante ? `앤티 ${n(first.ante)} · ` : ""}
          {String(first.minutes).padStart(2, "0")}:00
        </p>
      </div>
      <p className="text-xs font-bold text-amber-200">
        총 {play.length}레벨{breaks ? ` · 휴식 ${breaks}번` : ""} · 약 {duration(total)} · 시작 칩 {n(data.startStack)}
        {data.regLevel ? ` · 등록 마감 Lv.${data.regLevel}` : ""}
        {data.prizes.length ? ` · 프라이즈 ${data.prizes.length}줄` : ""}
      </p>
      <ol className="grid gap-0.5 rounded-xl border border-white/10 bg-black/40 p-2 text-xs tabular-nums">
        {rows.map(({ l, no }, i) =>
          l.isBreak ? (
            <li key={i} className="flex justify-between px-1 text-sky-300">
              <span>☕ 휴식</span>
              <span>{l.minutes}분</span>
            </li>
          ) : (
            <li key={i} className="flex justify-between gap-2 px-1 text-zinc-200">
              <span className="w-10 shrink-0 font-bold text-amber-300">Lv.{no}</span>
              <span className="min-w-0 flex-1 truncate">
                {n(l.sb)} / {n(l.bb)}
                {l.ante ? <span className="text-zinc-400"> ({n(l.ante)})</span> : null}
              </span>
              <span className="shrink-0">{l.minutes}분</span>
            </li>
          ),
        )}
        {data.levels.length > shown.length ? <li className="px-1 text-zinc-500">… 이후 {data.levels.length - shown.length}칸 더</li> : null}
      </ol>
    </div>
  );
}
