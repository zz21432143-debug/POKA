"use client";

import { LegalDetailDialog } from "@/components/legal/legal-detail-dialog";
import { PRIVACY_POLICY_SECTIONS, TERMS_SECTIONS, YOUTH_PROTECTION_SECTIONS } from "@/lib/legal";

const triggerClassName =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground";

export function FooterLegalLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <LegalDetailDialog
        label="이용약관"
        heading="POKA 이용약관"
        sections={TERMS_SECTIONS}
        triggerClassName={triggerClassName}
      />
      <LegalDetailDialog
        label="개인정보 처리방침"
        heading="개인정보처리방침"
        sections={PRIVACY_POLICY_SECTIONS}
        triggerClassName={triggerClassName}
      />
      <LegalDetailDialog
        label="청소년 보호정책"
        heading="청소년 보호정책"
        sections={YOUTH_PROTECTION_SECTIONS}
        triggerClassName={triggerClassName}
      />
    </div>
  );
}
