import type { Metadata } from "next";
import { BriefcaseIcon, MegaphoneIcon, UsersIcon } from "lucide-react";
import { AdvertiseForm } from "@/components/ads/advertise-form";
import { AD_PRODUCTS } from "@/lib/sponsor";

export const metadata: Metadata = {
  title: "광고 · 제휴 문의",
  description: "홀덤펍·대회·브랜드를 홀덤 딜러와 매장 관계자에게 알리세요. POKA 메인 포스터, 구인공고 상단 고정, 배너 광고 문의.",
};

const AUDIENCE = [
  { icon: BriefcaseIcon, title: "홀덤 딜러·스태프", body: "지원 딜러·급구 대타 공고를 매일 확인하는 현직 딜러" },
  { icon: UsersIcon, title: "홀덤펍 운영자", body: "딜러를 구하고 대회 일정을 챙기는 매장 관계자" },
  { icon: MegaphoneIcon, title: "홀덤 플레이어", body: "대회·이벤트 소식과 핸드리뷰를 보러 오는 플레이어" },
] as const;

const STEPS = [
  { title: "문의 남기기", body: "아래 양식에 업체명과 원하는 광고를 적어 주세요." },
  { title: "상담", body: "구좌, 기간, 금액을 운영자가 직접 안내합니다." },
  { title: "소재 전달", body: "포스터·배너 이미지와 연결할 링크를 보내 주세요." },
  { title: "게재 시작", body: "확인 후 바로 노출되고, 기간이 끝나면 알려 드립니다." },
] as const;

export default function AdvertisePage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="board-intro">
        <p className="text-xs font-semibold tracking-wide text-[#e7c98a]">광고 · 제휴</p>
        <h1 className="mt-1">POKA에 광고하세요</h1>
        <p className="mt-2">
          홀덤 딜러 구인구직이 모이는 곳입니다. 매장 오픈, 대회, 이벤트, 브랜드를 딜러와 홀덤인에게 직접 알릴 수
          있습니다. 금액은 구좌와 기간에 따라 상담 후 안내합니다.
        </p>
        <a
          href="#inquiry"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-white hover:bg-[#a32a2a]"
        >
          광고 문의하기
        </a>
      </header>

      <section>
        <h2 className="text-lg font-bold text-white">누가 보나요</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {AUDIENCE.map((item) => (
            <li key={item.title} className="ink-panel rounded-2xl p-4">
              <item.icon className="size-5 text-[#C59B27]" />
              <p className="mt-2 font-bold text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#D1D5DB]">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white">광고 상품</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {AD_PRODUCTS.map((item) => (
            <li key={item.id} className="ink-panel rounded-2xl p-4">
              <p className="text-xs font-semibold text-[#e7c98a]">
                {item.code} · {item.size}
              </p>
              <p className="mt-1 text-base font-bold text-white">{item.name}</p>
              <p className="mt-1 text-xs font-medium text-emerald-300">{item.exclusive}</p>
              <p className="mt-2 text-sm leading-6 text-[#D1D5DB]">{item.where}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white">진행 순서</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="ink-panel rounded-2xl p-4">
              <p className="text-xs font-bold text-[#e7c98a]">STEP {index + 1}</p>
              <p className="mt-1 font-bold text-white">{step.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#D1D5DB]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="inquiry" className="scroll-mt-24">
        <h2 className="mb-3 text-lg font-bold text-white">광고 문의하기</h2>
        <AdvertiseForm />
      </section>
    </div>
  );
}
