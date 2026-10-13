import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { formatRelativeKst } from "@/lib/dates";

export type Applicant = {
  id: string;
  message: string | null;
  createdAt: string;
  applicant: { nickname: string; level: number; isDealerVerified: boolean };
};

/** 공고 작성자·관리자에게만 보이는 지원자 목록. */
export function ApplicantList({ applicants }: { applicants: Applicant[] }) {
  return (
    <section className="rounded-xl border border-[#c9a25c]/40 bg-[#1d1611] p-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-[#e7c98a]">
        <UsersIcon className="size-4" />
        지원자 {applicants.length}명
        <span className="text-xs font-normal text-[#9CA3AF]">작성자에게만 보입니다</span>
      </h2>
      {applicants.length === 0 ? (
        <p className="mt-2 text-sm text-[#9CA3AF]">아직 지원자가 없습니다. 끌어올리기로 공고를 위로 올려 보세요.</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/10">
          {applicants.map((row) => (
            <li key={row.id} className="py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={`/u/${encodeURIComponent(row.applicant.nickname)}`}
                  className="font-bold text-white hover:text-[#e7c98a]"
                >
                  {row.applicant.nickname}
                </Link>
                <span className="rounded bg-[#c59b27]/15 px-1 text-[11px] font-bold text-[#e7c98a]">
                  Lv.{row.applicant.level}
                </span>
                {row.applicant.isDealerVerified ? (
                  <span className="rounded bg-amber-900/40 px-1.5 text-[11px] font-bold text-amber-200">인증 딜러</span>
                ) : null}
                <span className="ml-auto text-xs text-[#9CA3AF]">{formatRelativeKst(row.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#D1D5DB]">
                {row.message || "(메시지 없음)"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
