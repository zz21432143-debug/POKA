import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { YOUTH_PROTECTION_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "청소년 보호정책" };

export default function YouthPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="break-words text-2xl font-semibold">청소년 보호정책</h1>
      <div className="mt-6">
        <LegalDocument heading="POKA 청소년 보호정책" sections={YOUTH_PROTECTION_SECTIONS} />
      </div>
    </article>
  );
}
