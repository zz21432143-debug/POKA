import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { BET_FRACTIONS, HAND_FREQ, MATCHUPS, OUTS_EXAMPLES, outsRow, potOddsNeeded } from "@/lib/cheatsheet";
import { PrintButton } from "@/components/study/print-button";
import { CardText } from "@/components/study/card-text";

const TITLE = "홀덤 참고 표 — 족보 확률 · 아웃츠 · 팟 오즈 · 프리플랍 맞대결 (인쇄용)";
const DESCRIPTION = "한 장에 모은 홀덤 숫자: 족보가 나올 확률, 아웃츠별 완성 확률, 벳 크기별 필요한 승률, 대표 프리플랍 올인 승률. 인쇄 · PDF 저장 가능.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study/cheatsheet" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/study/cheatsheet" },
};

const pct = (v: number) => `${v.toFixed(1)}%`;

/** 인쇄용 참고 표 한 장 */
export default function CheatsheetPage() {
  return (
    <div data-cheatsheet className="cheat mx-auto flex w-full max-w-6xl flex-col gap-4">
      {/* 인쇄할 때: 사이트 메뉴 · 광고는 빼고 흰 종이에 검은 글씨 */}
      <style>{`@media print {
        header, nav, footer, aside, [data-site-chrome], [data-no-print] { display: none !important; }
        html, body { background: #fff !important; }
        *, *::before, *::after { background-image: none !important; }
        .cheat, .cheat * { color: #000 !important; background: #fff !important; border-color: #999 !important; box-shadow: none !important; }
        .cheat section { break-inside: avoid; }
      }`}</style>
      <p data-no-print className="text-sm text-[#9CA3AF]">
        <Link href="/study" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 공부
        </Link>
      </p>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-white">🧾 홀덤 참고 표</h1>
          <p className="mt-1 text-sm text-[#d1c7b5]">숫자는 POKA가 직접 계산했어요(맞대결은 30만 번 시뮬레이션). 딜러 대기실 · 매장 벽에 붙여 두세요.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="족보 확률" className="rounded-2xl border border-white/15 bg-black/30 p-4">
          <h2 className="text-lg font-black text-[#f3d9a4]">1. 족보 순위와 나올 확률</h2>
          <p className="text-xs text-[#b8ab98]">위가 높은 족보 · 7장 중 가장 좋은 5장</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {HAND_FREQ.map((row, i) => (
                <tr key={row.name} className="border-t border-white/10">
                  <td className="py-1.5 pr-2 font-bold text-white">{i + 1}. {row.name}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">{row.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-label="팟 오즈" className="rounded-2xl border border-white/15 bg-black/30 p-4">
          <h2 className="text-lg font-black text-[#f3d9a4]">2. 콜에 필요한 승률(팟 오즈)</h2>
          <p className="text-xs text-[#b8ab98]">필요한 승률 = 상대 벳 ÷ (팟 + 벳 × 2)</p>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#b8ab98]">
                <th className="py-1">상대 벳</th>
                <th className="py-1 text-right">필요한 승률</th>
              </tr>
            </thead>
            <tbody>
              {BET_FRACTIONS.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="py-1.5 font-bold text-white">{row.label}</td>
                  <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">{pct(potOddsNeeded(row.fraction))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-label="아웃츠" className="rounded-2xl border border-white/15 bg-black/30 p-4 md:col-span-2">
          <h2 className="text-lg font-black text-[#f3d9a4]">3. 아웃츠별 완성 확률</h2>
          <p className="text-xs text-[#b8ab98]">플랍 뒤 남은 47장 기준 · 어림: 한 장 ≈ 아웃츠 × 2, 두 장 ≈ 아웃츠 × 4(아웃츠가 많으면 실제보다 큼) · 아웃츠는 이미 보이는 카드를 빼고, 두 번 세지 않아요. 내 아웃츠가 상대를 더 좋게 만들면(예: 보드가 페어가 되어 상대 풀하우스) 빼고 세세요.</p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[30rem] text-sm">
              <thead>
                <tr className="text-left text-xs text-[#b8ab98]">
                  <th className="py-1">아웃츠</th>
                  <th className="py-1">예 · 계산</th>
                  <th className="py-1 text-right">턴 한 장</th>
                  <th className="py-1 text-right">턴 + 리버(올인)</th>
                  <th className="py-1 text-right">리버 한 장</th>
                </tr>
              </thead>
              <tbody>
                {OUTS_EXAMPLES.map(({ outs, label, hand, board, how }) => {
                  const r = outsRow(outs);
                  return (
                    <tr key={outs} className="border-t border-white/10">
                      <td className="py-1.5 font-black text-white">{outs}장</td>
                      <td className="py-1.5 text-[#d1c7b5]">
                        <b className="text-white">{label}</b>
                        <span className="block text-xs">
                          <CardText text={`손 [${hand}] · 보드 [${board}]`} /> → {how}
                        </span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">{pct(r.turn)}</td>
                      <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">{pct(r.both)}</td>
                      <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">{pct(r.river)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-label="프리플랍 맞대결" className="rounded-2xl border border-white/15 bg-black/30 p-4 md:col-span-2">
          <h2 className="text-lg font-black text-[#f3d9a4]">4. 프리플랍 올인 맞대결</h2>
          <p className="text-xs text-[#b8ab98]">다섯 장 다 열었을 때 앞 패가 이기는 몫(비기면 반씩) · 무늬에 따라 조금씩 다름</p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full min-w-[30rem] text-sm">
              <tbody>
                {MATCHUPS.map((m) => (
                  <tr key={`${m.a}-${m.b}`} className="border-t border-white/10">
                    <td className="py-1.5 font-black text-white">
                      {m.a} vs {m.b}
                    </td>
                    <td className="py-1.5 text-[#d1c7b5]">{m.label}</td>
                    <td className="py-1.5 text-right tabular-nums text-[#e7c98a]">
                      {m.eqA.toFixed(1)}% : {(100 - m.eqA).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <p data-no-print className="flex flex-wrap gap-3 text-sm">
        <Link href="/community/equity" className="font-bold text-[#e7c98a] underline">
          다른 패 승률 계산하기 →
        </Link>
        <Link href="/study/glossary" className="font-bold text-[#e7c98a] underline">
          용어 사전 →
        </Link>
      </p>
    </div>
  );
}
