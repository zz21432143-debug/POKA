"use client";

import { REVIEW_AXES } from "@/lib/ratings";

export function StarPicker({
  values,
  onChange,
}: {
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {REVIEW_AXES.map((axis) => (
        <fieldset key={axis.key} className="rounded-xl border border-border bg-card p-3">
          <legend className="px-1 text-sm font-medium">{axis.label}</legend>
          <div className="mt-1 flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`touch-target min-h-11 min-w-11 text-xl ${
                  (values[axis.key] ?? 0) >= star ? "text-primary" : "text-muted-foreground"
                }`}
                aria-label={`${axis.label} ${star}점`}
                onClick={() => onChange(axis.key, star)}
              >
                ★
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
