import { cn } from "cn";

export function MarkImage({
  src,
  alt,
  size = 32,
  className,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-md object-contain", className)}
    />
  );
}
