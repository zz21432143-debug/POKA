"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { YokaiOfferCard, type CardMark } from "@/components/shop/yokai-card";
import type { MarkCatalog, MarkCatalogItem } from "@/lib/mark-categories";
import { YOKAI_ACHIEVEMENTS } from "@/lib/yokai-achievements";
import { FOUR_KINGS_MARKS } from "@/lib/yokai-kings";
import { KOREAN_LEGEND_MARKS, YOKAI_MARKS } from "@/lib/yokai-marks";

export function YokaiCodex({
  initial,
  nickname,
}: {
  initial: MarkCatalog | null;
  nickname: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState(YOKAI_ACHIEVEMENTS[0]!.slug);

  const regular = useMemo(() => fromDefs(YOKAI_MARKS, catalog), [catalog]);
  const legends = useMemo(() => fromDefs(KOREAN_LEGEND_MARKS, catalog), [catalog]);
  const rewards = useMemo(
    () => fromDefs(YOKAI_ACHIEVEMENTS.map((mark) => ({ ...mark, pricePoints: 0 })), catalog),
    [catalog],
  );
  const kings = useMemo(
    () => fromDefs(FOUR_KINGS_MARKS.map((mark) => ({ ...mark, pricePoints: 0 })), catalog),
    [catalog],
  );

  async function equip(mark: CardMark) {
    if (!mark.owned || mark.id === mark.slug) return;
    setPending(mark.id + "equip");
    setError(null);
    try {
      const response = await fetch(`/api/marks/${mark.id}/equip`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "장착에 실패했습니다.");
      const next = await fetch("/api/marks");
      setCatalog((await next.json()) as MarkCatalog);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "장착에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="yokai-shop">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">108요괴</p>
          <h1>요괴 도감</h1>
          <p>{nickname}</p>
        </div>
        <Link href="/shop" className="yokai-buy" style={{ width: "auto", padding: "0 1rem" }}>
          마크 상점
        </Link>
      </header>
      {error ? <p className="yokai-error">{error}</p> : null}
      <CodexGrid title="레벨 보상" marks={rewards} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
      <CodexGrid title="랭킹 보상" marks={kings} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
      <CodexGrid title="한국 전설" marks={legends} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
      <CodexGrid title="일반 요괴 마크" marks={regular} pending={pending} selected={selected} onSelect={setSelected} onEquip={equip} />
    </section>
  );
}

function CodexGrid({
  title,
  marks,
  pending,
  selected,
  onSelect,
  onEquip,
}: {
  title: string;
  marks: CardMark[];
  pending: string | null;
  selected: string;
  onSelect: (slug: string) => void;
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
            points={0}
            pending={pending}
            selected={selected === mark.slug}
            dimUnowned
            onSelect={() => onSelect(mark.slug)}
            onEquip={() => void onEquip(mark)}
          />
        ))}
      </ul>
    </section>
  );
}

function fromDefs(
  defs: { slug: string; name: string; imageUrl: string; pricePoints: number }[],
  catalog: MarkCatalog | null,
): CardMark[] {
  const live = new Map((catalog?.marks ?? []).map((mark: MarkCatalogItem) => [mark.slug, mark]));
  return defs.map((mark) => {
    const row = live.get(mark.slug);
    return {
      id: row?.id ?? mark.slug,
      slug: mark.slug,
      name: mark.name,
      imageUrl: row?.imageUrl ?? mark.imageUrl,
      pricePoints: mark.pricePoints,
      owned: Boolean(row?.owned),
      equipped: Boolean(row?.equipped),
    };
  });
}
