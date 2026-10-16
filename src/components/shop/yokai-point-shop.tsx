"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { MarkCatalog, MarkCatalogItem } from "@/lib/mark-categories";
import { NICKNAME_TICKET_NAME, NICKNAME_TICKET_PRICE } from "@/lib/nickname-change";
import { auraClassForSrc, isAchievementSlug, YOKAI_ACHIEVEMENTS } from "@/lib/yokai-achievements";
import { FOUR_KINGS_MARKS, isKingSlug } from "@/lib/yokai-kings";
import { YokaiOfferCard, type CardMark } from "@/components/shop/yokai-card";
import { markPriceTag } from "@/lib/yokai-catalog";
import {
  KOREAN_LEGEND_MARKS,
  LOGO_MARKS,
  VILLAGE_ALL_MARKS,
  VILLAGE_CHIEF_MARK,
  VILLAGE_COLLECTION_STEPS,
  VILLAGE_COMMON_MARKS,
  VILLAGE_HERO_MARKS,
  VILLAGE_RARE_MARKS,
  YOKAI_MARKS,
  isLegendSlug,
  isLogoSlug,
  isShopMarkSlug,
  isVillageSlug,
  isYokaiSlug,
} from "@/lib/yokai-marks";
import { cn } from "cn";

export function YokaiPointShop({
  initial,
  nickname,
}: {
  initial: MarkCatalog | null;
  nickname: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MarkCatalog | null>(initial);
  const [demoPoints, setDemoPoints] = useState(3000);
  const [demoOwned, setDemoOwned] = useState<Record<string, boolean>>({});
  const [demoEquipped, setDemoEquipped] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => {
    const worn = initial?.marks.find((mark) => mark.equipped && isShopMarkSlug(mark.slug));
    return worn?.slug ?? YOKAI_MARKS[0]!.slug;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [tab, setTab] = useState<ShopTab>("shop");
  const [filter, setFilter] = useState<ShopFilter>("all");
  const [collectNote, setCollectNote] = useState<string | null>(null);
  const loggedIn = Boolean(catalog?.loggedIn);
  const points = loggedIn ? (catalog?.points ?? 0) : demoPoints;

  const regular = useMemo(
    () => mergeFrom(YOKAI_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const legends = useMemo(
    () => mergeFrom(KOREAN_LEGEND_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const villageCommon = useMemo(
    () => mergeFrom(VILLAGE_COMMON_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const villageRare = useMemo(
    () => mergeFrom(VILLAGE_RARE_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const villageHero = useMemo(
    () => mergeFrom(VILLAGE_HERO_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const chief = useMemo(
    () => mergeFrom([VILLAGE_CHIEF_MARK], catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const logos = useMemo(
    () => mergeFrom(LOGO_MARKS, catalog, demoOwned, demoEquipped),
    [catalog, demoOwned, demoEquipped],
  );
  const rewards = useMemo(
    () =>
      mergeFrom(
        YOKAI_ACHIEVEMENTS.map((mark) => ({ ...mark, pricePoints: 0 })),
        catalog,
        demoOwned,
        demoEquipped,
      ),
    [catalog, demoOwned, demoEquipped],
  );
  const kings = useMemo(
    () =>
      mergeFrom(
        FOUR_KINGS_MARKS.map((mark) => ({ ...mark, pricePoints: 0 })),
        catalog,
        demoOwned,
        demoEquipped,
      ),
    [catalog, demoOwned, demoEquipped],
  );
  const preview =
    [...logos, ...regular, ...villageCommon, ...villageRare, ...villageHero, ...legends, ...chief, ...rewards, ...kings].find((mark) => mark.slug === selected) ?? regular[0]!;
  const villageOwned = [...villageCommon, ...villageRare, ...villageHero].filter((m) => m.owned).length;
  const villageTotal = VILLAGE_ALL_MARKS.length;
  const pick = (list: CardMark[]) =>
    filter === "all"
      ? list
      : list.filter((m) =>
          filter === "affordable"
            ? !m.owned && m.pricePoints > 0 && m.pricePoints <= points
            : filter === "discount"
              ? !m.owned && Boolean(m.basePrice)
              : !m.owned,
        );
  const inventory = [...chief, ...rewards, ...kings, ...logos, ...legends, ...villageHero, ...villageRare, ...villageCommon, ...regular].filter((mark) => mark.owned);
  const others = (catalog?.marks ?? []).filter(
    (mark) =>
      !isYokaiSlug(mark.slug) &&
      !isLegendSlug(mark.slug) &&
      !isLogoSlug(mark.slug) &&
      !isVillageSlug(mark.slug) &&
      !isAchievementSlug(mark.slug) &&
      !isKingSlug(mark.slug),
  );

  async function reload() {
    const response = await fetch("/api/marks");
    const payload = (await response.json()) as MarkCatalog;
    setCatalog(payload);
  }

  async function buy(mark: CardMark) {
    if (mark.pricePoints <= 0 || points < mark.pricePoints || mark.owned) return;
    setError(null);
    if (!loggedIn) {
      setDemoPoints((value) => value - mark.pricePoints);
      setDemoOwned((value) => ({ ...value, [mark.slug]: true }));
      setSelected(mark.slug);
      return;
    }
    if (mark.id === mark.slug) {
      setError("상점 상품을 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setPending(mark.id + "buy");
    try {
      const response = await fetch(`/api/marks/${mark.id}/buy`, { method: "POST" });
      const payload = (await response.json()) as { error?: string; collection?: { at: number; points: number; mark: boolean }[] };
      if (!response.ok) throw new Error(payload.error ?? "구매에 실패했습니다.");
      const step = payload.collection?.[payload.collection.length - 1];
      if (step)
        setCollectNote(
          step.mark
            ? `👑 요괴 마을 도감 완성! +${step.points}P와 「요괴 마을 촌장」 마크를 받았어요.`
            : `📖 요괴 마을 도감 ${step.at}종 달성! +${step.points}P`,
        );
      await reload();
      setSelected(mark.slug);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "구매에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  async function equip(mark: CardMark) {
    if (!mark.owned) return;
    setError(null);
    setSelected(mark.slug);
    if (!loggedIn) {
      setDemoEquipped(mark.slug);
      return;
    }
    if (mark.id === mark.slug) {
      setError("상점 상품을 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setPending(mark.id + "equip");
    try {
      const response = await fetch(`/api/marks/${mark.id}/equip`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "장착에 실패했습니다.");
      await reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "장착에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  async function buyTicket() {
    setPending("ticket");
    setError(null);
    try {
      const response = await fetch("/api/shop/nickname-ticket", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "구매에 실패했습니다.");
      await reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "구매에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  const tabs: { key: ShopTab; label: string; count?: number }[] = [
    { key: "shop", label: "상점" },
    { key: "rewards", label: "보상 마크" },
    { key: "inventory", label: "내 인벤토리", count: inventory.length },
    { key: "extra", label: "변경권 · 기타" },
  ];

  return (
    <section className="yokai-shop">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">마크 상점</p>
          <h1>포인트 상점</h1>
          <p>활동으로 모은 포인트로 마크를 사고, 닉네임 옆에 착용하세요.</p>
        </div>
        <p className="yokai-points">
          {loggedIn ? "보유 포인트" : "체험 포인트"}: <strong>{points.toLocaleString()} P</strong>
        </p>
      </header>

      {!loggedIn ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#c9a25c]/40 bg-[#2a2017] px-4 py-3 text-sm">
          <p className="text-[#f3eadb]">
            지금은 체험 모드입니다. 구매·착용은 미리보기만 되고 저장되지 않습니다.
          </p>
          <Link href="/login?next=/shop" className={buttonVariants({ size: "touch" })}>
            로그인하고 내 포인트 쓰기
          </Link>
        </div>
      ) : null}

      <div className="yokai-layout">
        <aside className="yokai-preview" aria-label="내 프로필 미리보기">
          <h2>내 프로필 미리보기</h2>
          <div className="yokai-mini">
            <span className={cn("mark-image-wrapper yokai-mini-mark", auraClassForSrc(preview.imageUrl))}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="mark-glyph" src={preview.imageUrl} alt={preview.name} width={64} height={64} />
            </span>
            <strong>{nickname}</strong>
          </div>
          <p data-mark-preview-inline className="flex items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1.5 text-xs text-zinc-300">
            <span className="text-zinc-500">게시판에선</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.imageUrl} alt="" width={20} height={20} className="size-5 rounded-full" />
            <b className="text-white">{nickname}</b>
            <span className="text-zinc-500">· 댓글 · 랭킹에도 이렇게 보여요</span>
          </p>
          <p className="yokai-preview-name">
            {preview.name} · {markPriceTag(preview)}
            {preview.equipped ? " · 착용 중" : preview.owned ? " · 보유 중" : ""}
          </p>
        </aside>

        <nav aria-label="상점 메뉴" className="card-scroller -mx-1 overflow-x-auto px-1">
          <ul role="tablist" className="flex w-max gap-1.5">
            {tabs.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "touch-target inline-flex min-h-10 items-center gap-1 rounded-full border px-4 text-sm font-semibold",
                    tab === item.key
                      ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]"
                      : "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60",
                  )}
                >
                  {item.label}
                  {item.count ? <span className="text-xs opacity-75">{item.count}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {error ? <p className="yokai-error">{error}</p> : null}

        {tab === "shop" ? (
          <>
            <div data-shop-filter role="radiogroup" aria-label="마크 보기" className="flex flex-wrap gap-1.5">
              {SHOP_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold",
                    filter === f.key ? "border-[#c9a25c] bg-[#c9a25c]/20 text-[#ffe08a]" : "border-white/15 text-zinc-300",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <section data-village-collection={`${villageOwned}/${villageTotal}`} className="yokai-block grid gap-2" aria-label="요괴 마을 도감">
              <div className="flex items-center gap-2">
                <h2>📖 요괴 마을 도감</h2>
                <span className="ml-auto text-sm font-black tabular-nums text-[#ffe08a]">
                  {villageOwned} / {villageTotal}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#c9a25c] to-[#ffe08a]" style={{ width: `${(villageOwned / villageTotal) * 100}%` }} />
              </div>
              <ul className="flex flex-wrap gap-1.5 text-xs">
                {VILLAGE_COLLECTION_STEPS.map((s) => (
                  <li
                    key={s.at}
                    className={cn("rounded-full border px-2.5 py-1 font-bold", villageOwned >= s.at ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-200" : "border-white/15 text-zinc-400")}
                  >
                    {villageOwned >= s.at ? "✅" : "⬜"} {s.at}종 · +{s.points}P{"mark" in s && s.mark ? " · 👑 촌장 마크" : ""}
                  </li>
                ))}
              </ul>
              {collectNote ? <p className="text-sm font-black text-emerald-300">{collectNote}</p> : null}
            </section>
            <MarkGrid
              title="로고 마크"
              marks={pick(logos)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
            <MarkGrid
              title="일반 마크"
              marks={pick(regular)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
            <MarkGrid
              title="요괴 마을 · 일반"
              marks={pick(villageCommon)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
            <MarkGrid
              title="요괴 마을 · 희귀"
              marks={pick(villageRare)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
            <MarkGrid
              title="요괴 마을 · 영웅 · 전설"
              marks={pick(villageHero)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
            <MarkGrid
              title="한국 전설"
              marks={pick(legends)}
              points={points}
              pending={pending}
              selected={selected}
              onSelect={setSelected}
              onBuy={buy}
              onEquip={equip}
            />
          </>
        ) : null}

        {tab === "rewards" ? (
          <>
            <p className="yokai-note">보상 마크는 살 수 없고, 레벨을 올리거나 랭킹에 들면 받습니다.</p>
            <MarkGrid title="요괴 마을 도감 완성" marks={chief} points={points} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
            <MarkGrid title="레벨 보상" marks={rewards} points={points} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
            <MarkGrid title="랭킹 보상" marks={kings} points={points} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
          </>
        ) : null}

        {tab === "inventory" ? (
          <section className="yokai-block" aria-label="내 인벤토리">
            <h2>내 인벤토리</h2>
            {inventory.length === 0 ? (
              <p className="yokai-note">
                아직 보유한 마크가 없습니다.{" "}
                <button type="button" className="font-semibold text-[#e7c98a] underline" onClick={() => setTab("shop")}>
                  상점 둘러보기
                </button>
              </p>
            ) : (
              <ul className="yokai-grid">
                {inventory.map((mark) => (
                  <YokaiOfferCard
                    key={mark.slug}
                    mark={mark}
                    points={points}
                    pending={pending}
                    selected={selected === mark.slug}
                    onSelect={() => setSelected(mark.slug)}
                    onEquip={() => void equip(mark)}
                  />
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "extra" ? (
          <>
            <section className="yokai-block" aria-label={NICKNAME_TICKET_NAME}>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#1a1617] p-4">
                <div>
                  <p className="font-bold text-white">{NICKNAME_TICKET_NAME}</p>
                  <p className="yokai-note">
                    {NICKNAME_TICKET_PRICE.toLocaleString()}P · 보유 {catalog?.nicknameTickets ?? 0}장
                  </p>
                </div>
                {loggedIn ? (
                  <button
                    type="button"
                    className="yokai-buy"
                    style={{ width: "auto", padding: "0 1rem" }}
                    disabled={pending !== null || points < NICKNAME_TICKET_PRICE}
                    onClick={() => void buyTicket()}
                  >
                    {pending === "ticket" ? "구매 중…" : points < NICKNAME_TICKET_PRICE ? "포인트 부족" : "구매하기"}
                  </button>
                ) : (
                  <Link href="/login?next=/shop" className={buttonVariants({ size: "touch" })}>
                    로그인
                  </Link>
                )}
              </div>
            </section>
            {loggedIn && others.length > 0 ? (
              <section className="yokai-block" aria-label="다른 마크">
                <h2>다른 마크</h2>
                <ul className="yokai-grid">
                  {others.map((mark) => (
                    <YokaiOfferCard
                      key={mark.id}
                      mark={toCard(mark)}
                      points={points}
                      pending={pending}
                      selected={selected === mark.slug}
                      onSelect={() => setSelected(mark.slug)}
                      onBuy={() => void buy(toCard(mark))}
                      onEquip={() => void equip(toCard(mark))}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

type ShopTab = "shop" | "rewards" | "inventory" | "extra";
type ShopFilter = "all" | "affordable" | "discount" | "missing";
const SHOP_FILTERS: { key: ShopFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "affordable", label: "지금 살 수 있는 것" },
  { key: "discount", label: "내 요괴 반값" },
  { key: "missing", label: "안 가진 것" },
];

function MarkGrid({
  title,
  marks,
  points,
  pending,
  selected,
  onSelect,
  onBuy,
  onEquip,
}: {
  title: string;
  marks: CardMark[];
  points: number;
  pending: string | null;
  selected: string;
  onSelect: (slug: string) => void;
  onBuy?: (mark: CardMark) => void;
  onEquip: (mark: CardMark) => void;
}) {
  if (!marks.length) return null;
  return (
    <section className="yokai-block" aria-label={title}>
      <h2>{title}</h2>
      <ul className="yokai-grid">
        {marks.map((mark) => (
          <YokaiOfferCard
            key={mark.slug}
            mark={mark}
            points={points}
            pending={pending}
            selected={selected === mark.slug}
            dimUnowned={mark.pricePoints <= 0}
            onSelect={() => onSelect(mark.slug)}
            onBuy={onBuy ? () => void onBuy(mark) : undefined}
            onEquip={() => void onEquip(mark)}
          />
        ))}
      </ul>
    </section>
  );
}

function mergeFrom(
  defs: { slug: string; name: string; imageUrl: string; pricePoints: number }[],
  catalog: MarkCatalog | null,
  demoOwned: Record<string, boolean>,
  demoEquipped: string | null,
): CardMark[] {
  const live = new Map((catalog?.marks ?? []).map((mark) => [mark.slug, mark]));
  const loggedIn = Boolean(catalog?.loggedIn);
  return defs.map((mark) => {
    const row = live.get(mark.slug);
    if (loggedIn && row) return toCard(row);
    return {
      id: row?.id ?? mark.slug,
      slug: mark.slug,
      name: mark.name,
      imageUrl: mark.imageUrl,
      pricePoints: mark.pricePoints,
      owned: demoOwned[mark.slug] ?? false,
      equipped: demoEquipped === mark.slug,
    };
  });
}

function toCard(mark: MarkCatalogItem): CardMark {
  return {
    id: mark.id,
    slug: mark.slug,
    name: mark.name,
    imageUrl: mark.imageUrl,
    pricePoints: mark.pricePoints,
    ...(mark.basePrice ? { basePrice: mark.basePrice } : {}),
    owned: mark.owned,
    equipped: mark.equipped,
  };
}
