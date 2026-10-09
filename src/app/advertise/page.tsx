import { AdvertiseForm } from "@/components/ads/advertise-form";
import { AdPlacementMap } from "@/components/ads/ad-placement-map";
import { AD_PRODUCTS } from "@/lib/sponsor";

export const metadata = {
  title: "제휴 및 광고 문의 — POKA",
};

export default function AdvertisePage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-primary">SPONSOR</p>
        <h1 className="mt-1 text-2xl font-semibold">제휴 / 광고 문의</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          광고·제휴 단가는 공개하지 않습니다. 구좌와 금액은 운영자와 따로 이야기한 뒤에만 진행합니다.
          아래 문의로 연락 주시면 됩니다.
        </p>
      </header>

      <AdPlacementMap />

      <section>
        <h2 className="text-lg font-semibold">구좌 위치</h2>
        <p className="mt-1 text-xs text-muted-foreground">어디에 붙는지만 안내합니다. 금액은 적지 않습니다.</p>
        <ul className="mt-3 grid gap-3">
          {AD_PRODUCTS.map((item) => (
            <li key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold text-primary">
                {item.code} · {item.size}
              </p>
              <p className="mt-1 text-base font-semibold">{item.name}</p>
              <p className="mt-1 text-xs font-medium text-emerald-900">{item.exclusive}</p>
              <p className="mt-2 text-sm leading-6">{item.where}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">문의하기</h2>
        <AdvertiseForm />
      </section>
    </div>
  );
}
