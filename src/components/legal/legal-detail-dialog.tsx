"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LegalDocument } from "@/components/legal/legal-document";
import type { LegalSection } from "@/lib/legal";

export function LegalDetailDialog({
  label,
  heading,
  sections,
}: {
  label: string;
  heading: string;
  sections: LegalSection[];
}) {
  return (
    <Dialog>
      <DialogTrigger
        className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-white px-3 text-xs font-semibold text-foreground hover:bg-muted"
        type="button"
      >
        {label}
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>필수 안내입니다. 닫기 전에 내용을 확인해 주세요.</DialogDescription>
        </DialogHeader>
        <LegalDocument heading={heading} sections={sections} />
      </DialogContent>
    </Dialog>
  );
}
