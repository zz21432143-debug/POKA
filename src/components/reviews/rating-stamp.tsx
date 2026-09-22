import { overallRating, type ReviewRatings } from "@/lib/ratings";

export function RatingStamp({ ratings, size = "md" }: { ratings: ReviewRatings; size?: "sm" | "md" }) {
  const score = overallRating(ratings);
  if (score == null) return null;
  const box = size === "sm" ? "size-11 text-sm" : "size-14 text-base";
  return (
    <span
      className={`inline-flex ${box} shrink-0 rotate-[-8deg] items-center justify-center rounded-full border-2 border-primary bg-primary/15 font-bold text-primary shadow-[0_0_0_3px_#121315]`}
      title={`종합 ${score}`}
    >
      {score.toFixed(1)}
    </span>
  );
}
