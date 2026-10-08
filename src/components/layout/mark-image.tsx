"use client";

import { useState } from "react";
import { cn } from "cn";
import { DEFAULT_MARK_SRC } from "@/lib/mark-assets";

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
  const initial = src?.trim() || DEFAULT_MARK_SRC;
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(initial) && !failed;

  return (
    <span
      className={cn("profile-mark inline-flex shrink-0 items-center justify-center", frameClass, effectClass)}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={initial}
          alt={alt}
          width={size}
          height={size}
          className={cn("size-full object-contain", className)}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "inline-flex size-full items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white",
            className,
          )}
        >
          {(alt.trim() || "P").slice(0, 1)}
        </span>
      )}
    </span>
  );
}
