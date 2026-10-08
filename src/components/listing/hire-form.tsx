"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLY_METHODS,
  BENEFITS,
  CAREER_REQS,
  EMPTY_HIRE,
  PAY_TYPES,
  POSITIONS,
  REGIONS,
  WORK_TYPES,
  applyPlaceholder,
  type ApplyMethod,
  type HireListing,
} from "@/lib/listing";
import { postRewardLine } from "@/lib/rewards";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function HireForm({
  hint,
  initial,
  postId,
}: {
  hint: string;
  initial?: Partial<HireListing>;
  postId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<HireListing>({ ...EMPTY_HIRE, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      if (form.title.trim().length < 2) throw new Error("공고 제목을 입력하세요.");
      if (form.jobPositions.length === 0) throw new Error("구인 포지션을 하나 이상 선택하세요.");
      if (form.jobLocation.length === 0) throw new Error("근무 지역을 선택하세요.");
      if (!form.jobWorkType) throw new Error("근무 형태를 선택하세요.");
      if (!form.jobExperience) throw new Error("경력 요건을 선택하세요.");
      if (!form.jobPayType) throw new Error("급여 조건을 선택하세요.");
      if (form.jobPayType !== "추후 협의" && !form.jobPayAmount.trim()) {
        throw new Error("급여 금액을 입력하세요.");
      }
      if (!form.jobApplyMethod) throw new Error("지원 방법을 선택하세요.");
      if (form.jobApplyMethod !== "사이트 내 직접 지원" && !form.jobApplyValue.trim()) {
        throw new Error("지원 연락처 또는 링크를 입력하세요.");
      }
      if (!form.jobAlwaysOpen && !form.jobWorkDate) throw new Error("마감일을 고르거나 상시 모집을 선택하세요.");

      const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardType: "JOBS", ...form }),
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
    <div className="flex flex-col gap-6">
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
        {hint} · 작성 {postRewardLine("JOBS")}
      </p>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">기본 정보</h2>
        <div className="grid gap-2">
          <Label htmlFor="title">공고 제목</Label>
          <Input
            id="title"
            className="h-11"
            value={form.title}
            placeholder="TOT 딜러팀 정규 딜러 모집"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">구인 포지션 (중복 선택)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POSITIONS.map((item) => (
              <CheckChip
                key={item}
                label={item}
                checked={form.jobPositions.includes(item)}
                onChange={() => setForm({ ...form, jobPositions: toggle(form.jobPositions, item) })}
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">근무 지역 (중복 선택)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {REGIONS.map((item) => (
              <CheckChip
                key={item}
                label={item}
                checked={form.jobLocation.includes(item)}
                onChange={() => setForm({ ...form, jobLocation: toggle(form.jobLocation, item) })}
              />
            ))}
          </div>
        </fieldset>
        <RadioRow
          legend="근무 형태"
          options={WORK_TYPES}
          value={form.jobWorkType}
          onChange={(value) => setForm({ ...form, jobWorkType: value })}
        />
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">조건 및 혜택</h2>
        <RadioRow
          legend="경력 요건"
          options={CAREER_REQS}
          value={form.jobExperience}
          onChange={(value) => setForm({ ...form, jobExperience: value })}
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">급여 조건</legend>
          <div className="grid gap-2">
            {PAY_TYPES.map((item) => (
              <label key={item} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pay"
                  className="size-5"
                  checked={form.jobPayType === item}
                  onChange={() => setForm({ ...form, jobPayType: item })}
                />
                {item}
              </label>
            ))}
            {form.jobPayType && form.jobPayType !== "추후 협의" ? (
              <Input
                className="h-11"
                inputMode="numeric"
                placeholder={`${form.jobPayType} 금액 (숫자)`}
                value={form.jobPayAmount}
                onChange={(event) => setForm({ ...form, jobPayAmount: event.target.value })}
              />
            ) : null}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">복리후생 (중복 선택)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BENEFITS.map((item) => (
              <CheckChip
                key={item}
                label={item}
                checked={form.jobBenefits.includes(item)}
                onChange={() => setForm({ ...form, jobBenefits: toggle(form.jobBenefits, item) })}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">지원 및 접수</h2>
        <RadioRow
          legend="지원 방법"
          options={APPLY_METHODS}
          value={form.jobApplyMethod}
          onChange={(value) => setForm({ ...form, jobApplyMethod: value, jobApplyValue: "" })}
        />
        {form.jobApplyMethod && form.jobApplyMethod !== "사이트 내 직접 지원" ? (
          <div className="grid gap-2">
            <Label htmlFor="apply-value">접수 정보</Label>
            <Input
              id="apply-value"
              className="h-11"
              placeholder={applyPlaceholder(form.jobApplyMethod as ApplyMethod)}
              value={form.jobApplyValue}
              onChange={(event) => setForm({ ...form, jobApplyValue: event.target.value })}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">지원자는 공고 댓글로 직접 지원합니다.</p>
        )}
        <div className="grid gap-2">
          <Label htmlFor="deadline">마감일</Label>
          <Input
            id="deadline"
            type="date"
            className="h-11 text-base"
            disabled={form.jobAlwaysOpen}
            value={form.jobWorkDate}
            onChange={(event) => setForm({ ...form, jobWorkDate: event.target.value })}
          />
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.jobAlwaysOpen}
              onChange={(event) => setForm({ ...form, jobAlwaysOpen: event.target.checked })}
            />
            상시 모집
          </label>
        </div>
      </section>

      <div className="grid gap-2">
        <Label htmlFor="content">상세 내용</Label>
        <Textarea
          id="content"
          className="min-h-36"
          value={form.content}
          placeholder="팀 소개, 근무 일정, 우대 사항을 적어 주세요."
          onChange={(event) => setForm({ ...form, content: event.target.value })}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" size="touch" disabled={pending} onClick={() => void submit()}>
        {pending ? "저장 중…" : postId ? "수정" : "공고 등록"}
      </Button>
    </div>
  );
}

function CheckChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${
        checked ? "border-primary bg-primary/10" : "border-border"
      }`}
    >
      <input type="checkbox" className="size-5" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function RadioRow<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-1">
        {options.map((item) => (
          <label key={item} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name={legend}
              className="size-5"
              checked={value === item}
              onChange={() => onChange(item)}
            />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
