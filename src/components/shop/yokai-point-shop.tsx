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
  YOKAI_MARKS,
  isLegendSlug,
  isShopMarkSlug,
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
    [...regular, ...legends, ...rewards, ...kings].find((mark) => mark.slug === selected) ?? regular[0]!;
  const inventory = [...rewards, ...kings, ...legends, ...regular].filter((mark) => mark.owned);
  const others = (catalog?.marks ?? []).filter(
    (mark) => !isYokaiSlug(mark.slug) && !isLegendSlug(mark.slug) && !isAchievementSlug(mark.slug) && !isKingSlug(mark.slug),
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
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "구매에 실패했습니다.");
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

  return (
    <section className="yokai-shop">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">108요괴</p>
          <h1>포인트 상점</h1>
        </div>
        <p className="yokai-points">
          보유 포인트: <strong>{points.toLocaleString()} P</strong>
        </p>
      </header>

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
          <p className="yokai-preview-name">
            {preview.name} · {markPriceTag(preview)}
            {preview.equipped ? " · 착용 중" : preview.owned ? " · 보유 중" : ""}
          </p>
        </aside>

        <MarkGrid title="레벨 보상" marks={rewards} points={points} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
        <MarkGrid title="랭킹 보상" marks={kings} points={points} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />

        <section className="yokai-block" aria-label="내 인벤토리">
          <h2>내 인벤토리</h2>
          {inventory.length === 0 ? (
            <p className="yokai-note">아직 보유한 마크가 없습니다.</p>
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

        <MarkGrid
          title="한국 전설"
          marks={legends}
          points={points}
          pending={pending}
          selected={selected}
          onSelect={setSelected}
          onBuy={buy}
          onEquip={equip}
        />
        <MarkGrid
          title="마크 상점"
          marks={regular}
          points={points}
          pending={pending}
          selected={selected}
          onSelect={setSelected}
          onBuy={buy}
          onEquip={equip}
        />
      </div>

      {error ? <p className="yokai-error">{error}</p> : null}

      <div className="yokai-extra">
        <div className="yokai-extra-body" style={{ paddingTop: "1rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{NICKNAME_TICKET_NAME}</p>
              <p className="yokai-note">
                {NICKNAME_TICKET_PRICE.toLocaleString()}P · 보유 {catalog?.nicknameTickets ?? 0}장.
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
        </div>
      </div>

      {loggedIn && others.length > 0 ? (
        <details className="yokai-extra">
          <summary>다른 마크</summary>
          <div className="yokai-extra-body">
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
          </div>
        </details>
      ) : null}
    </section>
  );
}

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
    owned: mark.owned,
    equipped: mark.equipped,
  };
}
