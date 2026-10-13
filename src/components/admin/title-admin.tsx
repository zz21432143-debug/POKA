"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "cn";
import { DIFFICULTIES, DIFFICULTY, ROUND_SIZE, type Difficulty } from "@/lib/practice";
import { PERIOD_LABEL, TITLE_NAME_MAX, type TitleConfig, type TitlePeriod } from "@/lib/pot-title-config";

type Row = { userId: string; nickname: string; correct: number; durationMs: number; at: string; runs: number; excluded: boolean };
type Snapshot = {
  config: TitleConfig;
  holders: Record<string, 1 | 2 | 3>;
  view: { difficulty: Difficulty; period: TitlePeriod };
  rows: Row[];
  excludedUsers: { id: string; nickname: string }[];
};

const secText = (ms: number) => `${Math.floor(ms / 60000) ? `${Math.floor(ms / 60000)}분 ` : ""}${((ms % 60000) / 1000).toFixed(1)}초`;
const dayText = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const TONE: Record<1 | 2 | 3, string> = {
  1: "border-amber-300 bg-gradient-to-r from-[#7f1d1d] to-[#b45309] text-amber-100",
  2: "border-zinc-300 bg-gradient-to-r from-zinc-700 to-zinc-500 text-white",
  3: "border-orange-400 bg-gradient-to-r from-[#5c2a12] to-[#9a4a1c] text-orange-100",
};
const ICON: Record<1 | 2 | 3, string> = { 1: "👹", 2: "🪙", 3: "🏮" };

function Badge({ rank, name }: { rank: 1 | 2 | 3; name: string }) {
  return <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", TONE[rank])}>{ICON[rank]} {name}</span>;
}

/** 관리자: 팟 계산 칭호 관리 */
export function TitleAdmin({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<TitleConfig | null>(null);
  const [view, setView] = useState<{ difficulty?: Difficulty; period?: TitlePeriod }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = useCallback((next: Snapshot) => {
    setData(next);
    setDraft(next.config);
    setView(next.view);
  }, []);

  const load = useCallback(
    async (v: { difficulty?: Difficulty; period?: TitlePeriod } = {}) => {
      const q = new URLSearchParams();
      if (v.difficulty) q.set("difficulty", v.difficulty);
      if (v.period) q.set("period", v.period);
      const res = await fetch(`/api/admin/titles?${q}`, { cache: "no-store" });
      const json = (await res.json()) as Snapshot & { error?: string };
      if (!res.ok) {
        setMessage(json.error ?? "불러오지 못했습니다.");
        return;
      }
      setData(json);
      setDraft((d) => d ?? json.config);
      setView(json.view);
    },
    [],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 서버에서 불러옵니다.
    void load();
  }, [load]);

  async function send(method: "PATCH" | "POST", body: unknown, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/titles", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as Snapshot & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "저장하지 못했습니다.");
      apply(json);
      setMessage(done);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!data || !draft) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  const holders = Object.entries(data.holders).sort((a, b) => a[1] - b[1]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.config);

  return (
    <div className="grid gap-4">
      {message ? <p className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold">{message}</p> : null}

      {/* 지금 칭호 */}
      <section aria-label="지금 칭호" className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-semibold">지금 칭호 받는 사람</h2>
          <span className="text-xs text-muted-foreground">
            {data.config.enabled
              ? `${DIFFICULTY[data.config.difficulty].label} 랭킹 · ${PERIOD_LABEL[data.config.period]} 기준 · 바뀌면 30초 안에 사이트 전체 반영`
              : "칭호가 꺼져 있어 아무에게도 보이지 않습니다."}
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([1, 2, 3] as const).map((rank) => {
            const holder = holders.find(([, r]) => r === rank)?.[0];
            return (
              <div key={rank} data-holder={rank} className="grid gap-1 rounded-xl border border-border bg-background p-3">
                <span className="text-xs font-semibold text-muted-foreground">{rank}위</span>
                <span>
                  <Badge rank={rank} name={data.config.names[rank]} />
                </span>
                <span className={cn("text-base font-black", !holder && "text-muted-foreground")}>{data.config.enabled ? (holder ?? "아직 없음") : "꺼짐"}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 설정 */}
      <section aria-label="칭호 설정" className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">칭호 설정</h2>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" disabled={!canEdit} checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} className="size-5" />
          칭호 켜기 <span className="text-xs font-normal text-muted-foreground">(끄면 사이트 전체에서 칭호가 사라집니다. 기록·랭킹은 그대로)</span>
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          {([1, 2, 3] as const).map((rank) => (
            <label key={rank} className="grid gap-1 text-sm font-semibold">
              {rank}위 칭호 이름
              <input
                aria-label={`${rank}위 칭호 이름`}
                disabled={!canEdit}
                maxLength={TITLE_NAME_MAX}
                value={draft.names[rank]}
                onChange={(e) => setDraft({ ...draft, names: { ...draft.names, [rank]: e.target.value } })}
                className="h-11 rounded-lg border border-border bg-background px-2 text-base"
              />
              <span>
                <Badge rank={rank} name={draft.names[rank] || "(비우면 기본값)"} />
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            기준 난이도
            <select
              aria-label="기준 난이도"
              disabled={!canEdit}
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
              className="h-11 rounded-lg border border-border bg-background px-2 text-base"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY[d].label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-1 text-sm font-semibold">
            기간
            <div role="radiogroup" aria-label="기간" className="flex gap-2">
              {(["all", "month"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={draft.period === p}
                  disabled={!canEdit}
                  onClick={() => setDraft({ ...draft, period: p })}
                  className={cn("min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold", draft.period === p ? "border-primary bg-primary text-primary-foreground" : "border-border")}
                >
                  {PERIOD_LABEL[p]}
                  <span className="block text-[11px] font-normal opacity-80">{p === "all" ? "가장 좋은 기록 그대로" : "매달 1일 새로 시작"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void send("PATCH", { enabled: draft.enabled, names: draft.names, difficulty: draft.difficulty, period: draft.period }, "칭호 설정을 저장했습니다.")}
              className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              저장
            </button>
            <button type="button" disabled={busy || !dirty} onClick={() => setDraft(data.config)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-40">
              되돌리기
            </button>
          </div>
        ) : null}
      </section>

      {/* 랭킹 · 기록 관리 */}
      <section aria-label="랭킹 기록 관리" className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">랭킹 · 기록 관리</h2>
          <select
            aria-label="볼 난이도"
            value={view.difficulty}
            onChange={(e) => void load({ ...view, difficulty: e.target.value as Difficulty })}
            className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY[d].label}
              </option>
            ))}
          </select>
          <select
            aria-label="볼 기간"
            value={view.period}
            onChange={(e) => void load({ ...view, period: e.target.value as TitlePeriod })}
            className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
          >
            {(["all", "month"] as const).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">사람마다 최고 기록 · 상위 30명</span>
        </div>
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-2 py-1.5">순위</th>
                  <th className="px-2 py-1.5">닉네임</th>
                  <th className="px-2 py-1.5">최고 기록</th>
                  <th className="px-2 py-1.5">시간</th>
                  <th className="px-2 py-1.5">기록 날짜</th>
                  <th className="px-2 py-1.5">판 수</th>
                  {canEdit ? <th className="px-2 py-1.5">관리</th> : null}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={row.userId} data-row={row.nickname} className={cn("border-b border-border/60", row.excluded && "opacity-60")}>
                    <td className="px-2 py-1.5 font-black">{i + 1}</td>
                    <td className="px-2 py-1.5">
                      <span className="flex flex-wrap items-center gap-1 font-semibold">
                        {row.nickname}
                        {data.holders[row.nickname] && view.difficulty === data.config.difficulty && view.period === data.config.period ? (
                          <Badge rank={data.holders[row.nickname]} name={data.config.names[data.holders[row.nickname]]} />
                        ) : null}
                        {row.excluded ? <span className="rounded bg-rose-900 px-1 text-[10px] font-bold text-rose-100">칭호 제외</span> : null}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {row.correct}/{ROUND_SIZE}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{secText(row.durationMs)}</td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{dayText(row.at)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{row.runs}</td>
                    {canEdit ? (
                      <td className="px-2 py-1.5">
                        <span className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void send(
                                "POST",
                                { type: row.excluded ? "include" : "exclude", userId: row.userId, view },
                                row.excluded ? `${row.nickname} 칭호 제외를 풀었습니다.` : `${row.nickname}님을 칭호에서 뺐습니다.`,
                              )
                            }
                            className="min-h-9 rounded-lg border border-border px-2 text-xs font-semibold"
                          >
                            {row.excluded ? "제외 해제" : "칭호 제외"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${row.nickname}님의 ${DIFFICULTY[view.difficulty ?? data.config.difficulty].label} 기록 ${row.runs}개를 모두 지울까요? 되돌릴 수 없습니다(부정 기록 정리용).`,
                                )
                              ) {
                                void send("POST", { type: "deleteRecords", userId: row.userId, difficulty: view.difficulty, view }, `${row.nickname}님의 기록을 지웠습니다.`);
                              }
                            }}
                            className="min-h-9 rounded-lg border border-rose-500/60 px-2 text-xs font-semibold text-rose-300"
                          >
                            기록 삭제
                          </button>
                        </span>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">이 난이도 · 기간에는 아직 기록이 없습니다.</p>
        )}
        {data.excludedUsers.length ? (
          <div className="grid gap-1">
            <p className="text-sm font-semibold">칭호 제외 회원</p>
            <div className="flex flex-wrap gap-1.5">
              {data.excludedUsers.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs">
                  {u.nickname}
                  {canEdit ? (
                    <button type="button" disabled={busy} onClick={() => void send("POST", { type: "include", userId: u.id, view }, `${u.nickname} 칭호 제외를 풀었습니다.`)} className="font-bold text-primary">
                      해제
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
