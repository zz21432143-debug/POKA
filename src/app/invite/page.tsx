import type { Metadata } from "next";
import Link from "next/link";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { InviteShare } from "@/components/invite/invite-share";
import { getCurrentUser } from "@/lib/current-user";
import {
  INVITE_MONTHLY_CAP,
  INVITEE_POINTS,
  INVITER_EXP,
  INVITER_POINTS,
  inviteStats,
  myInviteCode,
} from "@/lib/invite";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "친구 초대 — 친구 첫 출석하면 둘 다 포인트",
  description: `POKA에 친구를 초대하세요. 초대 링크로 가입한 친구가 첫 출석하면 나는 ${INVITER_POINTS}P, 친구는 ${INVITEE_POINTS}P.`,
  alternates: { canonical: "/invite" },
  robots: { index: false },
};
export const dynamic = "force-dynamic";

/** 친구 초대: 내 초대 링크 · QR · 초대한 친구 수 */
export default async function InvitePage() {
  const user = await getCurrentUser().catch(() => null);
  const code = user ? await myInviteCode(user.id).catch(() => null) : null;
  const stats = user ? await inviteStats(user.id) : null;
  const link = code ? `${siteUrl()}/i/${code}` : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.study}>친구 초대</BoardTitle>
        <p className="mt-2">
          내 초대 링크로 가입한 친구가 <b className="text-white">첫 출석</b>을
          하면 나는{" "}
          <b className="text-[#f5d76e]">
            +{INVITER_POINTS}P · EXP +{INVITER_EXP}
          </b>
          , 친구는 <b className="text-[#f5d76e]">+{INVITEE_POINTS}P</b>를
          받아요.
        </p>
      </header>

      <section
        aria-label="내 초대 링크"
        className="lounge-card grid gap-3 rounded-[1.35rem] p-4"
      >
        {user && link ? (
          <>
            <h2 className="text-base font-black text-[#f3d9a4]">
              내 초대 링크
            </h2>
            <InviteShare
              link={link}
              nickname={user.nickname}
              gift={INVITEE_POINTS}
            />
          </>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-[#d1c7b5]">
              로그인하면 나만의 초대 링크와 QR이 생겨요.
            </p>
            <Link
              href="/login?next=/invite"
              className="inline-flex min-h-11 w-fit items-center rounded-xl bg-[#7a1c22] px-4 text-sm font-black text-[#f6efe2]"
            >
              로그인하고 초대 링크 받기
            </Link>
          </div>
        )}
      </section>

      {stats ? (
        <section
          aria-label="내가 초대한 친구"
          data-invite-stats
          className="ink-panel grid gap-2 rounded-2xl p-4"
        >
          <h2 className="text-base font-black text-[#f3d9a4]">
            내가 초대한 친구
          </h2>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-black/30 p-2">
              <dt className="text-[11px] text-zinc-400">가입(출석 전)</dt>
              <dd className="text-xl font-black text-white tabular-nums">
                {stats.pending}
              </dd>
            </div>
            <div className="rounded-xl bg-black/30 p-2">
              <dt className="text-[11px] text-zinc-400">첫 출석 완료</dt>
              <dd className="text-xl font-black text-emerald-300 tabular-nums">
                {stats.done}
              </dd>
            </div>
            <div className="rounded-xl bg-black/30 p-2">
              <dt className="text-[11px] text-zinc-400">받은 포인트</dt>
              <dd className="text-xl font-black text-[#f5d76e] tabular-nums">
                {stats.earned.toLocaleString()}P
              </dd>
            </div>
          </dl>
          {stats.pending ? (
            <p className="text-xs text-zinc-400">
              가입한 친구에게 「출석체크 한 번만 해 줘」라고 말해 주세요. 그때
              둘 다 포인트가 들어가요.
            </p>
          ) : null}
        </section>
      ) : null}

      <section
        aria-label="초대 규칙"
        className="ink-panel grid gap-1 rounded-2xl p-4 text-sm text-[#d1c7b5]"
      >
        <h2 className="text-base font-black text-[#f3d9a4]">이렇게 받아요</h2>
        <ol className="grid list-decimal gap-1 pl-5">
          <li>내 초대 링크나 QR을 친구에게 보내요.</li>
          <li>친구가 그 링크로 들어와 30일 안에 가입해요(카카오 · 구글).</li>
          <li>
            친구가 출석체크를 처음 하면 두 사람 모두에게 포인트가 바로 들어가요.
          </li>
        </ol>
        <p className="mt-2 text-xs text-zinc-400">
          초대 보상은 30일에 {INVITE_MONTHLY_CAP}명까지예요(친구 선물은 그대로).
          나와 같은 곳(같은 인터넷)에서 가입한 계정은 보상이 없어요.
        </p>
      </section>
    </div>
  );
}
