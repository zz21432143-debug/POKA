import { replaceTo } from "@/lib/history-redirect";

export default async function InfoSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "news" || slug === "tips" || slug === "guide") replaceTo("/info/guide");
  if (slug === "dealers") replaceTo("/info/dealers");
  replaceTo("/info/guide");
}
