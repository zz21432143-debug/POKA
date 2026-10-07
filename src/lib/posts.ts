export const publicPostWhere = {
  hidden: false,
  boardType: { not: "ANONYMOUS_REVIEW" as const },
} as const;
