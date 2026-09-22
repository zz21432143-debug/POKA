import { cn } from "cn";

export function MarkImage({
  src,
  alt,
  size = 32,
  className,
  frameClass,
  effectClass,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
  frameClass?: string | null;
  effectClass?: string | null;
}) {
  return (
    <span
      className={cn("profile-mark inline-flex shrink-0 items-center justify-center", frameClass, effectClass)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={cn("size-full object-contain", className)}
        />
      ) : (
        <span
          className={cn(
            "inline-flex size-full items-center justify-center rounded-md bg-muted text-xs text-muted-foreground",
            className,
          )}
        >
          {alt.slice(0, 1)}
        </span>
      )}
    </span>
  );
}
