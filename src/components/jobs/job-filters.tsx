import Link from "next/link";
import { MapPinIcon } from "lucide-react";
import { JOB_REGIONS, type JobRegion } from "@/lib/job-status";
import { cn } from "cn";

export function jobListHref(basePath: string, region: JobRegion | null, openOnly: boolean) {
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (openOnly) params.set("open", "1");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** 지역 칩 + 모집중만 보기. 링크로 동작해 지역별 주소가 검색에도 잡힙니다. */
export function JobFilters({
  basePath,
  region,
  openOnly,
}: {
  basePath: string;
  region: JobRegion | null;
  openOnly: boolean;
}) {
  const chip =
    "touch-target inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-[13px] font-semibold";
  const on = "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]";
  const off = "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60 hover:text-white";

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="지역 필터" className="card-scroller -mx-1 overflow-x-auto px-1">
        <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
          <li className="flex items-center pr-1 text-[#C59B27]">
            <MapPinIcon className="size-4" aria-hidden />
          </li>
          <li>
            <Link href={jobListHref(basePath, null, openOnly)} className={cn(chip, region ? off : on)}>
              전국
            </Link>
          </li>
          {JOB_REGIONS.map((name) => (
            <li key={name}>
              <Link
                href={jobListHref(basePath, name, openOnly)}
                className={cn(chip, region === name ? on : off)}
                aria-current={region === name ? "page" : undefined}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link
        href={jobListHref(basePath, region, !openOnly)}
        role="switch"
        aria-checked={openOnly}
        className="touch-target inline-flex min-h-9 items-center gap-2 self-start text-sm font-semibold text-[#E5E7EB]"
      >
        <span
          className={cn(
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
            openOnly ? "bg-emerald-600" : "bg-white/20",
          )}
        >
          <span
            className={cn(
              "absolute size-4 rounded-full bg-white transition-transform",
              openOnly ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </span>
        모집중만 보기
      </Link>
    </div>
  );
}
