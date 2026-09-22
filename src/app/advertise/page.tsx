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
          직판 제휴(홈 3×2, 사이드바, 인피드)가 있으면 그 소재가 먼저 붙습니다. 구글 애드센스는 글 본문
          위·아래와 사이드바 맨 아래, 제휴가 없는 잔여에만 들어갑니다.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">우선순위</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground/90">
          <li>직접 수주한 제휴 소재(이미지·제목)가 있으면 그 칸은 제휴만 보여 줍니다.</li>
          <li>프리미엄 6칸과 사이드바는 월정액 전용입니다. 비어 있으면 구글이 아니라 문의 버튼입니다.</li>
          <li>인피드도 제휴 문장이 있을 때만 한 줄을 넣습니다. 없으면 목록을 비우지 않습니다.</li>
          <li>
            구글은 게시자 코드로 들어옵니다. AdSense ID를{" "}
            <code className="text-xs">NEXT_PUBLIC_ADSENSE_CLIENT</code>에 넣으면 본문 상·하단과 사이드바
            하단 데모가 실제 광고로 바뀝니다.
          </li>
        </ol>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          포커·실머니로 분류되면 AdSense 승인이 거절될 수 있습니다. 그때는 같은 G칸을 Ad Manager나 다른
          잔여 네트워크로 바꾸면 됩니다.
        </p>
      </section>

      <AdPlacementMap />

      <section>
        <h2 className="text-lg font-semibold">구좌별 위치와 단가</h2>
        <p className="mt-1 text-xs text-muted-foreground">부가세 별도. 직판 소재는 이미지 1장(또는 인피드 문구)과 랜딩 URL이면 됩니다.</p>
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
          <li>홈 3×2는 고정 월정액이라 순환 포스터보다 높고, 카페 메인 고정보다는 낮습니다.</li>
          <li>사이드바는 프로필 아래 반복 노출이지만 본문을 밀지 않아 월 18만입니다.</li>
          <li>인피드는 목록을 읽다 한 줄만 보이므로 프리미엄과 사이드바 사이입니다.</li>
          <li>패키지(프리미엄 1칸+사이드바+인피드)는 따로 살 때(월 78만)보다 낮춘 월 70만입니다.</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          트래픽 리포트는 계약 기간에 주 1회 공유하는 것을 기본으로 합니다. 공식 홍보 글만 직접 올리려면{" "}
          <Link href="/boards/official/write" className="text-primary">
            홍보 등록
          </Link>
          을 쓰면 되고, 유료 구좌는 아래 문의가 맞습니다. 운영자는{" "}
          <Link href="/admin/banners" className="text-primary">
            배너 구좌 관리
          </Link>
          에서 6칸·사이드바·인피드를 지정합니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">문의</h2>
        <AdvertiseForm />
      </section>
    </div>
  );
}
