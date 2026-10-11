"use client";

import { useState } from "react";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayKstDate } from "@/lib/dates";
import { parseDateList } from "@/lib/job-parse";
import { MAX_JOB_EVENTS, dayLabel, groupDateLabel, groupJobEvents, weekdayKo, type JobEvent } from "@/lib/job-events";
import { cn } from "cn";

const pad = (n: number) => String(n).padStart(2, "0");

/** 날짜 칸 표시용: "2026-10-31" → "2026년 10월 31일 (토)" */
function longLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${dayLabel(date).slice(-2, -1)})`;
}

/**
 * 작은 달력. 날짜를 누르면 onPick이 불립니다. 여러 날 선택은 부모가 selected로 관리합니다.
 * 오늘 이전 날짜는 고를 수 없습니다.
 */
export function MiniCalendar({
  selected,
  onPick,
  initialMonth,
}: {
  selected: string[];
  onPick: (date: string) => void;
  initialMonth?: string;
}) {
  const today = todayKstDate();
  const start = (initialMonth || selected[0] || today).slice(0, 7);
  const [month, setMonth] = useState(start);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  const chosen = new Set(selected);
  const shift = (delta: number) => {
    const next = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`);
  };

  return (
    <div className="w-[17.5rem] rounded-xl border border-[#c9a25c]/60 bg-[#1d1611] p-2 shadow-[0_12px_30px_rgb(0_0_0/0.55)]">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          aria-label="이전 달"
          className="grid size-9 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10"
          onClick={() => shift(-1)}
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <p className="text-sm font-bold text-white">
          {y}년 {m}월
        </p>
        <button
          type="button"
          aria-label="다음 달"
          className="grid size-9 place-items-center rounded-lg text-[#e7c98a] hover:bg-white/10"
          onClick={() => shift(1)}
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold">
        {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
          <span key={w} className={cn("py-1", i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-[#9CA3AF]")}>
            {w}
          </span>
        ))}
        {cells.map((date, i) =>
          date ? (
            <button
              key={date}
              type="button"
              disabled={date < today}
              aria-pressed={chosen.has(date)}
              onClick={() => onPick(date)}
              className={cn(
                "m-0.5 grid h-9 place-items-center rounded-lg text-sm font-semibold",
                chosen.has(date)
                  ? "bg-[#c9a25c] text-[#1d1611]"
                  : date < today
                    ? "text-white/20"
                    : "text-[#E5E7EB] hover:bg-white/10",
                date === today && !chosen.has(date) && "ring-1 ring-[#c9a25c]/70",
                !chosen.has(date) && date >= today && i % 7 === 0 && "text-rose-300",
                !chosen.has(date) && date >= today && i % 7 === 6 && "text-sky-300",
              )}
            >
              {Number(date.slice(8))}
            </button>
          ) : (
            <span key={`blank-${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

/** 달력 버튼과 펼쳐지는 달력. 바깥을 누르면 닫힙니다. */
function CalendarPopover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <button type="button" aria-label="달력 닫기" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1">{children}</div>
    </>
  );
}

/**
 * 날짜 하나 칸. 직접 쳐도 되고(10/31, 10월 31일, 1031) 달력 버튼으로 골라도 됩니다.
 * 값은 YYYY-MM-DD 문자열입니다.
 */
export function DateField({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "예: 10/31",
  iso = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** true면 칸에 "2026-10-31 (토)"처럼 YYYY-MM-DD로 보여 줍니다. */
  iso?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [bad, setBad] = useState(false);

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    if (!text) {
      onChange("");
      setBad(false);
    } else {
      const [date] = parseDateList(text, todayKstDate());
      if (date) onChange(date);
      setBad(!date);
    }
    setDraft(null);
  }

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <Input
          id={id}
          className={cn("h-11 text-base", bad && "border-rose-500")}
          value={draft ?? (value ? (iso ? `${value} (${weekdayKo(value)})` : longLabel(value)) : "")}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setDraft(value ? `${Number(value.slice(5, 7))}/${Number(value.slice(8))}` : "")}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-11 shrink-0 px-3"
          aria-label="달력에서 고르기"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          <CalendarDaysIcon className="size-5" />
        </Button>
        {value && !disabled ? (
          <Button type="button" variant="ghost" className="h-11 shrink-0 px-2" aria-label="날짜 지우기" onClick={() => onChange("")}>
            <XIcon className="size-4" />
          </Button>
        ) : null}
      </div>
      {bad ? <p className="mt-1 text-xs text-rose-400">날짜를 읽지 못했습니다. 10/31 처럼 적어 주세요.</p> : null}
      <CalendarPopover open={open} onClose={() => setOpen(false)}>
        <MiniCalendar
          selected={value ? [value] : []}
          onPick={(date) => {
            onChange(date);
            setBad(false);
            setOpen(false);
          }}
        />
      </CalendarPopover>
    </div>
  );
}

/**
 * 여러 날짜 일정 편집기. 달력에서 여러 날을 눌러 고르거나, "10/24, 10/31", "12/23~12/27"처럼 한 번에 적습니다.
 * 날짜마다 행사명·인원을 붙일 수 있고, 같은 이름으로 이어진 날짜는 게시글에서 한 줄(12/23~12/27)로 묶입니다.
 */
export function JobEventsEditor({
  events,
  onChange,
  disabled = false,
}: {
  events: JobEvent[];
  onChange: (events: JobEvent[]) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const today = todayKstDate();

  const sorted = (rows: JobEvent[]) =>
    [...rows].sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_JOB_EVENTS);

  function addDates(dates: string[]) {
    const have = new Set(events.map((e) => e.date));
    const fresh = dates.filter((d) => !have.has(d));
    onChange(sorted([...events, ...fresh.map((date) => ({ date }))]));
    return fresh.length;
  }

  function addFromText() {
    const dates = parseDateList(text, today);
    if (dates.length === 0) {
      setNote("날짜를 읽지 못했습니다. 10/24, 10/31 또는 12/23~12/27 처럼 적어 주세요.");
      return;
    }
    const added = addDates(dates);
    setNote(added > 0 ? `${added}일 추가했습니다.` : "이미 들어 있는 날짜입니다.");
    setText("");
  }

  function toggle(date: string) {
    if (events.some((e) => e.date === date)) onChange(events.filter((e) => e.date !== date));
    else addDates([date]);
  }

  function update(index: number, patch: Partial<JobEvent>) {
    onChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  const groups = groupJobEvents(events);

  return (
    <div className={cn("grid gap-2", disabled && "pointer-events-none opacity-50")}>
      <div className="relative">
        <div className="flex gap-1.5">
          <Input
            className="h-11 text-base"
            value={text}
            placeholder="10/24, 10/31 또는 12/23~12/27"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFromText();
              }
            }}
          />
          <Button type="button" variant="secondary" className="h-11 shrink-0 px-3" onClick={addFromText}>
            추가
          </Button>
          <Button
            type="button"
            className="h-11 shrink-0 gap-1 bg-[#c9a25c] px-3 text-[#1d1611] hover:bg-[#e7c98a]"
            aria-label="달력에서 여러 날 고르기"
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarDaysIcon className="size-5" />
            달력
          </Button>
        </div>
        <CalendarPopover open={open} onClose={() => setOpen(false)}>
          <div className="grid gap-1">
            <MiniCalendar selected={events.map((e) => e.date)} onPick={toggle} />
            <Button type="button" size="sm" className="min-h-10" onClick={() => setOpen(false)}>
              {events.length}일 선택 · 완료
            </Button>
          </div>
        </CalendarPopover>
      </div>
      {note ? <p className="text-xs text-[#e7c98a]">{note}</p> : null}

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 px-3 py-3 text-center text-xs text-[#9CA3AF]">
          달력에서 날짜를 여러 개 누르거나, 위에 한 번에 적어 추가하세요.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {events.map((event, index) => {
            const past = event.date < today;
            return (
              <li
                key={`${event.date}-${index}`}
                className={cn(
                  "grid grid-cols-[4.75rem_1fr_4.5rem_2.25rem] items-center gap-1.5 rounded-lg border border-white/10 bg-[#141110] p-1.5",
                  past && "opacity-50 grayscale",
                )}
              >
                <span className="rounded-md bg-[#2a2017] px-1.5 py-2 text-center text-[13px] font-bold text-[#e7c98a]">
                  {dayLabel(event.date)}
                </span>
                <Input
                  className="h-10 text-sm"
                  aria-label={`${dayLabel(event.date)} 행사명`}
                  placeholder="MAIN EVENT"
                  value={event.name ?? ""}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
                <Input
                  className="h-10 text-sm"
                  aria-label={`${dayLabel(event.date)} 인원`}
                  placeholder="00명"
                  value={event.headcount ?? ""}
                  onChange={(e) => update(index, { headcount: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={`${dayLabel(event.date)} 빼기`}
                  className="grid size-9 place-items-center rounded-md text-[#9CA3AF] hover:bg-white/10 hover:text-white"
                  onClick={() => onChange(events.filter((_, i) => i !== index))}
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {groups.length > 0 ? (
        <p className="text-xs text-[#9CA3AF]">
          게시글 표시: {groups.map((g) => [g.name, groupDateLabel(g), g.headcount].filter(Boolean).join(" ")).join(" / ")}
        </p>
      ) : null}
    </div>
  );
}

