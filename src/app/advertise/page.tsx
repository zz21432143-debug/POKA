import { AdvertiseForm } from "@/components/ads/advertise-form";
import { AD_PRODUCTS } from "@/lib/sponsor";
import Link from "next/link";

export const metadata = {
  title: "제휴 및 광고 안내 — POKA",
};

const BENEFITS = [
  "홈 상단 홍보 카드에 [AD]·[제휴] 마크로 광고주 노출을 구분합니다.",
  "우측 프로필 아래 300×150 고정 배너. 커스텀 이미지 1장을 그대로 넣습니다.",
  "최신 게시글 3~4번째 사이 네이티브 한 줄로 스크롤을 끊지 않고 노출합니다.",
  "인증 딜러·구인 트래픽이 모인 커뮤니티라 채용·용품·이벤트 전환에 맞습니다.",
];

export default function AdvertisePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-primary">SPONSOR</p>
        <h1 className="mt-1 text-2xl font-semibold">제휴 및 광고 안내</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          POKA 홈과 사이드바 구좌에 브랜드를 올립니다. 빈 구좌는 「AD / 제휴 문의하기」로 비워 두고,
          소재가 준비되면 300×150 이미지로 바로 교체합니다.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">단가표</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {AD_PRODUCTS.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-primary">{item.size}</p>
              <p className="mt-1 font-semibold">{item.name}</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">{item.price}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">혜택</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-foreground/90">
          {BENEFITS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          공식 홍보 글을 직접 올리려면{" "}
          <Link href="/boards/official/write" className="text-primary">
            홍보 등록
          </Link>
          을 이용하세요. 유료 구좌는 아래 문의가 맞습니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">문의</h2>
        <AdvertiseForm />
      </section>
    </div>
  );
}
