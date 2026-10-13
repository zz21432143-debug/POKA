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
