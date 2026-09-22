"use client";

import { useState } from "react";
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
import type { MarkCatalog, MarkCatalogItem } from "@/lib/marks";

export function MarkShop({
  asPage = false,
  initial,
}: {
  asPage?: boolean;
  initial?: MarkCatalog;
}) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<MarkCatalog | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

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

  const grid = catalog ? (
    <MarkGrid catalog={catalog} error={error} pending={pending} onAct={act} />
  ) : (
    <Button type="button" size="touch" onClick={() => void load()}>
      상점 불러오기
    </Button>
  );

  if (asPage) return grid;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="touch" />}>마크 상점</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>마크 상점</DialogTitle>
          <DialogDescription>포인트로 마크를 사고 프로필에 착용합니다.</DialogDescription>
        </DialogHeader>
        {grid}
      </DialogContent>
    </Dialog>
  );
}

function MarkGrid({
  catalog,
  error,
  pending,
  onAct,
}: {
  catalog: MarkCatalog;
  error: string | null;
  pending: string | null;
  onAct: (id: string, path: "buy" | "equip") => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        보유 포인트 <strong className="text-foreground">{catalog.points.toLocaleString()}</strong> · Lv.
        {catalog.level}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalog.marks.map((mark: MarkCatalogItem) => (
          <li key={mark.id} className="rounded-xl border border-border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark.imageUrl} alt="" className="mx-auto size-12" />
            <p className="mt-2 text-center text-sm font-medium">{mark.name}</p>
            <p className="text-center text-xs text-muted-foreground">
              {mark.pricePoints}P · Lv.{mark.minLevel}+
            </p>
            <div className="mt-2 flex justify-center">
              {mark.equipped ? (
                <span className="inline-flex h-11 items-center rounded-lg bg-primary/15 px-3 text-sm text-primary">
                  착용 중
                </span>
              ) : mark.owned ? (
                <Button type="button" size="sm" className="h-11" disabled={pending !== null} onClick={() => onAct(mark.id, "equip")}>
                  착용
                </Button>
              ) : (
                <Button type="button" size="sm" variant="outline" className="h-11" disabled={pending !== null} onClick={() => onAct(mark.id, "buy")}>
                  구매
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
