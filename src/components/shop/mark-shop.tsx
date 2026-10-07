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
  SHOP_KINDS,
  marksInCategory,
  type CosmeticCatalogItem,
  type MarkCatalog,
  type MarkCatalogItem,
  type MarkCategoryId,
  type ShopKindId,
} from "@/lib/mark-categories";
import { levelTitle } from "@/lib/levels";

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
  const [kind, setKind] = useState<ShopKindId>("MARK");
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
    <ShopBody
      catalog={catalog}
      error={error}
      pending={pending}
      kind={kind}
      category={category}
      onKind={setKind}
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
            마크를 구매·착용하고, 이후 프레임·이펙트 상품도 같은 상점에서 장착합니다.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

function ShopBody({
  catalog,
  error,
  pending,
  kind,
  category,
  onKind,
  onCategory,
  onAct,
}: {
  catalog: MarkCatalog;
  error: string | null;
  pending: string | null;
  kind: ShopKindId;
  category: MarkCategoryId;
  onKind: (id: ShopKindId) => void;
  onCategory: (id: MarkCategoryId) => void;
  onAct: (id: string, path: "buy" | "equip") => void;
}) {
  const marks = useMemo(
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
          {levelTitle(catalog.level)} · Lv.{catalog.level} · 마크 3,000P · 하루 최대 375P
          {catalog.equippedMarkId ? " · 착용 중" : ""}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Tabs value={kind} onValueChange={(value) => onKind(value as ShopKindId)} className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {SHOP_KINDS.filter(
            (tab) =>
              tab.id === "MARK" ||
              (tab.id === "FRAME" && catalog.frames.length > 0) ||
              (tab.id === "EFFECT" && catalog.effects.length > 0),
          ).map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="min-h-11 flex-none px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="MARK" className="flex flex-col gap-4">
          <Tabs
            value={category}
            onValueChange={(value) => onCategory(value as MarkCategoryId)}
            className="gap-3"
          >
            <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
              {MARK_CATEGORIES.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="min-h-11 flex-none px-3">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {MARK_CATEGORIES.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                {tab.id === category ? (
                  marks.length === 0 ? (
                    <EmptyShop copy="이 분류에 등록된 마크가 없습니다." />
                  ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {marks.map((mark) => (
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
        </TabsContent>
        <TabsContent value="FRAME">
          <CosmeticShelf
            items={catalog.frames}
            empty="프로필 프레임(테두리) 상품이 곧 등록됩니다. 구매 후 equipped_frame_id 슬롯에 착용됩니다."
            points={catalog.points}
          />
        </TabsContent>
        <TabsContent value="EFFECT">
          <CosmeticShelf
            items={catalog.effects}
            empty="후광·모션 이펙트 상품이 곧 등록됩니다. 구매 후 equipped_effect_id 슬롯에 착용됩니다."
            points={catalog.points}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CosmeticShelf({
  items,
  empty,
  points,
}: {
  items: CosmeticCatalogItem[];
  empty: string;
  points: number;
}) {
  if (items.length === 0) return <EmptyShop copy={empty} />;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col rounded-2xl border border-border bg-white p-4 shadow-sm">
          <ShopPreview src={item.imageUrl} name={item.name} />
          <p className="mt-3 text-center text-sm font-semibold">{item.name}</p>
          <p className="text-center text-xs text-muted-foreground">
            {item.pricePoints === 0 ? "무료" : `${item.pricePoints.toLocaleString()} P`}
          </p>
          <div className="mt-3 flex justify-center">
            {item.equipped ? (
              <span className="inline-flex h-11 items-center rounded-lg bg-primary/15 px-3 text-sm font-medium text-primary">
                착용 중
              </span>
            ) : item.owned ? (
              <Button type="button" size="touch" disabled>
                장착하기
              </Button>
            ) : (
              <Button type="button" size="touch" variant="outline" disabled>
                {points >= item.pricePoints ? "준비 중" : "포인트 부족"}
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyShop({ copy }: { copy: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {copy}
    </p>
  );
}

function ShopPreview({ src, name }: { src: string | null; name: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-xl bg-muted/60 p-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={80}
          height={80}
          className="size-20 min-h-16 min-w-16 object-contain"
        />
      ) : (
        <span className="flex size-20 min-h-16 min-w-16 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          {name.slice(0, 1)}
        </span>
      )}
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
      <ShopPreview src={mark.imageUrl} name={mark.name} />
      <p className="mt-3 text-center text-sm font-semibold">{mark.name}</p>
      <p className="text-center text-xs text-muted-foreground">
        {mark.pricePoints === 0 ? "무료" : `${mark.pricePoints.toLocaleString()} P`}
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
