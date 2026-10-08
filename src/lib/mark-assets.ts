export const DEFAULT_MARK_SRC = "/marks/default.svg";
export const OPERATOR_MARK_SRC = "/marks/operator.svg";

const BROKEN_MARK_PREFIXES = ["/images/badges/"];

export function displayMarkSrc(opts: { isMaster?: boolean; profileMarkImageUrl?: string | null }) {
  if (opts.isMaster) return OPERATOR_MARK_SRC;
  const url = opts.profileMarkImageUrl?.trim() ?? "";
  if (!url || BROKEN_MARK_PREFIXES.some((prefix) => url.startsWith(prefix))) return DEFAULT_MARK_SRC;
  return url;
}

export const TEAM_MARK_FILES = [
  { slug: "team-a", name: "TOP", imageUrl: "/marks/team-top.svg" },
  { slug: "team-b", name: "PLIME", imageUrl: "/marks/team-plime.svg" },
  { slug: "team-c", name: "HAM", imageUrl: "/marks/team-ham.svg" },
  { slug: "team-d", name: "ROCKET", imageUrl: "/marks/team-rocket.svg" },
  { slug: "team-e", name: "GUNNER", imageUrl: "/marks/team-gunner.svg" },
  { slug: "team-f", name: "DOO", imageUrl: "/marks/team-doo.svg" },
] as const;
