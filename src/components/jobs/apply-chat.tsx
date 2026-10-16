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
import type { JobKind } from "@/generated/prisma/enums";

/** 날짜 줄(빈자리)이 있는 분류 — 고정 · 팀은 날짜 없이 올림 */
const DATED: JobKind[] = ["APPLY", "TOURNAMENT", "URGENT"];
const HOURLY = DATED;

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

/** 말풍선 본문: 지난 날짜 줄은 흐리게(3줄 넘으면 접기) · 「마감」 줄 줄긋기 · 전화번호는 누르면 전화 */
function Body({ text, today }: { text: string; today: string }) {
  const [showPast, setShowPast] = useState(false);
  const lines = text.split(/\r?\n/);
  const pastAt = lines.map((line) => {
    const d = lineDate(line, today);
    return Boolean(d && d < today);
  });
  const pastCount = pastAt.filter(Boolean).length;
  const fold = pastCount >= 3 && !showPast;
  return (
    <>
      {fold ? (
        <button type="button" data-chat-past onClick={() => setShowPast(true)} className="mb-1 rounded-md bg-black/5 px-2 py-0.5 text-[11.5px] font-bold text-zinc-500">
          지난 일정 {pastCount}줄 접힘 · 보기
        </button>
      ) : null}
      {lines.map((line, i) => {
        const d = lineDate(line, today);
        const past = pastAt[i];
        if (past && fold) return null;
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
  kind = "APPLY",
  slug = "apply",
  title = "지원 딜러 구인",
  initial,
  region,
  loggedIn,
  myNickname,
}: {
  kind?: JobKind;
  slug?: string;
  title?: string;
  initial: ChatMessage[];
  region: string | null;
  loggedIn: boolean;
  myNickname: string | null;
}) {
  const [onlyMine, setOnlyMine] = useState(false);
  // 입력창이 화면에 보이면 떠 있는 「공고 올리기」는 숨김
  const [composerSeen, setComposerSeen] = useState(false);
  useEffect(() => {
    const el = document.querySelector("[data-chat-composer]");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setComposerSeen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [moreBusy, setMoreBusy] = useState(false);
  const [noMore, setNoMore] = useState(initial.length < 30);
  const [fresh, setFresh] = useState(0);
  // 새 공고가 오면 탭 제목에 숫자(다른 탭을 보고 있어도 알 수 있게)
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = fresh ? `(${fresh}) ${base}` : base;
  }, [fresh]);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const today = todayKst();
  const q = `&kind=${slug}${region ? `&region=${encodeURIComponent(region)}` : ""}`;
  const isMine = (m: ChatMessage) => Boolean(myNickname && m.author?.nickname === myNickname);

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
      if (onlyMine && !isMine(m)) continue;
      const k = dayKey(m.at);
      if (k !== prev) {
        out.push({ kind: "day", key: k, label: kst(m.at, { year: "numeric", month: "long", day: "numeric", weekday: "long" }) });
        prev = k;
      }
      out.push({ kind: "msg", m });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isMine은 myNickname만 봄
  }, [messages, onlyMine, myNickname]);

  return (
    <div data-apply-chat className="flex flex-col overflow-hidden rounded-2xl border border-[#3b4a5c] bg-[#b2c7d9]">
      {/* 채팅방 머리 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 bg-[#a9bdce] px-3 py-2 text-[#1d2733]">
        <b className="whitespace-nowrap text-[15px] sm:text-base">💬 {title.replace(/ 구인$/, "")} 오픈채팅</b>
        <span className="whitespace-nowrap text-xs font-bold text-[#3b4a5c]">{region ? `${region} · ` : ""}공고 {messages.length}</span>
        <span className="ml-auto flex gap-1.5 whitespace-nowrap">
          {myNickname && messages.some(isMine) ? (
            <button
              type="button"
              data-chat-only-mine
              aria-pressed={onlyMine}
              onClick={() => setOnlyMine((v) => !v)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-black", onlyMine ? "bg-[#fee500] text-[#1d1d1d]" : "bg-white/70 text-[#1d2733]")}
            >
              {onlyMine ? "✓ 내 공고만" : "내 공고만"}
            </button>
          ) : null}
          {DATED.includes(kind) ? (
            <Link href={region ? `/boards/jobs/slots?region=${encodeURIComponent(region)}` : "/boards/jobs/slots"} className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black text-[#1d2733]">
              📅 날짜별로 보기
            </Link>
          ) : null}
        </span>
      </div>
      <div className="relative">
      {/* 가운데 반투명 POKA 마크(카톡 배경처럼 · 누르기는 통과) */}
      <div aria-hidden data-chat-watermark className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="flex flex-col items-center gap-2 opacity-[0.16]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-flame.png" alt="" width={96} height={96} className="size-24 rounded-3xl object-cover grayscale" />
          <span className="text-5xl font-black tracking-tight text-[#1d2733]">POKA</span>
        </span>
      </div>
      <div ref={listRef} className="relative flex max-h-[68dvh] min-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain px-2.5 py-3">
        {!noMore ? (
          <button type="button" onClick={() => void loadOlder()} disabled={moreBusy} className="mx-auto rounded-full bg-black/15 px-3 py-1 text-xs font-bold text-[#1d2733]">
            {moreBusy ? "불러오는 중…" : "⬆ 이전 공고 더 보기"}
          </button>
        ) : null}
        {rows.length === 0 ? <p className="py-10 text-center text-sm text-[#1d2733]">{onlyMine ? "이 채팅방에 내 공고가 없어요." : "아직 올라온 공고가 없어요. 아래에 카톡 공고를 붙여넣어 첫 공고를 올려 보세요."}</p> : null}
        {rows.map((r) =>
          r.kind === "day" ? (
            <p key={`d-${r.key}`} className="mx-auto my-1 rounded-full bg-black/15 px-3 py-0.5 text-[11px] font-bold text-white">
              {r.label}
            </p>
          ) : (
            <ChatBubble
              key={r.m.id}
              m={r.m}
              mine={isMine(r.m)}
              today={today}
              loggedIn={loggedIn}
              slug={slug}
              always={!DATED.includes(kind)}
              onLogo={(id, url) => setMessages((old) => old.map((x) => (x.id === id ? { ...x, logoUrl: url } : x)))}
              onEdited={(id, text) => {
                setMessages((old) => old.map((x) => (x.id === id ? { ...x, text } : x)));
                void pullNew(true);
              }}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>
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
      {loggedIn ? <FirstTip /> : null}
      {loggedIn && !composerSeen ? (
        <button
          type="button"
          data-chat-fab
          onClick={() => {
            const box = document.querySelector<HTMLTextAreaElement>("[data-chat-composer] textarea");
            box?.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => box?.focus(), 350);
          }}
          className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 inline-flex h-13 items-center gap-1.5 rounded-full bg-[#fee500] px-5 text-[15px] font-black text-[#1d1d1d] shadow-[0_6px_18px_rgba(0,0,0,.55)] ring-2 ring-black/20 sm:hidden"
        >
          ✏️ 공고 올리기
        </button>
      ) : null}
      <Composer
        kind={kind}
        slug={slug}
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

function ChatBubble({ m, mine, today, loggedIn, slug, always, onEdited, onLogo }: { m: ChatMessage; mine: boolean; today: string; loggedIn: boolean; slug: string; always: boolean; onEdited: (id: string, text: string) => void; onLogo: (id: string, url: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  // 매장 로고: 그림 올리기 → 이 매장 공고 말풍선 옆에(다른 사람 화면)
  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setEditNote(null);
    const form = new FormData();
    form.append("file", file);
    const up = await fetch("/api/uploads/image", { method: "POST", body: form }).catch(() => null);
    const uj = (await up?.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!up?.ok || !uj?.url) {
      setLogoBusy(false);
      setEditNote(uj?.error ?? "그림을 올리지 못했어요.");
      return;
    }
    const r = await fetch("/api/jobs/store-logo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: m.id, url: uj.url }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setLogoBusy(false);
    if (!r?.ok) {
      setEditNote(j?.error ?? "로고를 저장하지 못했어요.");
      return;
    }
    onLogo(m.id, uj.url);
    setEditNote("✅ 로고를 올렸어요. 다른 사람 화면에서 말풍선 옆에 보여요.");
  }
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
        <img src={m.logoUrl ?? m.author?.markUrl ?? "/marks/default.svg"} alt={m.logoUrl ? `${m.company ?? "매장"} 로고` : ""} onError={(e) => { const img = e.currentTarget; if (!img.src.endsWith("/marks/default.svg")) img.src = "/marks/default.svg"; }} width={36} height={36} className="mt-0.5 size-9 shrink-0 rounded-2xl bg-white object-cover" />
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
            {m.status === "closed" ? (
              <span className="mb-1 inline-block rounded bg-zinc-300 px-1.5 text-[11px] font-black text-zinc-700">마감</span>
            ) : always ? (
              <span data-chat-always className="mb-1 inline-block rounded bg-[#e8f5e9] px-1.5 text-[11px] font-black text-[#1b5e20]">상시 모집</span>
            ) : null}
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
              <Link href={`/login?next=/boards/jobs/${slug}`} className="mt-1 block text-xs font-bold text-[#0b57d0]">
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
              {mine && m.company ? (
                <label data-chat-logo className="cursor-pointer rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold text-[#1d2733]">
                  {logoBusy ? "올리는 중…" : m.logoUrl ? "🏪 로고 바꾸기" : "🏪 로고 올리기"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={logoBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadLogo(f);
                    }}
                  />
                </label>
              ) : null}
              {loggedIn && phone && m.status === "open" && !mine ? (
                <a href={`sms:${phone.replace(/[^\d]/g, "")}?&body=${smsBody}`} data-chat-sms className="rounded-full bg-[#1d2733] px-2.5 py-1 text-xs font-bold text-white">
                  ✉ 문자 지원
                </a>
              ) : null}
            </span>
          </div>
          <span className="shrink-0 pb-0.5 text-[11px] text-[#3b4a5c]">
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
        {!editing && editNote ? <span className="text-xs font-bold text-[#1d2733]">{editNote}</span> : null}
      </div>
    </div>
  );
}

/** 처음 온 사람에게 한 번: 올리는 법 3단계(닫으면 다시 안 보임) */
function FirstTip() {
  const KEY = "poka-job-chat-tip-v1";
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 「닫음」은 브라우저에서만 읽을 수 있음
      setShow(!localStorage.getItem(KEY));
    } catch {
      /* 저장소를 못 쓰면 안 보여 줌 */
    }
  }, []);
  if (!show) return null;
  return (
    <div data-chat-tip className="flex items-start gap-2 border-t border-black/10 bg-[#fff8c4] px-3 py-2 text-[12.5px] text-[#1d1d1d]">
      <span className="grid flex-1 gap-0.5">
        <b>처음이세요? 공고 올리는 법</b>
        <span>① 카톡 공고를 길게 눌러 복사 → ② 아래 칸에 그대로 붙여넣기 → ③ 노란 ➤ 보내기</span>
        <span className="text-[#5a4a00]">날짜 줄 · 시급 · 연락처는 자동으로 읽어요. 일정이 바뀌면 내 말풍선 「붙여넣고 갱신」.</span>
      </span>
      <button
        type="button"
        aria-label="안내 닫기"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* 무시 */
          }
        }}
        className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold"
      >
        닫기
      </button>
    </div>
  );
}

/** 맨 아래 입력창: 카톡 공고를 붙여넣으면 바로 「빈자리 ○줄」 미리보기 → 보내기 = 공고 등록 */
function Composer({ kind, slug, loggedIn, defaultRegion, onSent }: { kind: JobKind; slug: string; loggedIn: boolean; defaultRegion: string | null; onSent: () => void }) {
  const dated = DATED.includes(kind);
  const [existingId, setExistingId] = useState<string | null>(null);
  // 처음 공고를 올리면 한 번: 내 공고 관리 안내
  const [mineTip, setMineTip] = useState(false);
  const [text, setText] = useState("");
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const today = todayKst();
  const parsed = useMemo(() => (text.trim().length > 10 ? parseJobPost(text, today) : null), [text, today]);
  const slots = useMemo(() => (dated && text.trim() ? slotsFromText(text, today).filter((s) => s.date >= today && !s.closed) : []), [dated, text, today]);
  const placeRegions = useMemo(() => regionsIn(text), [text]);
  const pickRegion = region || placeRegions[0] || parsed?.region || "";
  if (!loggedIn) {
    return (
      <div className="border-t border-black/10 bg-white px-3 py-3 text-center">
        <Link href={`/login?next=/boards/jobs/${slug}`} className="inline-flex min-h-11 items-center rounded-full bg-[#fee500] px-5 text-sm font-black text-[#1d1d1d]">
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
    setExistingId(null);
    const company = parsed.companyName?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || null;
    const r = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardType: "JOBS",
        jobKind: kind,
        content: text,
        jobPayType: HOURLY.includes(kind) ? undefined : parsed.payType,
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
    const j = (await r?.json().catch(() => null)) as { id?: string; error?: string; existingId?: string } | null;
    setBusy(false);
    if (!r?.ok || !j?.id) {
      setNote(j?.error ?? "올리지 못했어요. 잠시 뒤 다시 해 주세요.");
      // 같은 매장 공고가 이미 있으면: 그 공고를 이 내용으로 바로 갱신
      if (j?.existingId) setExistingId(j.existingId);
      return;
    }
    setText("");
    setNote("✅ 공고를 올렸어요!");
    try {
      if (!localStorage.getItem("poka-job-mine-tip-v1")) {
        localStorage.setItem("poka-job-mine-tip-v1", "1");
        setMineTip(true);
      }
    } catch {
      /* 저장소를 못 쓰면 안내 생략 */
    }
    onSent();
  }
  async function refreshExisting() {
    if (!existingId) return;
    setBusy(true);
    const r = await fetch(`/api/posts/${existingId}/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!r?.ok) {
      setNote(j?.error ?? "갱신하지 못했어요.");
      return;
    }
    setExistingId(null);
    setText("");
    setNote("✅ 기존 공고를 새 내용으로 갱신했어요!");
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
          {!dated ? null : slots.length ? (
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
      {mineTip ? (
        <p data-chat-mine-tip className="rounded-lg bg-[#fff8c4] px-2.5 py-1.5 text-xs text-[#1d1d1d]">
          💡 <b>내 공고 관리</b>에서 매장 로고 올리기 · 날짜 줄 하나씩 마감 · 끌어올리기를 할 수 있어요.{" "}
          <Link href="/boards/jobs/mine" className="font-bold text-[#0b57d0] underline">
            내 공고 관리 열기
          </Link>
        </p>
      ) : null}
      {existingId ? (
        <button type="button" data-chat-refresh-existing disabled={busy} onClick={() => void refreshExisting()} className="justify-self-start rounded-full bg-[#1d2733] px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
          ✏ 기존 공고를 이 내용으로 갱신하고 맨 아래로
        </button>
      ) : null}
    </div>
  );
}
