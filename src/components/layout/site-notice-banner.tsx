export function SiteNoticeBanner({ text }: { text: string | null | undefined }) {
  const value = text?.trim();
  if (!value) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <p className="mx-auto max-w-[1320px] px-3 py-2 text-center text-sm font-medium text-amber-950 sm:px-5">
        {value}
      </p>
    </div>
  );
}
