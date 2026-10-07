import type { LegalSection } from "@/lib/legal";
import { LEGAL_EFFECTIVE_DATE, LEGAL_OPERATOR } from "@/lib/legal";

export function LegalDocument({
  heading,
  sections,
}: {
  heading: string;
  sections: LegalSection[];
}) {
  return (
    <div className="space-y-4 text-[15px] leading-7">
      <p className="text-sm text-muted-foreground">
        {LEGAL_OPERATOR} · 시행일 {LEGAL_EFFECTIVE_DATE}
      </p>
      <h2 className="text-base font-semibold">{heading}</h2>
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="font-semibold">{section.title}</h3>
          <p className="mt-1">{section.body}</p>
        </section>
      ))}
    </div>
  );
}
