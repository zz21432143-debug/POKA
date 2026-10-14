"use client";

import { ShareButton } from "@/components/tools/share-button";
import { shareResultImage } from "@/lib/share-image";

/** 족보 순위 10가지 + 7장 확률을 이미지로 공유 */
export function HandRankingShare({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <ShareButton
      tool="hand-rankings"
      label="족보 순위 이미지로 공유"
      onShare={(format, byline) =>
        shareResultImage({
          title: "홀덤 족보 순위",
          subtitle: "높은 순 · 7장(내 패 2 + 보드 5)에서 나올 확률",
          lines: rows.map((r, i) => ({ ...r, strong: i === 0 })),
          url: "pokerwiki.co.kr/community/hand-rankings",
          fileName: "POKA_족보순위",
          format,
          byline,
        })
      }
    />
  );
}
