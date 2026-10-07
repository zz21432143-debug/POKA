import { LegalDocument } from "@/components/legal/legal-document";
import { PRIVACY_POLICY_SECTIONS } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">개인정보처리방침</h1>
      <div className="mt-6">
        <LegalDocument heading="POKA 개인정보처리방침" sections={PRIVACY_POLICY_SECTIONS} />
      </div>
    </article>
  );
}
