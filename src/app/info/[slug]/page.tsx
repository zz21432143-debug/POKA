import { redirect } from "next/navigation";

export default async function InfoSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "news" || slug === "tips" || slug === "guide") redirect("/info/guide");
  if (slug === "dealers") redirect("/info/dealers");
  redirect("/info/guide");
}
