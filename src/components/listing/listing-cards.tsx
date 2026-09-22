import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatWon } from "@/lib/jobs";
import { splitCsv } from "@/lib/listing";

export type ListingCard = {
  id: string;
  title: string;
  jobPositions: string | null;
  jobLocation: string | null;
  jobWorkType: string | null;
  jobPayType: string | null;
  jobPayAmount: string | null;
  jobAlwaysOpen: boolean;
  jobWorkDate: string | null;
  jobFilled: boolean;
  authorNickname: string | null;
};

export function ListingCards({
  items,
  emptyText,
}: {
  items: ListingCard[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {items.map((item) => {
        const tags = [
          ...splitCsv(item.jobPositions),
          ...splitCsv(item.jobLocation),
          item.jobWorkType,
          item.jobPayType === "추후 협의"
            ? "추후 협의"
            : item.jobPayType
              ? `${item.jobPayType} ${formatWon(item.jobPayAmount) || item.jobPayAmount || ""}`.trim()
              : null,
          item.jobAlwaysOpen ? "상시 모집" : item.jobWorkDate,
        ].filter((value): value is string => Boolean(value));
        return (
          <li key={item.id}>
            <Link
              href={`/posts/${item.id}`}
              className="touch-target block rounded-xl border border-border bg-card p-3 hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                {item.jobFilled ? <Badge variant="secondary">마감</Badge> : <Badge>모집중</Badge>}
              </div>
              <p className="mt-2 text-lg font-semibold">{item.title}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Badge variant="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">{item.authorNickname ?? "회원"}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
