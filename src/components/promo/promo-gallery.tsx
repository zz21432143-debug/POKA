import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export type PromoCard = {
  id: string;
  title: string;
  bannerImageUrl: string | null;
  promoLocation: string | null;
  promoTag: string | null;
  content: string;
};

export function PromoGallery({ posts }: { posts: PromoCard[] }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        등록된 포스터가 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {posts.map((post) => {
        const image = post.bannerImageUrl || "/images/posters/official-6.jpg";
        const summary = post.promoTag || post.promoLocation;
        return (
          <li key={post.id} className="mx-auto w-full max-w-[320px]">
            <Link
              href={`/posts/${post.id}`}
              className="touch-target group block overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/50"
            >
              <div className="flex aspect-[5/7] items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={post.title} className="h-full w-full object-contain" />
              </div>
              <div className="p-3">
                <h2 className="text-base font-semibold leading-snug">{post.title}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.promoLocation ? <Badge variant="secondary">{post.promoLocation}</Badge> : null}
                  {summary ? <Badge variant="outline">{summary}</Badge> : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
