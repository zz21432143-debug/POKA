import type { MouseEvent } from "react";
import { cn } from "cn";
import { YokaiMarkFrame } from "@/components/shop/yokai-mark-frame";
import { markOffer, markPriceTag } from "@/lib/yokai-catalog";

export type CardMark = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
  owned: boolean;
  equipped: boolean;
};

export function YokaiOfferCard({
  mark,
  points,
  pending,
  selected = false,
  dimUnowned = false,
  onSelect,
  onBuy,
  onEquip,
}: {
  mark: CardMark;
  points: number;
  pending: string | null;
  selected?: boolean;
  dimUnowned?: boolean;
  onSelect?: () => void;
  onBuy?: () => void;
  onEquip?: () => void;
}) {
  const offer = markOffer(mark.slug);
  const canBuy = offer === "shop" && !mark.owned && Boolean(onBuy);
  const canAfford = points >= mark.pricePoints;
  return (
    <li>
      <article className={cn("yokai-card", selected && "is-selected")} onClick={onSelect}>
        <YokaiMarkFrame
          src={mark.imageUrl}
          alt={mark.name}
          dimmed={dimUnowned && !mark.owned}
        />
        <h3>{mark.name}</h3>
        <p className="yokai-price">{markPriceTag(mark)}</p>
        <div className="yokai-actions">
          <CardButton
            mark={mark}
            offer={offer}
            canBuy={canBuy}
            canAfford={canAfford}
            pending={pending}
            onBuy={(event) => {
              event.stopPropagation();
              onBuy?.();
            }}
            onEquip={(event) => {
              event.stopPropagation();
              onEquip?.();
            }}
          />
        </div>
      </article>
    </li>
  );
}

function CardButton({
  mark,
  offer,
  canBuy,
  canAfford,
  pending,
  onBuy,
  onEquip,
}: {
  mark: CardMark;
  offer: ReturnType<typeof markOffer>;
  canBuy: boolean;
  canAfford: boolean;
  pending: string | null;
  onBuy: (event: MouseEvent<HTMLButtonElement>) => void;
  onEquip: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const busy = pending !== null;
  if (mark.equipped) {
    return <span className="yokai-equipped">착용 중</span>;
  }
  if (mark.owned) {
    return (
      <button type="button" className="yokai-buy" disabled={busy} onClick={onEquip}>
        {pending === mark.id + "equip" || pending === mark.slug + "equip" ? "장착 중…" : "장착하기"}
      </button>
    );
  }
  if (canBuy) {
    return (
      <button type="button" className="yokai-buy" disabled={busy || !canAfford} onClick={onBuy}>
        {pending === mark.id + "buy" ? "구매 중…" : canAfford ? "구매하기" : "포인트 부족"}
      </button>
    );
  }
  return (
    <span className="yokai-owned">{offer === "ranking" ? "랭킹 보상" : "비매품"}</span>
  );
}
