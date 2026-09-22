"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MARK_CATEGORIES,
  marksInCategory,
  type MarkCatalog,
  type MarkCatalogItem,
  type MarkCategoryId,
} from "@/lib/mark-categories";

export function MarkShop({
  asPage = false,
  initial,
  triggerClassName,
}: {
  asPage?: boolean;
  initial?: MarkCatalog;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MarkCatalog | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [category, setCategory] = useState<MarkCategoryId>("TEAM");

  async function load() {
    const response = await fetch("/api/marks");
    const payload = (await response.json()) as MarkCatalog;
    setCatalog(payload);
  }

  async function act(id: string, path: "buy" | "equip") {
    setPending(id + path);
    setError(null);
    try {
      const response = await fetch(`/api/marks/${id}/${path}`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "처리에 실패했습니다.");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  const body = catalog ? (
    <MarkGrid
      catalog={catalog}
      error={error}
      pending={pending}
      category={category}
      onCategory={setCategory}
      onAct={act}
    />
  ) : (
    <Button type="button" size="touch" onClick={() => void load()}>
      상점 불러오기
    </Button>
  );

  if (asPage) return body;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="touch" className={triggerClassName} />}
      >
        마크 상점
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>마크 상점</DialogTitle>
          <DialogDescription>
            포인트로 팀·레벨·특수 마크를 구매하고 닉네임 옆에 착용합니다.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function MarkGrid({
  catalog,
  error,
  pending,
  category,
  onCategory,
  onAct,
}: {
  catalog: MarkCatalog;
  error: string | null;
  pending: string | null;
  category: MarkCategoryId;
  onCategory: (id: MarkCategoryId) => void;
  onAct: (id: string, path: "buy" | "equip") => void;
}) {
  const items = useMemo(
    () => marksInCategory(catalog.marks, category),
    [catalog.marks, category],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground">보유 포인트</p>
          <p className="text-2xl font-semibold tracking-tight">
            {catalog.points.toLocaleString()}
            <span className="ml-1 text-sm font-medium text-muted-foreground">P</span>
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Lv.{catalog.level}
          {catalog.equippedMarkId ? " · 착용 마크 적용 중" : " · 미착용"}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Tabs
        value={category}
        onValueChange={(value) => onCategory(value as MarkCategoryId)}
        className="gap-4"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {MARK_CATEGORIES.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="min-h-11 flex-none px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {MARK_CATEGORIES.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            {tab.id === category ? (
              items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  이 카테고리에 등록된 마크가 없습니다.
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((mark) => (
                    <MarkCard
                      key={mark.id}
                      mark={mark}
                      pending={pending}
                      canAfford={catalog.points >= mark.pricePoints}
                      onAct={onAct}
                    />
                  ))}
                </ul>
              )
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function MarkCard({
  mark,
  pending,
  canAfford,
  onAct,
}: {
  mark: MarkCatalogItem;
  pending: string | null;
  canAfford: boolean;
  onAct: (id: string, path: "buy" | "equip") => void;
}) {
  const busy = pending !== null;
  return (
    <li className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex h-28 items-center justify-center rounded-xl bg-muted/60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark.imageUrl} alt={mark.name} className="max-h-24 max-w-[80%] object-contain" />
      </div>
      <p className="mt-3 text-center text-sm font-semibold">{mark.name}</p>
      <p className="text-center text-xs text-muted-foreground">
        {mark.pricePoints === 0 ? "무료" : `${mark.pricePoints.toLocaleString()} P`}
        {mark.minLevel > 1 ? ` · Lv.${mark.minLevel}+` : null}
      </p>
      <div className="mt-3 flex justify-center">
        {mark.equipped ? (
          <span className="inline-flex h-11 items-center rounded-lg bg-primary/15 px-3 text-sm font-medium text-primary">
            착용 중
          </span>
        ) : mark.owned ? (
          <Button
            type="button"
            size="touch"
            disabled={busy}
            onClick={() => onAct(mark.id, "equip")}
          >
            {pending === mark.id + "equip" ? "장착 중…" : "장착하기"}
          </Button>
        ) : (
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={busy || !canAfford}
            onClick={() => onAct(mark.id, "buy")}
          >
            {pending === mark.id + "buy" ? "구매 중…" : canAfford ? "구매하기" : "포인트 부족"}
          </Button>
        )}
      </div>
    </li>
  );
}
