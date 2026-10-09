import { cn } from "cn";

export function YokaiMarkFrame({
  src,
  alt,
  dimmed = false,
}: {
  src: string;
  alt: string;
  dimmed?: boolean;
}) {
  return (
    <span className={cn("yokai-mark-frame", dimmed && "is-dim")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={96} height={96} />
    </span>
  );
}
