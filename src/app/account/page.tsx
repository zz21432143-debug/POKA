import type { Metadata } from "next";
import { AccountPrivacyPanel } from "@/components/account/account-privacy-panel";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { replaceToLogin } from "@/lib/history-redirect";
import { logoutAllAction } from "@/lib/logout-action";
import { HonorShelf } from "@/components/user/honor-shelf";
import { ProfileYokai } from "@/components/yokai/profile-yokai";
import { YokaiNudge } from "@/components/yokai/yokai-nudge";
import { MyRankList } from "@/components/user/my-rank-list";
import { getMyRanks } from "@/lib/my-rank";

export const metadata: Metadata = { title: "내 정보", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) replaceToLogin("/account");
  const [links, me] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { kakaoId: true, googleId: true } }).catch(() => null),
    prisma.user.findUnique({ where: { id: user.id }, select: { id: true, nickname: true, level: true, exp: true, isMaster: true } }).catch(() => null),
  ]);
  const ranks = me ? await getMyRanks(me).catch(() => null) : null;

  return (
    <article className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">내 정보</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          닉네임·이메일을 확인하고, 닉네임을 바꿀 수 있습니다. 탈퇴는 별도 화면입니다.
        </p>
      </header>
      {/* 내 칭호 · 내 랭킹 */}
      <div id="my-honor" className="grid scroll-mt-24 gap-2">
        <YokaiNudge />
        <ProfileYokai userId={user.id} viewerIsMaster={Boolean(user.isMaster)} />
        <HonorShelf userId={user.id} nickname={user.nickname} mine />
        <a href="/games" data-account-games className="flex min-h-12 items-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3 text-sm font-black text-sky-200">
          🎮 요괴 게임방
          <span className="ml-auto text-xs font-bold text-sky-300">요괴 오목 · 친구 대전 ›</span>
        </a>
        <a href="/invite" data-account-invite className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#FEE500]/40 bg-[#FEE500]/10 px-3 text-sm font-black text-[#fff3a8]">
          🤝 친구 초대하고 포인트 받기
          <span className="ml-auto text-xs font-bold text-[#e7c98a]">친구 첫 출석 시 둘 다 선물 ›</span>
        </a>
        {ranks ? (
          <section aria-label="내 랭킹" className="grid gap-2 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#e7c98a]">내 랭킹</h2>
              <a href="/ranking" className="tap-pad relative ml-auto text-xs font-bold text-[#c9a25c]">
                전체 랭킹 ›
              </a>
            </div>
            <MyRankList ranks={ranks} />
            <p className="text-[11px] text-zinc-500">회원 전체에서의 정확한 순위예요(20위 밖도). ▲▼는 이번 주 시작 때보다 오르내린 계단 수예요.</p>
          </section>
        ) : null}
      </div>
      <AccountPrivacyPanel
        nickname={user.nickname}
        email={user.email}
        changeCount={user.nicknameChangeCount}
        tickets={user.nicknameTickets}
      />
      <section className="rounded-xl border border-white/10 bg-[#151213] p-4 text-sm">
        <h2 className="font-semibold text-[#E5E7EB]">연결된 로그인</h2>
        <dl className="mt-2 grid grid-cols-[5rem_1fr] gap-y-1.5 text-[#cfd2d6]">
          <dt className="text-muted-foreground">카카오</dt>
          <dd className="break-all">{links?.kakaoId ? `연결됨 · 회원번호 ${links.kakaoId}` : "연결 안 됨"}</dd>
          <dt className="text-muted-foreground">구글</dt>
          <dd>{links?.googleId ? "연결됨" : "연결 안 됨"}</dd>
        </dl>
      </section>
      <section aria-label="로그인 보안" className="rounded-xl border border-white/10 bg-[#151213] p-4 text-sm">
        <h2 className="font-semibold text-[#E5E7EB]">로그인 보안</h2>
        <p className="mt-1 text-[#cfd2d6]">휴대폰을 잃어버렸거나 다른 사람 기기에서 로그인했다면, 이 기기를 포함한 모든 기기에서 로그아웃하세요.</p>
        <form action={logoutAllAction} className="mt-3">
          <button type="submit" data-logout-all className="touch-target inline-flex min-h-11 items-center rounded-xl border border-rose-500/60 px-4 text-sm font-bold text-rose-200 hover:bg-rose-500/10">
            모든 기기에서 로그아웃
          </button>
        </form>
      </section>
    </article>
  );
}
