import { AdToggles } from "@/components/admin/ad-toggles";
import { getSiteSettings } from "@/lib/site-settings";
import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { adsensePublisherId, adsenseSlotId, type AdSensePlacement } from "@/lib/adsense";

export const metadata: Metadata = { title: "애드센스 승인 점검", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 광고 자리 · Vercel 환경변수 이름 */
const PLACEMENTS: { key: AdSensePlacement; label: string; env: string }[] = [
  { key: "board-bottom", label: "게시판 · 공부 도구 · 랭킹 하단", env: "NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM" },
  { key: "post-bottom", label: "글 아래", env: "NEXT_PUBLIC_ADSENSE_SLOT_POST_BOTTOM" },
  { key: "sidebar", label: "PC 왼쪽 사이드", env: "NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR" },
  { key: "home-mid", label: "홈 중간", env: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID" },
  { key: "home-top", label: "홈 상단(대문 아래)", env: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP" },
  { key: "home-bottom", label: "홈 하단", env: "NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM" },
  { key: "post-top", label: "글 위", env: "NEXT_PUBLIC_ADSENSE_SLOT_POST_TOP" },
  { key: "post-mid", label: "긴 글 중간", env: "NEXT_PUBLIC_ADSENSE_SLOT_POST_MID" },
  { key: "infeed", label: "목록 사이", env: "NEXT_PUBLIC_ADSENSE_SLOT_INFEED" },
];

/** 애드센스 심사 때 보는 필수 페이지(이 사이트에 있는 것) */
const REQUIRED_PAGES = [
  { href: "/about", label: "사이트 소개" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
  { href: "/contact", label: "문의하기" },
  { href: "/operator", label: "운영자 소개" },
  { href: "/sitemap.xml", label: "사이트맵" },
  { href: "/robots.txt", label: "robots.txt" },
];

/** 며칠 전 시각(서버에서 요청마다 한 번) */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

/** 공개 글 수 기준(직접 쓴 글이 이만큼 있으면 심사에 유리) */
const GOOD_POSTS = 30;
/**
 * 실제 커뮤니티 게시판(메뉴 기준): 자유게시판(질문 · 현장 스케치는 자유게시판 안의 말머리) · 핸드리뷰.
 * 게시판마다 최소 글 수 · 최근 30일 새 글 최소
 */
const COMMUNITY_BOARDS = [
  { label: "자유게시판", types: ["FREE", "RULE_QA", "SKETCH"], write: "/boards/free/write", hint: "잡담 · 질문 · 현장 스케치 말머리 아무거나" },
  { label: "핸드리뷰", types: ["HAND_REVIEW"], write: "/boards/hand-review/write", hint: "핸드를 그려 투표받기" },
] as const;
/** 자유게시판 말머리(따로 세지 않고 자유게시판에 합침) */
const FREE_FAMILY = new Set<string>(["FREE", "RULE_QA", "SKETCH"]);
const BOARD_MIN = 5;
const RECENT_MIN = 10;

function Mark({ ok, warn }: { ok: boolean; warn?: boolean }) {
  return <span className="text-lg">{ok ? "✅" : warn ? "⚠️" : "❌"}</span>;
}

/** 관리자: 애드센스 승인 체크리스트(글 수 · 필수 페이지 · ads.txt · 광고 단위 ID) */
export default async function AdminAdsensePage() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const publicWhere = { hidden: false, isPrivate: false, isAttendanceThread: false };
  const since = daysAgo(30);
  const [byBoard, recent, adsTxt] = await Promise.all([
    prisma.post.groupBy({ by: ["boardType"], where: publicWhere, _count: { _all: true } }).catch(() => []),
    prisma.post.count({ where: { ...publicWhere, createdAt: { gte: since } } }).catch(() => 0),
    readFile(join(process.cwd(), "public", "ads.txt"), "utf8").catch(() => ""),
  ]);
  const total = byBoard.reduce((sum, b) => sum + b._count._all, 0);
  const pub = adsensePublisherId();
  const pubDigits = pub?.replace("ca-pub-", "") ?? "";
  const adsTxtOk = Boolean(pubDigits) && adsTxt.includes(`pub-${pubDigits}`);
  const slots = PLACEMENTS.map((p) => ({ ...p, set: Boolean(adsenseSlotId(p.key)) && Boolean(process.env[p.env]?.trim()) }));
  const slotCount = slots.filter((s) => s.set).length;

  // 승인 전 할 일: 부족한 것부터 짚어 줌
  const countOf = (types: readonly string[]) => byBoard.filter((b) => types.includes(b.boardType)).reduce((sum, b) => sum + b._count._all, 0);
  const todos: { text: string; href?: string; action?: string }[] = [];
  if (total < GOOD_POSTS) todos.push({ text: `공개 글을 ${GOOD_POSTS - total}개 더 올려 주세요(지금 ${total}개 · 권장 ${GOOD_POSTS}개 이상).` });
  for (const board of COMMUNITY_BOARDS) {
    const n = countOf(board.types);
    if (n < BOARD_MIN) todos.push({ text: `「${board.label}」에 글 ${BOARD_MIN - n}개 더(지금 ${n}개) — ${board.hint}.`, href: board.write, action: "글 쓰러 가기" });
  }
  if (recent < RECENT_MIN) todos.push({ text: `최근 30일 새 글이 ${recent}개예요. 일주일에 3~4개씩 꾸준히 올리면 「살아 있는 사이트」로 보여요.`, href: "/boards/free/write", action: "자유게시판에 쓰기" });
  if (!adsTxtOk) todos.push({ text: "ads.txt에 게시자 ID를 넣어 주세요(public/ads.txt)." });
  if (slotCount === 0) todos.push({ text: "승인 메일을 받으면: 광고 단위 3개(게시판 하단 · 글 아래 · PC 사이드)를 만들고 Vercel에 ID를 넣어 주세요." });
  // 글 수 표: 자유게시판 말머리(질문 · 현장 스케치)는 자유게시판에 합쳐서
  const boardRows = [
    { key: "FREE", label: "자유게시판(말머리 포함)", n: countOf([...FREE_FAMILY]) },
    ...byBoard.filter((b) => !FREE_FAMILY.has(b.boardType)).map((b) => ({ key: b.boardType, label: BOARD_LABELS[b.boardType as BoardTypeKey] ?? b.boardType, n: b._count._all })),
  ]
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);

  const card = "rounded-2xl border border-border bg-card p-3 sm:p-4";
  const viewer = await getCurrentUser().catch(() => null);
  const adsOff = (await getSiteSettings().catch(() => null))?.adsOff ?? [];
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">애드센스 승인 점검</h1>
        <p className="mt-1 text-sm text-muted-foreground">구글 애드센스 심사에서 보는 것들을 한눈에 확인합니다. ⚠️ · ❌ 항목부터 채워 주세요.</p>
      </header>

      {viewer?.isMaster ? (
        <section aria-label="광고 구좌 켜기 끄기" data-ad-toggles className={card}>
          <h2 className="text-lg font-semibold">🔌 광고 구좌 켜기 · 끄기</h2>
          <p className="mb-2 text-sm text-muted-foreground">구좌별로 바로 끄고 켤 수 있어요. 자체 배너 · 홍보 자리는 「배너」 메뉴에서 등록해요.</p>
          <AdToggles slots={[...slots.map((x) => ({ key: x.key, label: x.label, set: x.set })), { key: "sidebar", label: "PC 왼쪽 사이드(중복 표시용)", set: false }].filter((x, i, arr) => arr.findIndex((y) => y.key === x.key) === i)} off={adsOff} />
        </section>
      ) : null}

      <section aria-label="승인 전 할 일" data-adsense-todo className={`${card} border-amber-500/50`}>
        <h2 className="text-lg font-semibold">{todos.length ? `📝 승인 전 할 일 ${todos.length}가지` : "🎉 준비 끝 — 애드센스에서 검토 요청을 해 보세요"}</h2>
        {todos.length ? (
          <ol className="mt-2 grid list-decimal gap-1.5 pl-5 text-sm">
            {todos.map((t) => (
              <li key={t.text}>
                {t.text}
                {t.href ? (
                  <Link href={t.href} data-adsense-write className="ml-2 inline-flex min-h-8 items-center rounded-lg bg-primary px-2.5 text-xs font-bold text-primary-foreground">
                    {t.action} ›
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section aria-label="글 수" data-adsense-posts className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Mark ok={total >= GOOD_POSTS} warn={total >= 10} /> 공개 글 {total.toLocaleString()}개 <span className="text-xs font-normal text-muted-foreground">(권장 {GOOD_POSTS}개 이상 · 최근 30일 {recent}개)</span>
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">직접 쓴 글(복사 아님)이 꾸준히 올라오는 사이트가 잘 승인돼요. 홀덤 공부 도구 설명 글도 도움이 됩니다.</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
          {boardRows.map((b) => (
            <li key={b.key} className="flex justify-between rounded-lg bg-background px-2 py-1">
              <span>{b.label}</span>
              <b>{b.n}</b>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="필수 페이지" data-adsense-pages className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Mark ok /> 필수 페이지
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {REQUIRED_PAGES.map((p) => (
            <li key={p.href}>
              <Link href={p.href} target="_blank" className="inline-flex min-h-9 items-center rounded-lg border border-border px-2.5 hover:bg-white/5">
                ✅ {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="ads.txt" data-adsense-adstxt className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Mark ok={adsTxtOk} /> ads.txt · 게시자 ID
        </h2>
        <p className="mt-1 text-sm">
          게시자 ID <b>{pub ?? "없음"}</b> · ads.txt {adsTxtOk ? "에 이 ID가 들어 있어요" : "에 이 ID가 없어요(public/ads.txt 확인)"}{" "}
          <Link href="/ads.txt" target="_blank" className="text-primary underline">
            열어 보기
          </Link>
        </p>
      </section>

      <section aria-label="광고 단위" data-adsense-slots className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Mark ok={slotCount >= 3} warn={slotCount > 0} /> 광고 단위 ID {slotCount}/{PLACEMENTS.length}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">승인 후 애드센스 → 광고 → 광고 단위 기준에서 「디스플레이 광고」를 만들고, Vercel → Settings → Environment Variables에 숫자 ID를 넣은 뒤 다시 배포하세요. 위 3개만 넣어도 충분해요.</p>
        <ul className="mt-2 grid gap-1 text-sm">
          {slots.map((s) => (
            <li key={s.key} className="flex flex-wrap items-center gap-2 rounded-lg bg-background px-2 py-1.5">
              <span>{s.set ? "✅" : "⬜"}</span>
              <span className="min-w-0 flex-1">{s.label}</span>
              <code className="text-xs text-muted-foreground">{s.env}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="자동 광고 제외" className={card}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Mark ok={false} warn /> 자동 광고를 켠다면: 업무 화면 제외(직접)
        </h2>
        <p className="mt-1 text-sm">
          애드센스 → 광고 → 사이트 → 자동 광고 → <b>페이지 제외</b>에 <code>pokerwiki.co.kr/r/*</code>, <code>/g/*</code>, <code>/tools/*</code>를 넣어 TV 교대표 · 현황판 위에 광고가 뜨지 않게 해 주세요.
        </p>
      </section>
    </div>
  );
}
