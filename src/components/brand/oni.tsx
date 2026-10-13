import { cn } from "cn";

/** POKA 오니 캐릭터(배경 투명 조각) — 딜러 툴 화면을 가볍게 꾸미는 용도 */
const ONI = {
  front: { src: "/brand/oni/oni-front.webp", width: 286, height: 508 },
  side: { src: "/brand/oni/oni-side.webp", width: 266, height: 512 },
  think: { src: "/brand/oni/oni-think.webp", width: 218, height: 214 },
  happy: { src: "/brand/oni/oni-happy.webp", width: 216, height: 214 },
  love: { src: "/brand/oni/oni-love.webp", width: 218, height: 212 },
} as const;

export type OniPose = keyof typeof ONI;

export function Oni({ pose, className }: { pose: OniPose; className?: string }) {
  const { src, width, height } = ONI[pose];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 장식 그림(투명 webp)
    <img data-oni={pose} src={src} width={width} height={height} alt="" aria-hidden draggable={false} className={cn("pointer-events-none w-auto select-none", className)} />
  );
}

/** 오니 이모티콘(흰 테두리 스티커) — 게시판 제목 옆 · 빈 게시판 */
const STICKERS = {
  hehe: [159, 144],
  curious: [159, 144],
  phone: [153, 144],
  holdem: [182, 144],
  wow: [187, 144],
  win: [178, 144],
  study: [149, 144],
  idea: [171, 144],
  letsgo: [153, 144],
  confident: [167, 144],
  surprise: [160, 144],
  work: [170, 144],
  clap: [177, 144],
  good: [179, 144],
  hello: [193, 144],
  ok: [195, 144],
  cool: [177, 144],
  think: [181, 144],
  basic: [160, 144],
  coffee: [177, 144],
  thanks: [157, 144],
  love: [181, 144],
  cheers: [175, 144],
  like: [163, 144],
} as const;

export type OniStickerName = keyof typeof STICKERS;

/** 게시판(주소 조각)별 이모티콘 */
export const BOARD_STICKER: Record<string, OniStickerName> = {
  free: "hehe",
  rules: "curious",
  sketch: "phone",
  "hand-review": "holdem",
  official: "wow",
  promo: "wow",
  schedule: "win",
  tda: "study",
  suggestions: "idea",
  jobs: "letsgo",
  apply: "letsgo",
  tournament: "confident",
  urgent: "surprise",
  fixed: "work",
  team: "clap",
  community: "good",
  notices: "hello",
  info: "ok",
  dealers: "cool",
  guide: "study",
  tools: "work",
  board: "cool",
  search: "curious",
};

export function OniSticker({ name, className }: { name: OniStickerName; className?: string }) {
  const [width, height] = STICKERS[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 장식 그림(투명 webp)
    <img data-oni-sticker={name} src={`/brand/oni/stickers/${name}.webp`} width={width} height={height} alt="" aria-hidden draggable={false} className={cn("pointer-events-none w-auto shrink-0 select-none", className)} />
  );
}

/** 왼쪽 메뉴 칸마다 오니 이모티콘(겹치지 않게) */
export const NAV_STICKER: Record<string, OniStickerName> = {
  "/": "basic",
  "/boards/jobs/apply": "letsgo",
  "/boards/jobs/tournament": "confident",
  "/boards/jobs/urgent": "surprise",
  "/boards/jobs/fixed": "work",
  "/boards/jobs/team": "clap",
  "/boards/free": "hehe",
  "/boards/hand-review": "holdem",
  "/tools/practice": "think",
  "/attendance": "hello",
  "/boards/schedule": "win",
  "/boards/tda": "study",
  "/info/guide": "idea",
  "/tools/board": "cool",
  "/tools/rotation": "coffee",
  "/tools/seat-draw": "good",
  "/tools/pay": "thanks",
  "/notices": "ok",
  "/boards/official": "wow",
  "/shop": "love",
  "/ranking": "cheers",
  "/boards/suggestions": "curious",
  "/advertise": "like",
};

/** 게시판 제목: 왼쪽에 이모티콘(급여 계산기 실수령액처럼) */
export function BoardTitle({ sticker, children, className }: { sticker?: OniStickerName; children: React.ReactNode; className?: string }) {
  return (
    <h1 className={cn("flex items-center gap-2.5", className)}>
      {sticker ? <OniSticker name={sticker} className="h-12 sm:h-14" /> : null}
      <span className="min-w-0">{children}</span>
    </h1>
  );
}
