export const DEFAULT_MARK_SRC = "/marks/default.svg";
export const OPERATOR_MARK_SRC = "/marks/operator.svg";

const BROKEN_MARK_PREFIXES = ["/images/badges/"];

export const TEAM_MARK_FILES = [
  { slug: "team-a", name: "TOP", imageUrl: "/marks/team-top.svg", legacy: "/images/badges/team_1.png" },
  { slug: "team-b", name: "PLIME", imageUrl: "/marks/team-plime.svg", legacy: "/images/badges/team_2.png" },
  { slug: "team-c", name: "HAM", imageUrl: "/marks/team-ham.svg", legacy: "/images/badges/team_3.png" },
  { slug: "team-d", name: "ROCKET", imageUrl: "/marks/team-rocket.svg", legacy: "/images/badges/team_4.png" },
  { slug: "team-e", name: "GUNNER", imageUrl: "/marks/team-gunner.svg", legacy: "/images/badges/team_5.png" },
  { slug: "team-f", name: "DOO", imageUrl: "/marks/team-doo.svg", legacy: "/images/badges/team_6.png" },
] as const;

export function publicMarkUrl(url?: string | null, slug?: string | null) {
  const team = TEAM_MARK_FILES.find((row) => row.slug === slug || row.legacy === url || row.imageUrl === url);
  if (team) return team.imageUrl;
  const trimmed = url?.trim() ?? "";
  if (!trimmed || BROKEN_MARK_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return DEFAULT_MARK_SRC;
  return trimmed;
}

export function displayMarkSrc(opts: { isMaster?: boolean; profileMarkImageUrl?: string | null }) {
  if (opts.isMaster) return OPERATOR_MARK_SRC;
  return publicMarkUrl(opts.profileMarkImageUrl);
}
