import { AdvertiseForm } from "@/components/ads/advertise-form";
import { AdPlacementMap } from "@/components/ads/ad-placement-map";
import { AD_PRODUCTS } from "@/lib/sponsor";
import Link from "next/link";

export const metadata = {
  title: "제휴 및 광고 안내 — POKA",
};

export default function AdvertisePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-primary">SPONSOR</p>
        <h1 className="mt-1 text-2xl font-semibold">제휴 및 광고 안내</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          구좌는 홈 포스터, 오른쪽 사이드바 300×150 세 칸, 글 목록 한 줄입니다. 지도의 A1–A3·B·C가 실제
          자리입니다. 금액은 오픈 시즌 가이드입니다.
        </p>
      </header>

      <AdPlacementMap />

      <section>
        <h2 className="text-lg font-semibold">구좌별 위치와 단가</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          부가세 별도. 소재는 이미지 1장(또는 인피드 문구)과 랜딩 URL이면 됩니다. 빈 구좌는 지금처럼 문의
          버튼으로 비워 둡니다.
        </p>
        <ul className="mt-3 grid gap-3">
          {AD_PRODUCTS.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-primary">
                    {item.code} · {item.size}
                  </p>
                  <p className="mt-1 text-base font-semibold">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-800">{item.price}</p>
                  <p className="text-xs text-muted-foreground">{item.weekly}</p>
                </div>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-900">{item.exclusive}</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">어디인가</dt>
                  <dd className="mt-0.5 leading-6">{item.where}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">왜 이 금액인가</dt>
                  <dd className="mt-0.5 leading-6 text-foreground/90">{item.why}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">단가를 이렇게 잡았습니다</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-foreground/90">
          <li>비교 대상은 대형 포털이 아니라 지역 홀덤 카페 배너·게시글형 홍보입니다.</li>
          <li>사이드바는 300×150 세로 3칸입니다. 칸당 월 12만, 3칸을 한 팀이 쓰면 월 36만입니다.</li>
          <li>홈 포스터는 첫 화면이지만 3칸이 최대 9장과 돌아가므로 카페 메인 고정보다 낮습니다.</li>
          <li>인피드는 목록을 읽다 한 줄만 보이므로 배너와 포스터 사이입니다.</li>
          <li>패키지(사이드바 1칸+포스터+인피드)는 따로 살 때(월 79만)보다 낮춘 월 70만입니다.</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          트래픽 리포트(노출·클릭)는 계약 기간에 주 1회 공유하는 것을 기본으로 합니다. 공식 홍보 글만 직접
          올리려면{" "}
          <Link href="/boards/official/write" className="text-primary">
            홍보 등록
          </Link>
          을 쓰면 되고, 유료 구좌는 아래 문의가 맞습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">문의</h2>
        <AdvertiseForm />
      </section>
    </div>
  );
}
