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
      <p className="ink-panel rounded-xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
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
              className="ink-panel touch-target group block overflow-hidden rounded-2xl hover:bg-[#241c1e]"
            >
              <div className="flex aspect-[5/7] items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={post.title} className="h-full w-full object-contain" />
              </div>
              <div className="p-3">
                <h2 className="text-lg font-bold leading-snug text-white">{post.title}</h2>
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
