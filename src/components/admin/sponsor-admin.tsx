"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLACEMENT_META, SPONSOR_PLACEMENTS, type SponsorPlacement } from "@/lib/inventory-policy";

type Unit = {
  placement: string;
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: string;
  enabled: boolean;
};

export function SponsorAdmin({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function save(placement: string, form: FormData) {
    setPending(placement);
    setError(null);
    try {
      const response = await fetch("/api/admin/sponsors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement,
          imageUrl: String(form.get("imageUrl") ?? "").trim() || null,
          href: String(form.get("href") ?? "").trim() || "/advertise",
          title: String(form.get("title") ?? ""),
          advertiser: String(form.get("advertiser") ?? ""),
          mark: String(form.get("mark") ?? "제휴"),
          enabled: form.get("enabled") === "on",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "저장 실패");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <ul className="grid gap-3">
        {[...units]
          .sort(
            (a, b) =>
              SPONSOR_PLACEMENTS.indexOf(a.placement as SponsorPlacement) -
              SPONSOR_PLACEMENTS.indexOf(b.placement as SponsorPlacement),
          )
          .map((unit) => {
            const meta = PLACEMENT_META[unit.placement as SponsorPlacement];
            return (
          <li key={unit.placement} className="rounded-xl border border-border bg-card p-3">
            <p className="font-medium">{meta?.name ?? unit.placement}</p>
            <p className="mt-1 text-xs text-muted-foreground">{meta?.hint}</p>
            <form
              className="mt-3 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void save(unit.placement, new FormData(event.currentTarget));
              }}
            >
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked={unit.enabled} />
                사용
              </label>
              <div>
                <Label htmlFor={`${unit.placement}-title`}>제목</Label>
                <Input id={`${unit.placement}-title`} name="title" defaultValue={unit.title} className="mt-1" />
              </div>
              <div>
                <Label htmlFor={`${unit.placement}-advertiser`}>광고주</Label>
                <Input
                  id={`${unit.placement}-advertiser`}
                  name="advertiser"
                  defaultValue={unit.advertiser}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`${unit.placement}-image`}>
                  이미지 URL{unit.placement.startsWith("A") ? " (300×150)" : unit.placement === "SIDEBAR" ? " (300×250)" : " (선택)"}
                </Label>
                <Input
                  id={`${unit.placement}-image`}
                  name="imageUrl"
                  defaultValue={unit.imageUrl ?? ""}
                  className="mt-1"
                  placeholder="/images/posters/official-1.png"
                />
              </div>
              <div>
                <Label htmlFor={`${unit.placement}-href`}>링크</Label>
                <Input id={`${unit.placement}-href`} name="href" defaultValue={unit.href} className="mt-1" />
              </div>
              <div>
                <Label htmlFor={`${unit.placement}-mark`}>태그</Label>
                <select
                  id={`${unit.placement}-mark`}
                  name="mark"
                  defaultValue={unit.mark}
                  className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="제휴">제휴</option>
                  <option value="AD">AD</option>
                </select>
              </div>
              <Button type="submit" size="touch" disabled={pending === unit.placement}>
                {pending === unit.placement ? "저장 중…" : "저장"}
              </Button>
            </form>
          </li>
            );
          })}
      </ul>
    </div>
  );
}
