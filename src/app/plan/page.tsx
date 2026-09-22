import Link from "next/link";
import { BOARD_NAV } from "@/lib/nav";

export default function PlanPage() {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-sm text-primary">POKA 웹사이트 기획서</p>
        <h1 className="mt-1 text-3xl font-semibold">구인 3종 · 공식 홍보 · 대회 일정</h1>
      </header>
      <section className="grid gap-3">
        {BOARD_NAV.map((group) => (
          <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">{group.title}</p>
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
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 text-sm leading-7">
        <h2 className="text-lg font-semibold">구인 3종</h2>
        <p className="mt-2 text-muted-foreground">
          제목 입력란 없음. 고정 직원은 [지역] 상호명 - 고정 직원 모집, 지원 딜러는 [희망 지역] 지원
          딜러 (시급 OOO원), 딜러 팀은 [주요 지역] 팀명 - 딜러 팀원 모집. 연락처는 로그인 후 공개.
        </p>
        <p className="mt-3 text-muted-foreground">
          공식 홍보는 검증 매장 포스터 갤러리이며 메인 프리미엄 3×2(6구좌)와 연동됩니다. 전국 대회
          일정은 관리자만 작성하고 달력/리스트로 대회명·장소·기간·총상금·포스터·공식 링크를 보여 줍니다.
        </p>
      </section>
    </article>
  );
}
