import type { Metadata } from "next";
import { BriefcaseIcon, MegaphoneIcon, UsersIcon } from "lucide-react";
import { AdvertiseForm } from "@/components/ads/advertise-form";
import { getCurrentUser } from "@/lib/current-user";
import { AD_PRODUCTS } from "@/lib/sponsor";
import { FreePromoTitle, PokaBrush, PokaMascot } from "@/components/ads/free-promo-banner";

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

export default async function AdvertisePage() {
  const viewer = await getCurrentUser().catch(() => null);
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

      <section
        id="free-promo"
        className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#c9a36a]/50 bg-gradient-to-br from-[#241011] via-[#140d0d] to-[#0c0a0a] p-5 sm:p-6"
      >
        <span className="text-[11px] font-bold tracking-[0.4em] text-[#c9a36a]">FREE PROMOTION EVENT</span>
        <div className="mt-3 flex items-center gap-4">
          <PokaMascot className="size-16" />
          <h2 className="flex flex-col items-start gap-2">
            <PokaBrush className="w-32" />
            <FreePromoTitle className="text-2xl sm:text-3xl" />
          </h2>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#e8dfd3]">
          매장 오픈, 대회, 팀 모집, 유튜브 채널 홍보를 POKA 메인 포스터 자리에 무료로 올려 드립니다. 아래 문의 양식에
          &quot;무료 홍보 이벤트&quot;라고 적고 업체명·연락처를 남겨 주시면, 확인 후 포스터를 받아 바로 걸어 드립니다.
        </p>
        <p className="mt-1 text-xs text-[#bfae92]">자리가 차면 순서대로 안내하며, 이벤트는 운영 상황에 따라 끝날 수 있습니다.</p>
        <a
          href="#inquiry"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#c8282c] px-6 text-sm font-black text-[#f6efe6] hover:bg-[#d93a3e]"
        >
          무료 홍보 신청하기 →
        </a>
      </section>

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
        <AdvertiseForm loggedIn={Boolean(viewer)} />
      </section>
    </div>
  );
}
