"use client";

import { AdvertiseForm } from "@/components/ads/advertise-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AdvertiseInquiryDialog({
  triggerClassName,
  triggerLabel = "제휴 / 광고 문의하기",
}: {
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={triggerClassName} type="button">
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>제휴 / 광고 문의</DialogTitle>
          <DialogDescription>
            광고·제휴는 운영자와 따로 협의한 뒤에만 진행합니다. 단가는 공개하지 않습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
          <AdvertiseForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdvertiseInquiryCta() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <AdvertiseInquiryDialog
        triggerClassName="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white"
        triggerLabel="제휴 / 광고 문의하기"
      />
    </div>
  );
}
