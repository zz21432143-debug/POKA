import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/current-user";
import { replaceTo } from "@/lib/history-redirect";
import { safeNextPath } from "@/lib/oauth-consent";
import { cn } from "cn";
import { ATTENDANCE_POINTS, STREAK_MILESTONES } from "@/lib/rewards";

// 내용이 거의 없는 화면이라 검색에서 뺌(애드센스 품질 평가)
export const metadata: Metadata = { title: "로그인 · 회원가입", robots: { index: false, follow: true } };

export const dynamic = "force-dynamic";

const LOGIN_ERRORS: Record<string, string> = {
  consent: "만 19세 확인, 이용약관, 개인정보 수집·이용에 모두 동의한 뒤 카카오 또는 구글로 시작해 주세요.",
  need_signup: "아직 가입되지 않은 계정입니다. 회원가입 탭에서 동의 후 가입해 주세요.",
  restricted: "이용이 제한된 계정입니다.",
  kakao: "카카오 로그인에 실패했습니다. 다시 시도해 주세요.",
  google: "구글 로그인에 실패했습니다. 다시 시도해 주세요.",
  kakao_not_configured: "카카오 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았습니다. 운영자에게 문의하세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; tab?: string; msg?: string }>;
}) {
  const user = await getCurrentUser().catch(() => null);
  const { next, error, tab, msg } = await searchParams;
  // "//다른사이트" 같은 주소로 튕겨 나가지 않도록 사이트 안 경로만 받습니다.
  const nextPath = safeNextPath(next);
  if (user) replaceTo(nextPath);
  const signup = tab === "signup";
  const errorMessage = msg?.trim()
    ? msg
    : error
      ? (LOGIN_ERRORS[error] ?? "로그인에 실패했습니다. 다시 시도해 주세요.")
      : null;
  const nextQuery = nextPath !== "/" ? `&next=${encodeURIComponent(nextPath)}` : "";

  // 출석체크 · 요괴 · 퀴즈처럼 회원 혜택 화면에서 왔으면 무엇을 받는지 먼저 보여 줌
  const fromAttendance = nextPath.startsWith("/attendance");
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
    <section data-login-perks className="rounded-[1.5rem] border border-[#c9a25c]/50 bg-[#c9a25c]/10 p-4">
      <h2 className="text-base font-black text-[#f3d9a4]">{fromAttendance ? "📅 출석체크는 회원이면 매일 포인트" : "가입하면 이런 게 생겨요"}</h2>
      <ul className="mt-2 grid gap-1 text-sm text-[#ece4d6]">
        <li>✅ 매일 출석 <b className="text-[#ffcf4a]">+{ATTENDANCE_POINTS}P</b></li>
        <li>🔥 연속 출석 보너스 {STREAK_MILESTONES.map((m) => `${m.day}일 +${m.points}P`).join(" · ")}</li>
        <li>⭐ 글 · 댓글 · 퀴즈로 경험치 · 레벨업, 포인트로 마크 · 꾸미기</li>
        <li>🛠 딜러 로테이션 · 게임 현황판 등 매장 관리 도구 무료</li>
      </ul>
    </section>
    <article className="lounge-card w-full rounded-[1.5rem] p-5">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        <Link
          href={`/login?tab=login${nextQuery}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full text-sm font-semibold",
            !signup ? "bg-[#8b2222] text-white shadow-sm" : "text-muted-foreground",
          )}
        >
          로그인
        </Link>
        <Link
          href={`/login?tab=signup${nextQuery}`}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-full text-sm font-semibold",
            signup ? "bg-[#8b2222] text-white shadow-sm" : "text-muted-foreground",
          )}
        >
          회원가입
        </Link>
      </div>
      <h1 className="mt-5 text-2xl font-semibold">{signup ? "회원가입" : "로그인"}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {signup
          ? "만 19세 이상만 가입할 수 있습니다. 카카오 또는 구글로만 가입하며, 아래 필수 동의 3개를 모두 체크해야 진행됩니다."
          : "카카오 또는 구글로만 로그인합니다. 처음이라면 회원가입 탭에서 동의 후 가입해 주세요."}
      </p>
      {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}
      <div className="mt-5">
        <AuthForm nextPath={nextPath} mode={signup ? "signup" : "login"} />
      </div>
    </article>
    </div>
  );
}
