"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobKind } from "@/generated/prisma/enums";
import { postRewardLine } from "@/lib/rewards";
import { JOB_NAME_LABEL, buildJobTitle } from "@/lib/jobs";
import { JOB_REGIONS } from "@/lib/job-status";

export type JobFormValues = {
  jobLocation: string;
  jobCompanyName: string;
  jobPayType: string;
  jobPayAmount: string;
  jobSchedule: string;
  jobWorkHours: string;
  jobBenefits: string;
  jobExperience: string;
  jobContact: string;
  jobWorkDate: string;
  jobDateFlexible: boolean;
  jobGuaranteedHours: string;
  jobOvertime: string;
  jobTravelPay: boolean;
  jobTravelPayAmount: string;
  jobSnacks: boolean;
  jobDressCode: string;
  jobApplyMethod: string;
  content: string;
};

const EMPTY: JobFormValues = {
  jobLocation: "",
  jobCompanyName: "",
  jobPayType: "월급",
  jobPayAmount: "",
  jobSchedule: "",
  jobWorkHours: "",
  jobBenefits: "",
  jobExperience: "",
  jobContact: "",
  jobWorkDate: "",
  jobDateFlexible: false,
  jobGuaranteedHours: "",
  jobOvertime: "가능",
  jobTravelPay: false,
  jobTravelPayAmount: "",
  jobSnacks: false,
  jobDressCode: "",
  jobApplyMethod: "",
  content: "",
};

/** "서울 강남" → { region: "서울", detail: "강남" }. 지역 칩에 없는 값은 상세에 그대로 둡니다. */
function splitLocation(value: string) {
  const trimmed = value.trim();
  const region = JOB_REGIONS.find((name) => trimmed.startsWith(name));
  if (!region) return { region: "", detail: trimmed };
  return { region: region as string, detail: trimmed.slice(region.length).replace(/^[\s·,]+/, "") };
}

export function JobWriteForm({
  jobKind,
  hint,
  initial,
  postId,
}: {
  jobKind: JobKind;
  hint: string;
  initial?: Partial<JobFormValues>;
  postId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<JobFormValues>({
    ...EMPTY,
    jobPayType: jobKind === "APPLY" || jobKind === "URGENT" ? "시급" : "월급",
    ...initial,
  });
  const [region, setRegion] = useState(() => splitLocation(initial?.jobLocation ?? "").region);
  const [place, setPlace] = useState(() => splitLocation(initial?.jobLocation ?? "").detail);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const location = [region, place.trim()].filter(Boolean).join(" ");
  const dated = jobKind === "APPLY" || jobKind === "URGENT";
  // 모든 분류가 이름 칸을 가집니다. 구인은 상호명, 팀은 팀 명, 구직은 본명이 제목에 올라갑니다.
  const nameLabel = JOB_NAME_LABEL[jobKind];
  const namePlaceholder = jobKind === "TEAM" ? "ACE (팀 ACE 모집으로 표시)" : jobKind === "SEEKING" ? "홍길동" : "POKA홀덤";

  // 차비는 지원 딜러·급구에만 있습니다.
  const travelPayField = (
    <div className="grid gap-2">
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={form.jobTravelPay}
          onChange={(event) => {
            set("jobTravelPay", event.target.checked);
            if (!event.target.checked) set("jobTravelPayAmount", "");
          }}
        />
        차비 지원
      </label>
      {form.jobTravelPay ? (
        <Field
          label="차비 금액"
          required
          numeric
          value={form.jobTravelPayAmount}
          onChange={(v) => set("jobTravelPayAmount", v)}
          placeholder="20000"
        />
      ) : null}
    </div>
  );
  const regionLabel = jobKind === "SEEKING" || jobKind === "APPLY" ? "희망 지역" : jobKind === "TEAM" ? "주요 활동 지역" : "근무 지역";

  const preview = buildJobTitle(jobKind, {
    location,
    companyName: form.jobCompanyName,
    payAmount: form.jobPayAmount,
    workDate: form.jobDateFlexible ? "날짜 협의" : form.jobWorkDate,
  });

  /** 추가 정보도 모두 필수입니다. [항목명, 값] 순서대로 비어 있는 첫 항목을 알려 줍니다. */
  const extraRequired: [string, string][] =
    jobKind === "FIXED"
      ? [
          ["근무 일수", form.jobSchedule],
          ["근무 시간", form.jobWorkHours],
          ["복리후생", form.jobBenefits],
          ["경력 요구조건", form.jobExperience],
        ]
      : jobKind === "APPLY"
        ? [
            ["보장 시간", form.jobGuaranteedHours],
            ["복장 규정", form.jobDressCode],
            ["경력 사항", form.jobExperience],
            ...(form.jobTravelPay ? ([["차비 금액", form.jobTravelPayAmount]] as [string, string][]) : []),
          ]
        : jobKind === "TEAM"
          ? [
              ["주요 이력 및 대회 수상 경력", form.jobExperience],
              ["근무 혜택", form.jobBenefits],
              ["지원 방법", form.jobApplyMethod],
            ]
          : jobKind === "URGENT"
            ? [
                ["근무 시간", form.jobWorkHours],
                ["경력 요구조건", form.jobExperience],
                ...(form.jobTravelPay ? ([["차비 금액", form.jobTravelPayAmount]] as [string, string][]) : []),
              ]
            : [
                ["가능 일정", form.jobSchedule],
                ["경력", form.jobExperience],
              ];

  function missingField(): string | null {
    if (!region) return `${regionLabel}을 선택하세요.`;
    if (!place.trim()) return "상세주소를 입력하세요.";
    if (!form.jobCompanyName.trim()) return `${nameLabel}을(를) 입력하세요.`;
    if (dated && !form.jobDateFlexible && !form.jobWorkDate) return "날짜를 고르거나 협의를 선택하세요.";
    if (jobKind !== "TEAM" && !form.jobPayAmount.trim()) return "급여를 입력하세요.";
    if (!form.jobContact.trim()) return "연락처를 입력하세요.";
    const empty = extraRequired.find(([, value]) => !value.trim());
    if (empty) return `${empty[0]}을(를) 입력하세요.`;
    if (!form.content.trim()) return "상세 내용을 입력하세요.";
    return null;
  }

  async function submit() {
    const missing = missingField();
    if (missing) {
      setError(missing);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType: "JOBS",
          jobKind,
          ...form,
          jobLocation: location,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      router.replace(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 {postRewardLine("JOBS")}
      </p>
      <div className="grid gap-2">
        <p className="write-label">
          제목 <span className="write-label-hint">입력값으로 자동 생성</span>
        </p>
        <p className="write-title-input flex items-center break-keep">{preview}</p>
      </div>

      <section className="grid gap-3" aria-label="기본 정보">
        <p className="text-sm font-bold text-[#e7c98a]">
          기본 정보 <span className="text-xs font-semibold text-[#9CA3AF]">· <Required /> 표시는 모두 입력해야 합니다</span>
        </p>
        <div className="grid gap-2">
          <Label>
            {regionLabel} <Required />
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {JOB_REGIONS.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={region === name}
                onClick={() => setRegion(region === name ? "" : name)}
                className={
                  region === name
                    ? "min-h-9 rounded-full border border-[#c9a25c] bg-[#c9a25c] px-3 text-[13px] font-semibold text-[#1d1611]"
                    : "min-h-9 rounded-full border border-white/15 px-3 text-[13px] font-semibold text-[#E5E7EB] hover:border-[#c9a25c]/60"
                }
              >
                {name}
              </button>
            ))}
          </div>
          <Label htmlFor="job-address" className="mt-1">
            상세주소 <Required />
          </Label>
          <Input
            id="job-address"
            className="h-11"
            value={place}
            placeholder={jobKind === "TEAM" ? "예: 강남구 전역" : "예: 강남구 테헤란로 123"}
            onChange={(event) => setPlace(event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={nameLabel}
            required
            value={form.jobCompanyName}
            onChange={(v) => set("jobCompanyName", v)}
            placeholder={namePlaceholder}
          />

          {dated ? (
            <div className="grid gap-2">
              <Label htmlFor="work-date">
                {jobKind === "URGENT" ? "필요 날짜" : "지원 가능 날짜"} <Required />
              </Label>
              <Input
                id="work-date"
                type="date"
                className="h-11 text-base"
                value={form.jobWorkDate}
                disabled={form.jobDateFlexible}
                onChange={(event) => set("jobWorkDate", event.target.value)}
              />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={form.jobDateFlexible}
                  onChange={(event) => set("jobDateFlexible", event.target.checked)}
                />
                {jobKind === "URGENT" ? "즉시 / 날짜 협의" : "날짜 협의"}
              </label>
            </div>
          ) : null}

          {jobKind === "FIXED" ? (
            <div className="grid gap-2">
              <Label htmlFor="pay-type">
                급여 <Required />
              </Label>
              <div className="flex gap-2">
                <select
                  id="pay-type"
                  className="h-11 shrink-0 rounded-lg border border-input bg-background px-2 text-base text-[#E5E7EB]"
                  value={form.jobPayType}
                  onChange={(event) => set("jobPayType", event.target.value)}
                >
                  <option value="협의">협의</option>
                  <option value="월급">월급</option>
                  <option value="시급">시급</option>
                </select>
                <Input
                  className="h-11"
                  inputMode="numeric"
                  value={form.jobPayAmount}
                  placeholder="3000000"
                  onChange={(event) => set("jobPayAmount", event.target.value)}
                />
              </div>
            </div>
          ) : jobKind === "SEEKING" ? (
            <Field
              label="희망 급여"
              required
              value={form.jobPayAmount}
              onChange={(v) => set("jobPayAmount", v)}
              placeholder="시급 2만원대"
            />
          ) : jobKind !== "TEAM" ? (
            <Field
              label="시급"
              required
              numeric
              value={form.jobPayAmount}
              onChange={(v) => set("jobPayAmount", v)}
              placeholder={jobKind === "URGENT" ? "25000" : "20000"}
            />
          ) : null}

          <Field
            label="연락처"
            required
            value={form.jobContact}
            onChange={(v) => set("jobContact", v)}
            placeholder="010-0000-0000 또는 카카오 오픈채팅"
          />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3" aria-label="추가 정보">
        <p className="text-sm font-bold text-[#e7c98a]">추가 정보 · 근무 조건, 상세 내용</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {jobKind === "FIXED" ? (
            <>
              <Field label="근무 일수" required value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주5일" />
              <Field label="근무 시간" required value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="20:00–04:00" />
              <Field label="복리후생" required value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="식대 · 교통비" />
              <Field label="경력 요구조건" required value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 1년 이상" />
            </>
          ) : null}

          {jobKind === "APPLY" ? (
            <>
              <Field label="보장 시간" required value={form.jobGuaranteedHours} onChange={(v) => set("jobGuaranteedHours", v)} placeholder="6시간" />
              <div className="grid gap-2">
                <Label htmlFor="overtime">
                  연장 유무 <Required />
                </Label>
                <select
                  id="overtime"
                  className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base text-[#E5E7EB]"
                  value={form.jobOvertime}
                  onChange={(event) => set("jobOvertime", event.target.value)}
                >
                  <option value="가능">가능</option>
                  <option value="불가">불가</option>
                </select>
              </div>
              <Field label="복장 규정" required value={form.jobDressCode} onChange={(v) => set("jobDressCode", v)} placeholder="올블랙" />
              <Field label="경력 사항" required value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="스팟 딜러 경험" />
              {travelPayField}
              <label className="flex min-h-11 items-center gap-2 self-start text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={form.jobSnacks}
                  onChange={(event) => set("jobSnacks", event.target.checked)}
                />
                간식 제공
              </label>
            </>
          ) : null}

          {jobKind === "TEAM" ? (
            <>
              <Field
                label="주요 이력 및 대회 수상 경력"
                required
                value={form.jobExperience}
                onChange={(v) => set("jobExperience", v)}
                placeholder="WSOP 서킷 스태프"
              />
              <Field label="근무 혜택" required value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="세션비 · 숙소" />
              <Field label="지원 방법" required value={form.jobApplyMethod} onChange={(v) => set("jobApplyMethod", v)} placeholder="프로필 회신" />
            </>
          ) : null}

          {jobKind === "URGENT" ? (
            <>
              <Field label="근무 시간" required value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="22:00–06:00" />
              <Field label="경력 요구조건" required value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="대타 경험" />
              {travelPayField}
            </>
          ) : null}

          {jobKind === "SEEKING" ? (
            <>
              <Field label="가능 일정" required value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주말 · 야간" />
              <Field label="경력" required value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 2년" />
            </>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="job-content" className="write-label">
            상세 내용 <Required />
          </Label>
          <Textarea
            id="job-content"
            className="write-body-input"
            placeholder="근무 조건, 분위기, 참고 사항을 적어 주세요"
            value={form.content}
            onChange={(event) => set("content", event.target.value)}
          />
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "저장 중…" : postId ? "수정" : "등록"}
      </Button>
    </div>
  );
}

function Required() {
  return (
    <span className="text-rose-400" aria-label="필수">
      *
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  numeric?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label} {required ? <Required /> : null}
      </Label>
      <Input
        className="h-11"
        value={value}
        inputMode={numeric ? "numeric" : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
