import { prisma } from "@/lib/db";
import { openJobWhere, regionWhere, type JobRegion } from "@/lib/job-status";

/** 지역에 지금 모집 중인 공고 수(빈 지역 페이지는 검색 색인 · 사이트맵에서 뺌 — 내용 없는 페이지로 사이트 평가가 떨어지지 않게) */
export async function openJobsInRegion(region: JobRegion) {
  return prisma.post
    .count({
      where: {
        AND: [
          { boardType: "JOBS", hidden: false, isAttendanceThread: false },
          { NOT: { jobKind: "SEEKING" } },
          openJobWhere(),
          regionWhere(region),
        ],
      },
    })
    .catch(() => 1);
}
