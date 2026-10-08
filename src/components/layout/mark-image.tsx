"use client";

import { useEffect, useState } from "react";
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const showImg = !failed;

  return (
    <span
      className={cn("profile-mark inline-flex shrink-0 items-center justify-center overflow-hidden", frameClass, effectClass)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          width={size}
          height={size}
          className={cn("mark-glyph", className)}
          style={{ width: size, height: size, maxWidth: "none", maxHeight: "none" }}
          onError={() => {
            if (resolved !== DEFAULT_MARK_SRC) setFailed(true);
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
          style={{ width: size, height: size, maxWidth: "none", maxHeight: "none" }}
        />
      )}
    </span>
  );
}
