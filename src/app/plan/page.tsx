import Link from "next/link";
import { BOARD_NAV } from "@/lib/nav";

export default function PlanPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-sm text-primary">POKA 웹사이트 기획서</p>
        <h1 className="mt-1 text-3xl font-semibold">대메뉴 4종 · 커뮤니티 · 구인/구직</h1>
      </header>
      <section className="grid gap-3">
        {BOARD_NAV.map((group) => (
          <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={group.href} className="text-sm font-semibold tracking-wide text-primary hover:underline">
                {group.title}
              </Link>
              <span className="text-xs text-muted-foreground">{group.hint}</span>
            </div>
            {group.items.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {group.items.map((item) => (
                  <li key={item.href} className="flex flex-wrap justify-between gap-2">
                    <Link href={item.href} className="font-medium hover:text-primary">
                      {item.label}
                    </Link>
                    <span className="text-sm text-muted-foreground">{item.hint}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{group.hint}</p>
            )}
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 text-sm leading-7">
        <h2 className="text-lg font-semibold">메뉴 구조</h2>
        <p className="mt-2 text-muted-foreground">
          상단 대메뉴는 대회 일정, 공식 홍보, 커뮤니티, 구인/구직 네 갈래입니다. 커뮤니티는 출석체크,
          이게 맞나요?, 현장 스케치, 자유게시판, 핸드리뷰, 익명 게시판입니다. 구인/구직은 고정 직원,
          지원 딜러, 팀, 급구/대타, 개인 구직입니다.
        </p>
        <p className="mt-3 text-muted-foreground">
          구인 글은 제목 입력란이 없고 지역·상호(조건)로 자동 생성됩니다. 연락처는 로그인 후 공개.
          공식 홍보는 팀·브랜드·제휴 소식과 메인 프리미엄 3×2(6구좌)를 연동합니다. 대회 일정은
          관리자가 일자별·월별 달력으로 올립니다.
        </p>
      </section>
    </article>
  );
}
