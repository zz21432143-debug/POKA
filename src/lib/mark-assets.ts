export const DEFAULT_MARK_SRC = "/marks/default.svg";
export const OPERATOR_MARK_SRC = "/marks/operator.svg";

export const TEAM_MARK_FILES = [
  { slug: "team-a", name: "TOP", imageUrl: "/images/badges/team_1.png", svg: "/marks/team-top.svg" },
  { slug: "team-b", name: "PLIME", imageUrl: "/images/badges/team_2.png", svg: "/marks/team-plime.svg" },
  { slug: "team-c", name: "HAM", imageUrl: "/images/badges/team_3.png", svg: "/marks/team-ham.svg" },
  { slug: "team-d", name: "ROCKET", imageUrl: "/images/badges/team_4.png", svg: "/marks/team-rocket.svg" },
  { slug: "team-e", name: "GUNNER", imageUrl: "/images/badges/team_5.png", svg: "/marks/team-gunner.svg" },
  { slug: "team-f", name: "DOO", imageUrl: "/images/badges/team_6.png", svg: "/marks/team-doo.svg" },
] as const;

export function publicMarkUrl(url?: string | null, slug?: string | null) {
  const trimmed = url?.trim() ?? "";
  const team = TEAM_MARK_FILES.find(
    (row) => row.slug === slug || row.imageUrl === trimmed || row.svg === trimmed,
  );
  if (team) return team.imageUrl;
  if (!trimmed) return DEFAULT_MARK_SRC;
  return trimmed;
}

export function displayMarkSrc(opts: { isMaster?: boolean; profileMarkImageUrl?: string | null }) {
  return publicMarkUrl(opts.profileMarkImageUrl);
}
