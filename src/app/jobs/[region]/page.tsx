import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JobsHubPage from "@/app/boards/jobs/page";
import { parseJobRegion } from "@/lib/job-status";

export const dynamic = "force-dynamic";

type Params = Promise<{ region: string }>;

function pick(raw: string) {
  try {
    return parseJobRegion(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

/** 지역별 구인 페이지(/jobs/서울): 검색어 "서울 홀덤 딜러 구인"용 깔끔한 주소 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const region = pick((await params).region);
  if (!region) return { title: "구인구직" };
  const title = `${region} 홀덤 딜러 구인 · 급구 대타`;
  const description = `${region} 홀덤펍 지원 딜러 구인, 급구·대타, 대회 딜러, 고정 직원 공고를 한곳에서. 앱에서 ${region} 급구 알림을 켜면 새 급구를 바로 받아요.`;
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${region}` },
    openGraph: { title, description, url: `/jobs/${region}` },
  };
}

export default async function RegionJobsPage({ params }: { params: Params }) {
  const region = pick((await params).region);
  if (!region) notFound();
  return JobsHubPage({ searchParams: Promise.resolve({ region }) });
}
