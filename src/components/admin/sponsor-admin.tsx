"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLACEMENT_IMAGE, PLACEMENT_META, SPONSOR_PLACEMENTS, type SponsorPlacement } from "@/lib/inventory-policy";
import { SizeTag } from "@/components/admin/size-tag";
import { PromoImageUpload } from "@/components/promo/promo-image-upload";

/** 직판 소재 사진: 올리면 칸 크기에 맞춰 자동 정렬. 저장 버튼으로 함께 저장됩니다. */
function SponsorImageField({ placement, initial, size }: { placement: SponsorPlacement; initial: string; size: string }) {
  const [url, setUrl] = useState(initial);
  const box = PLACEMENT_IMAGE[placement];
  return (
    <div>
      <input type="hidden" name="imageUrl" value={url} />
      <PromoImageUpload
        value={url}
        onChange={setUrl}
        width={box.width}
        height={box.height}
        title={placement === "NATIVE" ? "가로 배너 사진 (선택)" : "광고 사진"}
        sizeLabel={size.replace(/ · .*$/, "")}
        showUrl
      />
      <p className="mt-1 text-xs text-muted-foreground">사진을 올리거나 뺀 뒤 아래 저장을 눌러야 반영됩니다.</p>
    </div>
  );
}

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
            {meta?.size ? <SizeTag>{meta.size}</SizeTag> : null}
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
              <SponsorImageField placement={unit.placement as SponsorPlacement} initial={unit.imageUrl ?? ""} size={meta?.size ?? ""} />
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
