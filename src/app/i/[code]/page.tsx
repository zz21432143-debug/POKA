import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { INVITE_CODE_RE, INVITEE_POINTS, inviterByCode } from "@/lib/invite";

export const dynamic = "force-dynamic";

/** 카톡 · SNS 미리보기: 「○○님이 POKA에 초대했어요 · 가입 선물」 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const inviter = INVITE_CODE_RE.test(code.toLowerCase())
    ? await inviterByCode(code).catch(() => null)
    : null;
  const title = inviter
    ? `${inviter.nickname}님이 POKA에 초대했어요 🎁`
    : "POKA 홀덤·딜러 커뮤니티";
  const description = `가입하고 첫 출석하면 ${INVITEE_POINTS}P 선물! 급구·대타 알림, 무료 홀덤 도구, 오늘의 퀴즈, 요괴 키우기.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/i/${code}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

const FEATURES = [
  {
    icon: "🔔",
    title: "급구 · 대타 알림",
    body: "내 지역 딜러 급구가 올라오면 바로 휴대폰으로",
  },
  {
    icon: "🧮",
    title: "무료 홀덤 도구",
    body: "푸시폴드 차트 · 승률 · ICM · 팟 계산 연습",
  },
  {
    icon: "🧩",
    title: "오늘의 퀴즈",
    body: "아침 · 저녁 9시 새 문제, 맞히면 포인트",
  },
  {
    icon: "🏮",
    title: "요괴 마을",
    body: "활동할수록 요괴가 찾아오고 진화해요",
  },
];

/** 친구 초대 받는 화면: 누가 초대했는지 · 가입 선물 · POKA 소개 → 가입 */
export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const valid = INVITE_CODE_RE.test(code.toLowerCase());
  const inviter = valid ? await inviterByCode(code).catch(() => null) : null;
  if (!inviter) redirect("/");
  const user = await getCurrentUser().catch(() => null);
  return (
    <article
      data-invite-landing
      className="mx-auto flex w-full max-w-md flex-col gap-4"
    >
      <section className="lounge-card grid gap-3 rounded-[1.5rem] p-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- 마스코트 */}
        <img
          src="/icons/poka-512.png"
          alt="POKA"
          className="mx-auto size-24 rounded-3xl"
        />
        <p className="text-sm font-bold text-[#e7c98a]">🤝 친구 초대</p>
        <h1 className="text-2xl leading-snug font-black text-white">
          <span className="text-[#f5d76e]">{inviter.nickname}</span>님이
          <br />
          POKA에 초대했어요
        </h1>
        <p className="rounded-2xl border border-[#FEE500]/40 bg-[#FEE500]/10 px-3 py-2 text-sm font-bold text-[#fff3a8]">
          🎁 가입하고 첫 출석하면 <b className="text-lg">{INVITEE_POINTS}P</b>{" "}
          선물 · {inviter.nickname}님도 함께 받아요
        </p>
        {user ? (
          <>
            <p className="text-sm text-zinc-300">
              이미 POKA 회원이시네요! 초대 선물은 새로 가입한 친구만 받을 수
              있어요.
            </p>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#7a1c22] text-base font-black text-[#f6efe2]"
            >
              POKA 홈으로
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login?tab=signup"
              data-invite-signup
              className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-[#FEE500] text-base font-black text-black"
            >
              카카오 · 구글로 3초 가입하기
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#c9a25c]/50 text-sm font-bold text-[#f3d9a4]"
            >
              먼저 둘러보기
            </Link>
            <p className="text-xs text-zinc-400">
              초대는 30일 동안 기억돼요. 둘러보다가 나중에 가입해도 선물을
              받아요.
            </p>
          </>
        )}
      </section>
      <section
        aria-label="POKA에서 할 수 있는 것"
        className="ink-panel grid gap-2 rounded-2xl p-4"
      >
        <h2 className="text-base font-black text-[#f3d9a4]">
          POKA는 홀덤 딜러 · 홀덤인 커뮤니티예요
        </h2>
        <ul className="grid gap-2">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="flex items-start gap-3 rounded-xl bg-black/30 p-3"
            >
              <span className="text-2xl" aria-hidden>
                {f.icon}
              </span>
              <span className="grid">
                <b className="text-sm font-black text-white">{f.title}</b>
                <span className="text-xs text-zinc-300">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
