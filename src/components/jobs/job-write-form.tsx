"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobKind } from "@/generated/prisma/enums";
import { POST_EXP } from "@/lib/rewards";
import { buildJobTitle } from "@/lib/jobs";

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
  jobSnacks: false,
  jobDressCode: "",
  jobApplyMethod: "",
  content: "",
};

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const preview = buildJobTitle(jobKind, {
    location: form.jobLocation,
    companyName: form.jobCompanyName,
    payAmount: form.jobPayAmount,
    workDate: form.jobDateFlexible ? "날짜 협의" : form.jobWorkDate,
  });

  async function submit() {
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
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      router.push(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 EXP +{POST_EXP.JOBS}
      </p>
      <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
        <span className="text-muted-foreground">자동 제목 · </span>
        {preview}
      </p>

      {jobKind === "FIXED" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="근무지(지역)" value={form.jobLocation} onChange={(v) => set("jobLocation", v)} placeholder="서울 강남" />
          <Field label="상호명" value={form.jobCompanyName} onChange={(v) => set("jobCompanyName", v)} placeholder="POKA 펍" />
          <div className="grid gap-2">
            <Label htmlFor="pay-type">급여형태</Label>
            <select
              id="pay-type"
              className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
              value={form.jobPayType}
              onChange={(event) => set("jobPayType", event.target.value)}
            >
              <option value="협의">협의</option>
              <option value="월급">월급</option>
              <option value="시급">시급</option>
            </select>
          </div>
          <Field label="급여 금액" value={form.jobPayAmount} onChange={(v) => set("jobPayAmount", v)} placeholder="3000000" />
          <Field label="근무 일수" value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주5일" />
          <Field label="근무 시간" value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="20:00–04:00" />
          <Field label="복리후생" value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="식대 · 교통비" />
          <Field label="경력 요구조건" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 1년 이상" />
          <Field label="연락처" value={form.jobContact} onChange={(v) => set("jobContact", v)} placeholder="010-0000-0000" />
        </div>
      ) : null}

      {jobKind === "APPLY" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="희망 근무지" value={form.jobLocation} onChange={(v) => set("jobLocation", v)} placeholder="경기 분당" />
          <div className="grid gap-2">
            <Label htmlFor="work-date">지원 가능 날짜</Label>
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
              날짜 협의
            </label>
          </div>
          <p className="col-span-full text-sm text-muted-foreground">급여 형태는 시급 고정입니다.</p>
          <Field label="시급 금액" value={form.jobPayAmount} onChange={(v) => set("jobPayAmount", v)} placeholder="20000" />
          <Field label="보장 시간" value={form.jobGuaranteedHours} onChange={(v) => set("jobGuaranteedHours", v)} placeholder="6시간" />
          <div className="grid gap-2">
            <Label htmlFor="overtime">연장 유무</Label>
            <select
              id="overtime"
              className="h-11 w-full rounded-lg border border-input bg-background px-2 text-base"
              value={form.jobOvertime}
              onChange={(event) => set("jobOvertime", event.target.value)}
            >
              <option value="가능">가능</option>
              <option value="불가">불가</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.jobTravelPay}
              onChange={(event) => set("jobTravelPay", event.target.checked)}
            />
            차비 지원
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.jobSnacks}
              onChange={(event) => set("jobSnacks", event.target.checked)}
            />
            간식 제공
          </label>
          <Field label="복장 규정" value={form.jobDressCode} onChange={(v) => set("jobDressCode", v)} placeholder="올블랙" />
          <Field label="경력 사항" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="스팟 딜러 경험" />
          <Field label="연락처" value={form.jobContact} onChange={(v) => set("jobContact", v)} placeholder="010-0000-0000" />
        </div>
      ) : null}

      {jobKind === "TEAM" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="팀 명" value={form.jobCompanyName} onChange={(v) => set("jobCompanyName", v)} placeholder="ACE 딜러팀" />
          <Field label="주요 활동 지역" value={form.jobLocation} onChange={(v) => set("jobLocation", v)} placeholder="서울 전역" />
          <Field
            label="주요 이력 및 대회 수상 경력"
            value={form.jobExperience}
            onChange={(v) => set("jobExperience", v)}
            placeholder="WSOP 서킷 스태프"
          />
          <Field label="근무 혜택" value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="세션비 · 숙소" />
          <Field label="지원 방법" value={form.jobApplyMethod} onChange={(v) => set("jobApplyMethod", v)} placeholder="프로필 회신" />
          <Field label="연락처" value={form.jobContact} onChange={(v) => set("jobContact", v)} placeholder="010-0000-0000" />
        </div>
      ) : null}

      {jobKind === "URGENT" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="근무지(지역)" value={form.jobLocation} onChange={(v) => set("jobLocation", v)} placeholder="서울 홍대" />
          <div className="grid gap-2">
            <Label htmlFor="urgent-date">필요 날짜</Label>
            <Input
              id="urgent-date"
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
              즉시 / 날짜 협의
            </label>
          </div>
          <Field label="시급 금액" value={form.jobPayAmount} onChange={(v) => set("jobPayAmount", v)} placeholder="25000" />
          <Field label="근무 시간" value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="22:00–06:00" />
          <Field label="경력 요구조건" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="대타 경험" />
          <Field label="연락처" value={form.jobContact} onChange={(v) => set("jobContact", v)} placeholder="010-0000-0000" />
        </div>
      ) : null}

      {jobKind === "SEEKING" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="표시 이름" value={form.jobCompanyName} onChange={(v) => set("jobCompanyName", v)} placeholder="펠트딜러" />
          <Field label="희망 지역" value={form.jobLocation} onChange={(v) => set("jobLocation", v)} placeholder="서울 · 경기" />
          <Field label="희망 급여" value={form.jobPayAmount} onChange={(v) => set("jobPayAmount", v)} placeholder="시급 2만원대" />
          <Field label="가능 일정" value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주말 · 야간" />
          <Field label="경력" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 2년" />
          <Field label="연락처" value={form.jobContact} onChange={(v) => set("jobContact", v)} placeholder="010-0000-0000" />
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="job-content">상세 내용</Label>
        <Textarea
          id="job-content"
          className="min-h-36"
          value={form.content}
          onChange={(event) => set("content", event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "저장 중…" : postId ? "수정" : "등록"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-11"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
