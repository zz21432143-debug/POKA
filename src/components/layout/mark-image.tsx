"use client";

import { useState } from "react";
import { cn } from "cn";
import { DEFAULT_MARK_SRC, publicMarkUrl } from "@/lib/mark-assets";

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
  const resolved = publicMarkUrl(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = failedSrc !== resolved;

  return (
    <span
      className={cn("mark-image-wrapper profile-mark inline-flex shrink-0 items-center justify-center overflow-hidden", frameClass, effectClass)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className={cn("mark-glyph", className)}
          style={{ width: "100%", height: "100%", maxWidth: "none", maxHeight: "none", objectFit: "cover" }}
          onError={() => {
            if (resolved !== DEFAULT_MARK_SRC) setFailedSrc(resolved);
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={DEFAULT_MARK_SRC}
          alt={alt}
          width={size}
          height={size}
          className={cn("mark-glyph", className)}
          style={{ width: "100%", height: "100%", maxWidth: "none", maxHeight: "none", objectFit: "cover" }}
        />
      )}
    </span>
  );
}
