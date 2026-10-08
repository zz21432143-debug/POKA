"use client";

import type { MouseEvent } from "react";
import { cn } from "cn";

export type AchievementCardModel = {
  slug: string;
  name: string;
  achievement: string;
  imageUrl: string;
  required: number;
  owned: boolean;
  equipped: boolean;
  ready: boolean;
};

export function AchievementCards({
  collected,
  items,
  pending,
  selected,
  onSelect,
  onClaim,
  onEquip,
}: {
  collected: number;
  items: AchievementCardModel[];
  pending: string | null;
  selected: string | null;
  onSelect: (slug: string) => void;
  onClaim: (slug: string) => void;
  onEquip: (slug: string) => void;
}) {
  return (
    <section className="yokai-block" aria-label="요괴 도감 업적">
      <h2>요괴 도감 · 수집 업적</h2>
      <p className="yokai-note">일반 요괴 마크 {collected.toLocaleString()}종 수집. 업적 마크는 비매품입니다.</p>
      <ul className="yokai-grid">
        {items.map((mark) => (
          <li key={mark.slug}>
            <article
              className={cn("yokai-card", selected === mark.slug && "is-selected", !mark.owned && !mark.ready && "is-locked")}
              onClick={() => onSelect(mark.slug)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mark.imageUrl}
                alt={mark.owned || mark.ready ? mark.name : `${mark.name} 실루엣`}
                width={96}
                height={96}
                className={mark.owned || mark.ready ? undefined : "yokai-locked"}
              />
              <h3>{mark.name}</h3>
              <p className="yokai-price">{mark.achievement}</p>
              <AchievementActions
                mark={mark}
                pending={pending}
                onClaim={(event) => {
                  event.stopPropagation();
                  onClaim(mark.slug);
                }}
                onEquip={(event) => {
                  event.stopPropagation();
                  onEquip(mark.slug);
                }}
              />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AchievementActions({
  mark,
  pending,
  onClaim,
  onEquip,
}: {
  mark: AchievementCardModel;
  pending: string | null;
  onClaim: (event: MouseEvent<HTMLButtonElement>) => void;
  onEquip: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  if (mark.equipped) {
    return (
      <div className="yokai-actions">
        <span className="yokai-equipped">착용 중</span>
      </div>
    );
  }
  if (mark.owned) {
    return (
      <div className="yokai-actions">
        <span className="yokai-owned">보유 중</span>
        <button type="button" className="yokai-buy" disabled={pending !== null} onClick={onEquip}>
          {pending === mark.slug + "equip" ? "장착 중…" : "장착하기"}
        </button>
      </div>
    );
  }
  if (mark.ready) {
    return (
      <div className="yokai-actions">
        <button type="button" className="yokai-buy yokai-claim" disabled={pending !== null} onClick={onClaim}>
          {pending === mark.slug + "claim" ? "받는 중…" : "보상 받기"}
        </button>
      </div>
    );
  }
  return (
    <div className="yokai-actions">
      <span className="yokai-lock-tag">🔒 마크 {mark.required}종 수집 시 해금</span>
    </div>
  );
}
