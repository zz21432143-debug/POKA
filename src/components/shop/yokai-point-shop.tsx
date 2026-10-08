"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { MarkCatalog, MarkCatalogItem } from "@/lib/mark-categories";
import { NICKNAME_TICKET_NAME, NICKNAME_TICKET_PRICE } from "@/lib/nickname-change";
import { YOKAI_MARKS, isYokaiSlug } from "@/lib/yokai-marks";
import { cn } from "cn";

type ShopMark = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
  owned: boolean;
  equipped: boolean;
};

export function YokaiPointShop({
  initial,
  nickname,
}: {
  initial: MarkCatalog | null;
  nickname: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MarkCatalog | null>(initial);
  const [demoPoints, setDemoPoints] = useState(1500);
  const [demoOwned, setDemoOwned] = useState<Record<string, boolean>>({});
  const [demoEquipped, setDemoEquipped] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => {
    const worn = initial?.marks.find((mark) => mark.equipped && isYokaiSlug(mark.slug));
    return worn?.slug ?? YOKAI_MARKS[0]!.slug;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const loggedIn = Boolean(catalog?.loggedIn);
  const points = loggedIn ? (catalog?.points ?? 0) : demoPoints;

  const marks = useMemo(() => mergeMarks(catalog, demoOwned, demoEquipped), [catalog, demoOwned, demoEquipped]);
  const preview =
    marks.find((mark) => mark.slug === selected) ??
    (catalog?.marks ?? []).find((mark) => mark.slug === selected) ??
    marks[0]!;
  const others = (catalog?.marks ?? []).filter((mark) => !isYokaiSlug(mark.slug));

  async function reload() {
    const response = await fetch("/api/marks");
    const payload = (await response.json()) as MarkCatalog;
    setCatalog(payload);
  }

  async function buy(mark: ShopMark) {
    if (points < mark.pricePoints || mark.owned) return;
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

  async function equip(mark: ShopMark) {
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
          <p>프로필 마크를 고르면 아래 미리보기가 바로 바뀝니다. 앞줄 500P, 뒷줄 1,000P.</p>
        </div>
        <p className="yokai-points">
          보유 포인트: <strong>{points.toLocaleString()} P</strong>
        </p>
      </header>

      <div className="yokai-layout">
        <aside className="yokai-preview" aria-label="내 프로필 미리보기">
          <h2>내 프로필 미리보기</h2>
          <div className="yokai-mini">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.imageUrl} alt={preview.name} width={64} height={64} />
            <strong>{nickname}</strong>
          </div>
          <p className="yokai-preview-name">
            {preview.name} · {preview.pricePoints.toLocaleString()} P
            {preview.equipped ? " · 착용 중" : preview.owned ? " · 보유 중" : ""}
          </p>
        </aside>

        <ul className="yokai-grid">
          {marks.map((mark) => {
            const canAfford = points >= mark.pricePoints;
            const busy = pending !== null;
            return (
              <li key={mark.slug}>
                <article
                  className={cn("yokai-card", selected === mark.slug && "is-selected")}
                  onClick={() => setSelected(mark.slug)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mark.imageUrl} alt={mark.name} width={96} height={96} />
                  <h3>{mark.name}</h3>
                  <p className="yokai-price">{mark.pricePoints.toLocaleString()} P</p>
                  {mark.equipped ? (
                    <span className="yokai-owned">착용 중</span>
                  ) : mark.owned ? (
                    <button
                      type="button"
                      className="yokai-buy"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        void equip(mark);
                      }}
                    >
                      {pending === mark.id + "equip" ? "장착 중…" : "장착하기"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="yokai-buy"
                      disabled={busy || !canAfford}
                      onClick={(event) => {
                        event.stopPropagation();
                        void buy(mark);
                      }}
                    >
                      {pending === mark.id + "buy" ? "구매 중…" : canAfford ? "구매하기" : "포인트 부족"}
                    </button>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      </div>

      {error ? <p className="yokai-error">{error}</p> : null}
      {loggedIn ? null : (
        <p className="yokai-note">
          지금은 1,500P 미리보기입니다.{" "}
          <Link href="/login?next=/shop" className="font-semibold text-[#C59B27]">
            로그인
          </Link>
          하면 실제 포인트로 구매·장착됩니다.
        </p>
      )}

      <div className="yokai-extra">
        <div className="yokai-extra-body" style={{ paddingTop: "1rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{NICKNAME_TICKET_NAME}</p>
              <p className="yokai-note">
                {NICKNAME_TICKET_PRICE.toLocaleString()}P · 보유 {catalog?.nicknameTickets ?? 0}장. 최초 1회 닉네임
                변경은 무료입니다.
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
          <summary>다른 마크 · 3,000P</summary>
          <div className="yokai-extra-body">
            <ul className="yokai-grid">
              {others.map((mark) => (
                <OtherMark
                  key={mark.id}
                  mark={mark}
                  points={points}
                  pending={pending}
                  onPreview={() => setSelected(mark.slug)}
                  onBuy={() => void buy(toShopMark(mark))}
                  onEquip={() => void equip(toShopMark(mark))}
                />
              ))}
            </ul>
          </div>
        </details>
      ) : null}
    </section>
  );
}

function OtherMark({
  mark,
  points,
  pending,
  onPreview,
  onBuy,
  onEquip,
}: {
  mark: MarkCatalogItem;
  points: number;
  pending: string | null;
  onPreview: () => void;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const canAfford = points >= mark.pricePoints;
  return (
    <li>
      <article className="yokai-card" onClick={onPreview}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark.imageUrl} alt={mark.name} width={96} height={96} />
        <h3>{mark.name}</h3>
        <p className="yokai-price">{mark.pricePoints.toLocaleString()} P</p>
        {mark.equipped ? (
          <span className="yokai-owned">착용 중</span>
        ) : mark.owned ? (
          <button
            type="button"
            className="yokai-buy"
            disabled={pending !== null}
            onClick={(event) => {
              event.stopPropagation();
              onEquip();
            }}
          >
            장착하기
          </button>
        ) : (
          <button
            type="button"
            className="yokai-buy"
            disabled={pending !== null || !canAfford}
            onClick={(event) => {
              event.stopPropagation();
              onBuy();
            }}
          >
            {canAfford ? "구매하기" : "포인트 부족"}
          </button>
        )}
      </article>
    </li>
  );
}

function mergeMarks(
  catalog: MarkCatalog | null,
  demoOwned: Record<string, boolean>,
  demoEquipped: string | null,
): ShopMark[] {
  const live = new Map((catalog?.marks ?? []).filter((mark) => isYokaiSlug(mark.slug)).map((mark) => [mark.slug, mark]));
  const loggedIn = Boolean(catalog?.loggedIn);
  return YOKAI_MARKS.map((mark) => {
    const row = live.get(mark.slug);
    if (loggedIn && row) return toShopMark(row);
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

function toShopMark(mark: MarkCatalogItem): ShopMark {
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
