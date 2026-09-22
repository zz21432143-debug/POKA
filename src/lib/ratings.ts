export const REVIEW_AXES = [
  { key: "ratingManner", label: "매너" },
  { key: "ratingService", label: "서비스" },
  { key: "ratingFacility", label: "시설" },
  { key: "ratingAtmosphere", label: "분위기" },
] as const;

export type ReviewRatings = {
  ratingManner: number | null;
  ratingService: number | null;
  ratingFacility: number | null;
  ratingAtmosphere: number | null;
};

export function overallRating(ratings: ReviewRatings): number | null {
  const values = REVIEW_AXES.map((axis) => ratings[axis.key]).filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}
