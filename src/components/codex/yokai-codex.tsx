"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AchievementCards } from "@/components/shop/yokai-achievements";
import { YokaiMarkFrame } from "@/components/shop/yokai-mark-frame";
import type { MarkCatalog } from "@/lib/mark-categories";
import { YOKAI_ACHIEVEMENTS } from "@/lib/yokai-achievements";
import { YOKAI_MARKS, isYokaiSlug } from "@/lib/yokai-marks";

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
  const loggedIn = Boolean(catalog?.loggedIn);

  const ownedSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const mark of catalog?.marks ?? []) {
      if (mark.owned) set.add(mark.slug);
    }
    return set;
  }, [catalog]);

  const collected = YOKAI_MARKS.filter((mark) => ownedSlugs.has(mark.slug)).length;
  const achievements = YOKAI_ACHIEVEMENTS.map((def) => {
    const row = (catalog?.marks ?? []).find((mark) => mark.slug === def.slug);
    const owned = Boolean(row?.owned);
    return {
      ...def,
      id: row?.id ?? def.slug,
      owned,
      equipped: Boolean(row?.equipped),
      ready: loggedIn && collected >= def.required && !owned,
    };
  });
  const preview = achievements.find((mark) => mark.slug === selected) ?? achievements[0]!;

  async function reload() {
    const response = await fetch("/api/marks");
    setCatalog((await response.json()) as MarkCatalog);
  }

  async function claim(slug: string) {
    const mark = achievements.find((item) => item.slug === slug);
    if (!mark?.ready) return;
    setPending(slug + "claim");
    setError(null);
    try {
      const response = await fetch("/api/marks/achievements/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "보상을 받지 못했습니다.");
      await reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "보상을 받지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  async function equip(slug: string) {
    const mark = achievements.find((item) => item.slug === slug);
    if (!mark?.owned || mark.id === mark.slug) return;
    setPending(slug + "equip");
    setError(null);
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

  return (
    <section className="yokai-shop">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">108요괴</p>
          <h1>요괴 도감</h1>
          <p>
            {nickname} · 일반 요괴 마크 {collected} / {YOKAI_MARKS.length}종. 5종에 염라대왕, 10종에 구미호가 열립니다.
          </p>
        </div>
        <Link href="/shop" className="yokai-buy" style={{ width: "auto", padding: "0 1rem" }}>
          마크 상점
        </Link>
      </header>
      {error ? <p className="yokai-error">{error}</p> : null}
      <AchievementCards
        collected={collected}
        items={achievements}
        pending={pending}
        selected={preview.slug}
        onSelect={setSelected}
        onClaim={(slug) => void claim(slug)}
        onEquip={(slug) => void equip(slug)}
      />
      {!loggedIn ? <p className="yokai-note">수집 현황과 보상은 로그인 후 이 도감에 기록됩니다.</p> : null}
      <section className="yokai-block" aria-label="일반 요괴 마크">
        <h2>일반 요괴 마크</h2>
        <ul className="yokai-grid">
          {(catalog?.marks ?? YOKAI_MARKS.map((mark) => ({ ...mark, id: mark.slug, owned: false }))).filter((mark) =>
            isYokaiSlug(mark.slug),
          ).map((mark) => (
            <li key={mark.slug}>
              <article className="yokai-card">
                <YokaiMarkFrame
                  src={mark.imageUrl}
                  alt={mark.owned ? mark.name : `${mark.name} 실루엣`}
                  dimmed={!mark.owned}
                />
                <h3>{mark.name}</h3>
                <p className="yokai-price">{mark.owned ? "수집함" : "미수집"}</p>
                <div className="yokai-actions" aria-hidden="true" />
              </article>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
