/** 게임방 이모티콘 = POKA 오니 이모티콘(대국자 · 관전자 응원 공통) */
export const ONI_EMOTES = [
  { key: "good", label: "최고" },
  { key: "wow", label: "우와" },
  { key: "love", label: "좋아" },
  { key: "hehe", label: "히히" },
  { key: "think", label: "흠…" },
  { key: "surprise", label: "헉!" },
  { key: "thanks", label: "고마워" },
  { key: "win", label: "축하" },
  { key: "cool", label: "멋져" },
] as const;
export type OniEmote = (typeof ONI_EMOTES)[number]["key"];
export const isOniEmote = (v: unknown): v is OniEmote =>
  typeof v === "string" && ONI_EMOTES.some((e) => e.key === v);
export const emoteSrc = (key: string) => `/brand/oni/stickers/${key}.webp`;
export const emoteLabel = (key: string) =>
  ONI_EMOTES.find((e) => e.key === key)?.label ?? key;
