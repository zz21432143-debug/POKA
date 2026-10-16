/** 오락실 이모티콘 = POKA 오니 이모티콘(대국자 · 관전자 응원 공통) */
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

/** 픽셀 퀵 말풍선(글자) — 대국자 · 관전자 공통 */
export const QUICK_TEXTS = [
  { key: "q-kk", label: "ㅋㅋㅋ", icon: "😆", bg: "#ffd84a", ink: "#3a2400" },
  { key: "q-gg", label: "GG", icon: "🤝", bg: "#ffb02e", ink: "#2a1400" },
  { key: "q-nice", label: "나이스!", icon: "👍", bg: "#5be38b", ink: "#06321a" },
  { key: "q-good", label: "굿굿", icon: "✨", bg: "#6ad7ff", ink: "#04263a" },
  { key: "q-oops", label: "아깝다!", icon: "😣", bg: "#ff9a4a", ink: "#3a1600" },
  { key: "q-wow", label: "헉!", icon: "😱", bg: "#c99bff", ink: "#24093f" },
  { key: "q-sad", label: "ㅠㅠ", icon: "😢", bg: "#8fb4ff", ink: "#0b1c45" },
  { key: "q-hurry", label: "빨리~", icon: "⏰", bg: "#4ae0c8", ink: "#033a31" },
  { key: "q-angry", label: "분노!", icon: "💢", bg: "#ff5d6c", ink: "#ffffff" },
] as const;
export const quickOf = (key: string) => QUICK_TEXTS.find((q) => q.key === key) ?? null;
export const isQuickText = (v: unknown) => typeof v === "string" && QUICK_TEXTS.some((q) => q.key === v);
export const quickLabel = (key: string) => QUICK_TEXTS.find((q) => q.key === key)?.label ?? key;
/** 보낼 수 있는 것: 오니 이모티콘 · 퀵 말풍선 */
export const isGameEmote = (v: unknown) => isOniEmote(v) || isQuickText(v);
