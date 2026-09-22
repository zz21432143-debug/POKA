import Link from "next/link";
import { BOARD_NAV } from "@/lib/nav";

const FORM_SECTIONS = [
  {
    title: "기본 정보",
    fields: [
      "공고 제목 (Text)",
      "구인 포지션 Checkbox 중복 — Dealer / Floor / Chips / 기타 스태프",
      "근무 지역 Checkbox — 수도권 / 영남권 / 충청권 / 호남권 / 강원·제주 / 해외",
      "근무 형태 Radio — 정규팀 소속 / 정기 프리랜서 / 단기 이벤트 스태프",
    ],
  },
  {
    title: "조건 및 혜택",
    fields: [
      "경력 요건 Radio — 초보 가능(교육 지원) / 경력자 우대 / 대회 경험 필수",
      "급여 조건 Radio + 금액 — 일급 / 시급 / 건당 / 추후 협의",
      "복리후생 Checkbox — 숙소 / 교통비 / 식사 / 교육 / 급여 선지급",
    ],
  },
  {
    title: "지원 및 접수",
    fields: [
      "지원 방법 Radio + Input — 외부 링크 / 카카오톡 / 전화·문자 / 사이트 내 직접 지원",
      "마감일 Date picker 또는 상시 모집 Checkbox",
    ],
  },
] as const;

export default function PlanPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-sm text-primary">POKA 웹사이트 기획서</p>
        <h1 className="mt-1 text-3xl font-semibold">딜러 구인·구직 플랫폼 IA</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          홀덤·포커 토너먼트와 카지노 딜러가 모이는 커뮤니티의 메인 메뉴, 작성 권한,
          구인 공고 폼을 한 화면에서 정리한 기획입니다. 아래 구조는 실제 사이드바와
          작성 화면에 그대로 반영되어 있습니다.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">1. 게시판 구성 및 권한</h2>
        {BOARD_NAV.map((group) => (
          <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{group.title}</p>
            <ul className="mt-3 grid gap-3">
              {group.items.map((item) => (
                <li key={item.href} className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={item.href} className="font-medium text-foreground hover:text-primary">
                    {item.label}
                  </Link>
                  <span className="text-sm text-muted-foreground">{item.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
          <li>대회 포스터·공식 홍보·대회 일정은 관리자만 작성하고, 포스터 게시판은 갤러리 카드가 기본입니다.</li>
          <li>구인 공고는 기업·팀 회원, 인재 등록은 개인 회원, 급구는 전체 회원입니다.</li>
          <li>딜러 커뮤니티는 현장 후기·룰·수다를 담당하며 핸드리뷰와 익명 매장후기를 곁에 둡니다.</li>
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">2. 구인 공고 등록 폼</h2>
        <p className="text-sm text-muted-foreground">
          작성 권한은 기업·팀 회원입니다. 실제 입력 화면은{" "}
          <Link href="/boards/hire/write" className="text-primary">
            구인 공고 등록
          </Link>
          에서 확인할 수 있습니다.
        </p>
        {FORM_SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold">{section.title}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
              {section.fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 text-sm leading-7">
        <h2 className="text-xl font-semibold">3. 데이터 매핑</h2>
        <p className="mt-2 text-muted-foreground">
          `Post.boardType`으로 게시판을 가르고, 구인 조건은 `jobPositions`, `jobLocation`,
          `jobWorkType`, `jobExperience`, `jobPayType`, `jobPayAmount`, `jobBenefits`,
          `jobApplyMethod`, `jobApplyValue`, `jobAlwaysOpen`, `jobWorkDate`에 저장합니다.
          회원 권한은 `User.isAdmin`과 `User.memberKind`(COMPANY / INDIVIDUAL)로 검사합니다.
        </p>
      </section>
    </article>
  );
}
