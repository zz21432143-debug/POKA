"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontalIcon } from "lucide-react";
import { cn } from "cn";
import type { ChatMessage } from "@/lib/job-chat";
import { parseJobPost } from "@/lib/job-parse";
import { lineDate } from "@/lib/job-dates";
import { slotsFromText } from "@/lib/job-slots";
import { JOB_REGIONS } from "@/lib/job-status";

const kst = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...opts }).format(new Date(iso));
const dayKey = (iso: string) => kst(iso, { year: "numeric", month: "2-digit", day: "2-digit" });
const todayKst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const PHONE = /(0\d{1,2})[\s.-]?(\d{3,4})[\s.-]?(\d{4})/;

/** 지점 이름 → 지역(자주 나오는 곳만) — 서울 · 경기가 섞인 공고 알려 주기 */
const PLACE_REGION: [RegExp, string][] = [
  [/잠실|송파|강남|역삼|선릉|서초|홍대|합정|마포|신촌|건대|성수|강동|천호|종로|을지로|신림|영등포|여의도|노원|목동|구로|가산|용산|이태원|왕십리|수유|미아|사당|방이/, "서울"],
  [/하남|미사|분당|서현|정자|판교|성남|수원|인계|영통|화성|동탄|병점|일산|고양|부천|안양|평촌|용인|수지|기흥|평택|의정부|남양주|다산|별내|김포|파주|운정|광명|시흥|안산|구리|오산|군포|의왕|이천|양주/, "경기"],
  [/부평|송도|구월|주안|청라|인천|계양|연수|검단|영종/, "인천"],
];
/** 지점 줄(「• 잠실 방이점」)에 나온 지역 — 많은 순 */
function regionsIn(text: string) {
  const hits = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*[•·\-▶■◆★]/.test(line) && !/(점|지점|매장)\s*$/.test(line.trim())) continue;
    for (const [re, r] of PLACE_REGION) if (re.test(line)) hits.set(r, (hits.get(r) ?? 0) + 1);
  }
  return [...hits.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
}

/** 말풍선 본문: 지난 날짜 줄은 흐리게 · 「마감」 줄 줄긋기 · 전화번호는 누르면 전화 */
function Body({ text, today }: { text: string; today: string }) {
  return (
    <>
      {text.split(/\r?\n/).map((line, i) => {
        const d = lineDate(line, today);
        const past = Boolean(d && d < today);
        const closed = Boolean(d) && /마감|완료/.test(line);
        const phone = line.match(PHONE);
        return (
          <span key={i} className={cn("block min-h-[1.2em] whitespace-pre-wrap break-words", (past || closed) && "text-zinc-500 line-through decoration-zinc-500")}>
            {phone && !past ? (
              <>
                {line.slice(0, phone.index)}
                <a href={`tel:${phone[0].replace(/[^\d]/g, "")}`} className="font-bold text-[#0b57d0] underline">
                  {phone[0]}
                </a>
                {line.slice((phone.index ?? 0) + phone[0].length)}
              </>
            ) : (
              line || " "
            )}
          </span>
        );
      })}
    </>
  );
}

export function ApplyChat({
  initial,
  region,
  loggedIn,
  myNickname,
}: {
  initial: ChatMessage[];
  region: string | null;
  loggedIn: boolean;
  myNickname: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [moreBusy, setMoreBusy] = useState(false);
  const [noMore, setNoMore] = useState(initial.length < 30);
  const [fresh, setFresh] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const today = todayKst();
  const q = region ? `&region=${encodeURIComponent(region)}` : "";

  // 처음엔 맨 아래(최신)부터 — 페이지는 그대로 두고 채팅 칸만
  const toBottom = (smooth = false) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };
  useEffect(() => {
    toBottom();
  }, []);

  // 새 공고(올리기 · 끌어올리기)를 맨 아래에 — mine: 내가 방금 보낸 것이면 바로 내려가 보여 줌
  const pullNew = async (mine = false) => {
    const last = messages[messages.length - 1]?.at ?? new Date(Date.now() - 86_400_000).toISOString();
    const r = await fetch(`/api/jobs/chat?after=${encodeURIComponent(last)}${q}`, { cache: "no-store" }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
    const add = j?.messages ?? [];
    if (!add.length) return;
    setMessages((old) => [...old.filter((x) => !add.some((a) => a.id === x.id)), ...add]);
    if (mine) window.setTimeout(() => toBottom(true), 50);
    else setFresh((n) => n + add.filter((a) => !messages.some((x) => x.id === a.id)).length);
  };
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!document.hidden) void pullNew();
    }, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 새 공고 확인은 목록이 바뀔 때마다 다시 잡음
  }, [messages, q]);

  async function loadOlder() {
    if (moreBusy || !messages.length) return;
    setMoreBusy(true);
    const before = messages[0].at;
    const r = await fetch(`/api/jobs/chat?before=${encodeURIComponent(before)}${q}`, { cache: "no-store" }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
    const older = j?.messages ?? [];
    if (older.length < 30) setNoMore(true);
    setMessages((old) => [...older.filter((o) => !old.some((x) => x.id === o.id)), ...old]);
    setMoreBusy(false);
  }

  // 날짜 구분선과 함께
  const rows = useMemo(() => {
    const out: ({ kind: "day"; key: string; label: string } | { kind: "msg"; m: ChatMessage })[] = [];
    let prev = "";
    for (const m of messages) {
      const k = dayKey(m.at);
      if (k !== prev) {
        out.push({ kind: "day", key: k, label: kst(m.at, { year: "numeric", month: "long", day: "numeric", weekday: "long" }) });
        prev = k;
      }
      out.push({ kind: "msg", m });
    }
    return out;
  }, [messages]);

  return (
    <div data-apply-chat className="flex flex-col overflow-hidden rounded-2xl border border-[#3b4a5c] bg-[#b2c7d9]">
      {/* 채팅방 머리 */}
      <div className="flex items-center gap-2 bg-[#a9bdce] px-3 py-2 text-[#1d2733]">
        <b className="text-base">💬 지원 딜러 오픈채팅</b>
        <span className="text-xs font-bold text-[#3b4a5c]">{region ? `${region} · ` : ""}공고 {messages.length}</span>
        <Link href={region ? `/boards/jobs/slots?region=${encodeURIComponent(region)}` : "/boards/jobs/slots"} className="ml-auto rounded-full bg-white/70 px-2.5 py-1 text-xs font-black text-[#1d2733]">
          📅 날짜별로 보기
        </Link>
      </div>
      <div ref={listRef} className="flex max-h-[68dvh] min-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-2.5 py-3">
        {!noMore ? (
          <button type="button" onClick={() => void loadOlder()} disabled={moreBusy} className="mx-auto rounded-full bg-black/15 px-3 py-1 text-xs font-bold text-[#1d2733]">
            {moreBusy ? "불러오는 중…" : "⬆ 이전 공고 더 보기"}
          </button>
        ) : null}
        {rows.length === 0 ? <p className="py-10 text-center text-sm text-[#1d2733]">아직 올라온 공고가 없어요. 아래에 카톡 공고를 붙여넣어 첫 공고를 올려 보세요.</p> : null}
        {rows.map((r) =>
          r.kind === "day" ? (
            <p key={`d-${r.key}`} className="mx-auto my-1 rounded-full bg-black/15 px-3 py-0.5 text-[11px] font-bold text-white">
              {r.label}
            </p>
          ) : (
            <ChatBubble
              key={r.m.id}
              m={r.m}
              mine={Boolean(myNickname && r.m.author?.nickname === myNickname)}
              today={today}
              loggedIn={loggedIn}
              onEdited={(id, text) => {
                setMessages((old) => old.map((x) => (x.id === id ? { ...x, text } : x)));
                void pullNew(true);
              }}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>
      {fresh ? (
        <button
          type="button"
          data-chat-fresh={fresh}
          onClick={() => {
            setFresh(0);
            toBottom(true);
          }}
          className="mx-auto -mt-12 mb-2 rounded-full bg-[#fee500] px-4 py-1.5 text-sm font-black text-[#1d1d1d] shadow"
        >
          ⬇ 새 공고 {fresh}개
        </button>
      ) : null}
      <Composer
        loggedIn={loggedIn}
        defaultRegion={region}
        onSent={() => {
          void pullNew(true);
          router.refresh();
        }}
      />
    </div>
  );
}

function ChatBubble({ m, mine, today, loggedIn, onEdited }: { m: ChatMessage; mine: boolean; today: string; loggedIn: boolean; onEdited: (id: string, text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.text);
  const [saving, setSaving] = useState(false);
  const [editNote, setEditNote] = useState<string | null>(null);
  async function saveEdit() {
    setSaving(true);
    setEditNote(null);
    const r = await fetch(`/api/posts/${m.id}/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string; bumped?: boolean } | null;
    setSaving(false);
    if (!r?.ok) {
      setEditNote(j?.error ?? "갱신하지 못했어요.");
      return;
    }
    setEditing(false);
    onEdited(m.id, draft);
  }
  const phone = m.contact ?? m.text.match(PHONE)?.[0] ?? null;
  // 긴 공고는 12줄까지만 · 같은 매장 이전 공고는 접어 둠
  const lineCount = m.text.split(/\r?\n/).length;
  const [open, setOpen] = useState(false);
  if (m.superseded && !open) {
    return (
      <button type="button" data-chat-superseded onClick={() => setOpen(true)} className={cn("mx-auto rounded-full bg-black/10 px-3 py-1 text-[11.5px] font-bold text-[#1d2733]", mine && "ml-auto mr-0")}>
        {m.author?.nickname ?? "POKA"} · {m.company ?? "매장"} 이전 공고(새로 올림) · 펼치기
      </button>
    );
  }
  const long = lineCount > 12 && !open;
  const shown = long ? m.text.split(/\r?\n/).slice(0, 12).join("\n") : m.text;
  const smsBody = encodeURIComponent("POKA 보고 지원합니다. 성함 / 경력 / 성별: ");
  return (
    <div data-chat-msg={m.id} className={cn("flex items-start gap-2", mine && "flex-row-reverse")}>
      {!mine ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.logoUrl ?? m.author?.markUrl ?? "/marks/default.svg"} alt={m.logoUrl ? `${m.company ?? "매장"} 로고` : ""} width={36} height={36} className="mt-0.5 size-9 shrink-0 rounded-2xl bg-white object-cover" />
      ) : null}
      <div className={cn("grid min-w-0 max-w-[82%] gap-0.5", mine && "justify-items-end")}>
        {!mine ? (
          <span className="flex items-center gap-1 text-xs font-bold text-[#1d2733]">
            {m.author?.nickname ?? "POKA"}
            {m.company ? <span className="text-[11px] font-normal text-[#3b4a5c]">· {m.company}</span> : null}
          </span>
        ) : null}
        <div className={cn("flex items-end gap-1", mine && "flex-row-reverse")}>
          <div className={cn("relative min-w-0 rounded-2xl px-3 py-2 text-[14px] leading-relaxed text-[#1d1d1d] shadow-sm", mine ? "rounded-tr-sm bg-[#fee500]" : "rounded-tl-sm bg-white")}>
            {m.status === "closed" ? <span className="mb-1 inline-block rounded bg-zinc-300 px-1.5 text-[11px] font-black text-zinc-700">마감</span> : null}
            <Body text={shown} today={today} />
            {long ? (
              <button type="button" data-chat-more onClick={() => setOpen(true)} className="mt-0.5 text-xs font-bold text-[#0b57d0]">
                … 더 보기({lineCount - 12}줄)
              </button>
            ) : null}
            {!loggedIn && m.slots.length ? (
              <span data-chat-slots className="mt-1.5 flex flex-wrap gap-1">
                {m.slots.map((s, i) => (
                  <span key={i} className="rounded-md bg-[#eef3f8] px-1.5 py-0.5 text-[11.5px] font-bold text-[#1d2733]">
                    {Number(s.date.slice(5, 7))}/{Number(s.date.slice(8))} {s.time ?? ""} {s.count ?? ""}
                  </span>
                ))}
              </span>
            ) : null}
            {m.clipped ? (
              <Link href={`/login?next=/boards/jobs/apply`} className="mt-1 block text-xs font-bold text-[#0b57d0]">
                … 로그인하면 전체 공고 · 연락처
              </Link>
            ) : null}
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              <Link href={`/posts/${m.id}`} className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-[#1d2733]">
                공고 보기
              </Link>
              {mine ? (
                <button type="button" data-chat-edit onClick={() => setEditing((v) => !v)} className="rounded-full bg-[#1d2733] px-2.5 py-1 text-xs font-bold text-white">
                  ✏ 붙여넣고 갱신
                </button>
              ) : null}
              {loggedIn && phone && m.status === "open" && !mine ? (
                <a href={`sms:${phone.replace(/[^\d]/g, "")}?&body=${smsBody}`} data-chat-sms className="rounded-full bg-[#1d2733] px-2.5 py-1 text-xs font-bold text-white">
                  ✉ 문자 지원
                </a>
              ) : null}
            </span>
          </div>
          <span className="shrink-0 pb-0.5 text-[10px] text-[#3b4a5c]">
            {m.bumped ? "끌올 " : ""}
            {kst(m.at, { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        {editing ? (
          <div data-chat-edit-box className="grid w-full gap-1.5 rounded-2xl bg-white p-2 shadow-sm">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} aria-label="새 일정 붙여넣기" className="w-full rounded-xl border border-black/15 bg-[#f2f4f6] p-2 text-sm text-[#1d1d1d]" />
            <div className="flex items-center gap-2">
              <button type="button" data-chat-edit-save disabled={saving || draft.trim().length < 5} onClick={() => void saveEdit()} className="rounded-full bg-[#fee500] px-3 py-1.5 text-xs font-black text-[#1d1d1d] disabled:opacity-50">
                {saving ? "갱신 중…" : "갱신하고 맨 아래로"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-xs font-bold text-[#3b4a5c]">
                취소
              </button>
              {editNote ? <span className="text-xs font-bold text-[#b3261e]">{editNote}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 맨 아래 입력창: 카톡 공고를 붙여넣으면 바로 「빈자리 ○줄」 미리보기 → 보내기 = 공고 등록 */
function Composer({ loggedIn, defaultRegion, onSent }: { loggedIn: boolean; defaultRegion: string | null; onSent: () => void }) {
  const [text, setText] = useState("");
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const today = todayKst();
  const parsed = useMemo(() => (text.trim().length > 10 ? parseJobPost(text, today) : null), [text, today]);
  const slots = useMemo(() => (text.trim() ? slotsFromText(text, today).filter((s) => s.date >= today && !s.closed) : []), [text, today]);
  const placeRegions = useMemo(() => regionsIn(text), [text]);
  const pickRegion = region || placeRegions[0] || parsed?.region || "";
  if (!loggedIn) {
    return (
      <div className="border-t border-black/10 bg-white px-3 py-3 text-center">
        <Link href="/login?next=/boards/jobs/apply" className="inline-flex min-h-11 items-center rounded-full bg-[#fee500] px-5 text-sm font-black text-[#1d1d1d]">
          로그인하고 공고 올리기 · 연락처 보기
        </Link>
      </div>
    );
  }
  async function send() {
    if (!parsed) return;
    if (!pickRegion) {
      setNote("지역을 골라 주세요.");
      return;
    }
    setBusy(true);
    setNote(null);
    const company = parsed.companyName?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || null;
    const r = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardType: "JOBS",
        jobKind: "APPLY",
        content: text,
        jobLocation: [pickRegion, parsed.address].filter(Boolean).join(" ").slice(0, 60),
        jobCompanyName: company,
        jobPayAmount: parsed.payAmount,
        jobGuaranteedHours: parsed.guaranteedHours,
        jobTaxDeduction: parsed.taxDeduction ?? "없음",
        jobContact: parsed.contact,
        jobEvents: parsed.events,
        jobHeadcount: parsed.headcount,
        jobDressCode: parsed.dressCode,
        jobExperience: parsed.experience,
        jobApplyMethod: parsed.applyMethod,
      }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { id?: string; error?: string } | null;
    setBusy(false);
    if (!r?.ok || !j?.id) {
      setNote(j?.error ?? "올리지 못했어요. 잠시 뒤 다시 해 주세요.");
      return;
    }
    setText("");
    setNote("✅ 공고를 올렸어요!");
    onSent();
  }
  return (
    <div data-chat-composer className="grid gap-1.5 border-t border-black/10 bg-white px-2.5 py-2">
      {parsed ? (
        <p data-chat-preview className="rounded-lg bg-[#f2f4f6] px-2.5 py-1.5 text-xs text-[#1d2733]">
          <b>{parsed.companyName?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || "매장명 못 읽음"}</b> · 빈자리 <b>{slots.length}줄</b>
          {parsed.payAmount ? ` · 시급 ${Number(parsed.payAmount).toLocaleString("ko-KR")}` : ""}
          {parsed.taxDeduction === "공제" ? " · 3.3%" : ""}
          {parsed.contact ? ` · ${parsed.contact}` : " · ⚠️ 연락처 못 읽음"}
          {slots.length ? (
            <span className="mt-0.5 block truncate text-[11px] text-[#3b4a5c]">
              {slots.slice(0, 4).map((s) => `${Number(s.date.slice(5, 7))}/${Number(s.date.slice(8))} ${s.time ?? ""} ${s.count ?? ""}`.trim()).join(" · ")}
              {slots.length > 4 ? ` 외 ${slots.length - 4}` : ""}
            </span>
          ) : (
            <span className="mt-0.5 block text-[11px] text-[#b3261e]">날짜 줄을 못 읽었어요(예: 10월 18일 (일) PM 2:00 - 2명)</span>
          )}
          {placeRegions.length > 1 ? (
            <span data-chat-multi-region className="mt-0.5 block text-[11px] font-bold text-[#b3261e]">
              ⚠️ 지점이 {placeRegions.join(" · ")}에 걸쳐 있어요. 지점이 가장 많은 「{placeRegions[0]}」로 골랐어요 — 필요하면 왼쪽 지역을 바꿔 주세요.
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="flex items-end gap-1.5">
        <select
          value={pickRegion}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="지역"
          className="h-11 shrink-0 rounded-xl border border-black/15 !bg-white px-1.5 text-sm font-bold !text-[#1d2733] [color-scheme:light]"
        >
          <option value="">지역</option>
          {JOB_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={text ? 4 : 1}
          aria-label="공고 붙여넣기"
          placeholder="카톡 공고 붙여넣기"
          className="min-h-11 flex-1 resize-none rounded-xl border border-black/15 bg-[#f2f4f6] px-3 py-2.5 text-[15px] text-[#1d1d1d] placeholder:text-zinc-500"
        />
        <button
          type="button"
          data-chat-send
          disabled={busy || !parsed}
          onClick={() => void send()}
          aria-label="공고 올리기"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fee500] text-[#1d1d1d] disabled:opacity-40"
        >
          <SendHorizontalIcon className="size-5" />
        </button>
      </div>
      {note ? <p className="text-xs font-bold text-[#1d2733]">{note}</p> : null}
    </div>
  );
}
