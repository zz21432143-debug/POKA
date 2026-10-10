import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { TERMS_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">이용약관</h1>
      <div className="mt-6">
        <LegalDocument heading="POKA 이용약관" sections={TERMS_SECTIONS} />
      </div>
    </article>
  );
}
