"use client";

import Link from "next/link";
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
            직판 제휴는 여기로 접수합니다. 구글 애드센스는 연락이 오지 않고, 안 판 잔여 칸에만 코드로
            들어갑니다.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pr-1">
          <AdvertiseForm />
          <p className="mt-3 text-xs text-muted-foreground">
            구좌·단가 안내는{" "}
            <Link href="/advertise" className="text-primary">
              제휴 및 광고 안내
            </Link>
            에 있습니다.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdvertiseInquiryCta({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <AdvertiseInquiryDialog
        triggerClassName="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-white"
        triggerLabel="제휴 / 광고 문의하기"
      />
      {compact ? null : (
        <Link href="/advertise" className="text-xs font-medium text-primary hover:underline">
          상품·단가 보기
        </Link>
      )}
    </div>
  );
}
