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
        등록된 홍보글이 없습니다.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {posts.map((post) => {
        const image = post.bannerImageUrl || "/banners/slot-1.svg";
        const summary = post.promoTag || post.content.slice(0, 24);
        return (
          <li key={post.id}>
            <Link
              href={`/posts/${post.id}`}
              className="touch-target group block overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={post.title}
                className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]"
              />
              <div className="p-3">
                <h2 className="text-lg font-semibold">{post.title}</h2>
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
