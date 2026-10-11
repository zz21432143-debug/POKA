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
import { parseJobPost } from "@/lib/job-parse";
import { todayKstDate } from "@/lib/dates";

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
  jobEndDate: string;
  jobDeadline: string;
  jobDateFlexible: boolean;
  jobAlwaysOpen: boolean;
  jobHeadcount: string;
  jobGuaranteedHours: string;
  jobOvertime: string;
  jobTravelPay: boolean;
  jobTravelPayAmount: string;
  jobSnacks: boolean;
  jobDressCode: string;
  jobApplyMethod: string;
  jobApplyValue: string;
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
  jobEndDate: "",
  jobDeadline: "",
  jobDateFlexible: false,
  jobAlwaysOpen: false,
  jobHeadcount: "",
  jobGuaranteedHours: "",
  jobOvertime: "가능",
  jobTravelPay: false,
  jobTravelPayAmount: "",
  jobSnacks: false,
  jobDressCode: "",
  jobApplyMethod: "",
  jobApplyValue: "",
  content: "",
};

/** 팀은 지역 없이 전국으로 활동하는 경우가 많아 "전국"을 하나 더 둡니다. */
const NATIONWIDE = "전국";

/** "서울 강남" → { region: "서울", detail: "강남" }. 지역 칩에 없는 값은 상세에 그대로 둡니다. */
function splitLocation(value: string) {
  const trimmed = value.trim();
  const region = [...JOB_REGIONS, NATIONWIDE].find((name) => trimmed.startsWith(name));
  if (!region) return { region: "", detail: trimmed };
  return { region: region as string, detail: trimmed.slice(region.length).replace(/^[\s·,]+/, "") };
}

const PAY_TYPES = ["협의", "월급", "일급", "시급"];

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
  const hourly = jobKind === "APPLY" || jobKind === "URGENT" || jobKind === "TOURNAMENT";
  const [form, setForm] = useState<JobFormValues>({
    ...EMPTY,
    jobPayType: hourly ? "시급" : "월급",
    ...initial,
  });
  const [region, setRegion] = useState(() => splitLocation(initial?.jobLocation ?? "").region);
  const [place, setPlace] = useState(() => splitLocation(initial?.jobLocation ?? "").detail);
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const location = [region, place.trim()].filter(Boolean).join(" ");
  const dated = jobKind === "APPLY" || jobKind === "URGENT" || jobKind === "TOURNAMENT";
  // 지원 딜러·대회 딜러는 여러 날 일정(시작~끝)을 받을 수 있습니다.
  const multiDay = jobKind === "APPLY" || jobKind === "TOURNAMENT";
  const canAlwaysOpen = jobKind === "TEAM" || jobKind === "FIXED";
  const hasApplyLink = jobKind === "TOURNAMENT" || jobKind === "TEAM" || jobKind === "APPLY";
  // 모든 분류가 이름 칸을 가집니다. 구인은 상호명, 팀은 팀 명, 대회는 대회명이 제목에 올라갑니다.
  const nameLabel = JOB_NAME_LABEL[jobKind];
  const namePlaceholder =
    jobKind === "TEAM"
      ? "ACE (팀 ACE 모집으로 표시)"
      : jobKind === "SEEKING"
        ? "홍길동"
        : jobKind === "TOURNAMENT"
          ? "RABBIT FESTIVAL"
          : "POKA홀덤";
  const regions: string[] = jobKind === "TEAM" ? [NATIONWIDE, ...JOB_REGIONS] : [...JOB_REGIONS];
  const flexibleLabel =
    jobKind === "URGENT" ? "즉시 / 날짜 협의" : jobKind === "TOURNAMENT" ? "일정 추후 공지" : "날짜 협의";

  /** 카톡 공고 원문을 읽어 빈칸을 채웁니다. 못 찾은 칸은 그대로 둡니다. */
  function applyPaste() {
    const text = paste.trim();
    if (!text) {
      setPasteNote("공고 원문을 붙여넣어 주세요.");
      return;
    }
    const parsed = parseJobPost(text, todayKstDate());
    const next: Partial<JobFormValues> = { content: parsed.content };
    const put = (key: keyof JobFormValues, value: string | null) => {
      if (value) (next as Record<string, unknown>)[key] = value;
    };
    put("jobCompanyName", parsed.companyName);
    put("jobWorkDate", parsed.workDate);
    if (multiDay) put("jobEndDate", parsed.endDate);
    put("jobDeadline", parsed.deadline);
    put("jobSchedule", parsed.schedule);
    put("jobHeadcount", parsed.headcount);
    put("jobPayAmount", parsed.payAmount);
    if (!hourly && parsed.payType && PAY_TYPES.includes(parsed.payType)) put("jobPayType", parsed.payType);
    put("jobGuaranteedHours", parsed.guaranteedHours);
    put("jobWorkHours", parsed.workHours);
    put("jobBenefits", parsed.benefits);
    put("jobDressCode", parsed.dressCode);
    put("jobExperience", parsed.experience);
    put("jobApplyMethod", parsed.applyMethod);
    put("jobApplyValue", parsed.applyLink);
    put("jobContact", parsed.contact);
    if (parsed.travelPay) {
      next.jobTravelPay = true;
      put("jobTravelPayAmount", parsed.travelPayAmount);
    }
    if (parsed.alwaysOpen && canAlwaysOpen) next.jobAlwaysOpen = true;
    if (dated && !parsed.workDate) next.jobDateFlexible = true;
    setForm((prev) => ({ ...prev, ...next }));
    if (parsed.region) setRegion(parsed.region);
    else if (jobKind === "TEAM") setRegion(NATIONWIDE);
    if (parsed.address) setPlace(parsed.address);

    const filled = [
      parsed.companyName && nameLabel,
      parsed.region && "지역",
      parsed.workDate && "날짜",
      parsed.payAmount && "급여",
      parsed.contact && "연락처",
      parsed.applyLink && "지원 링크",
    ].filter(Boolean);
    setPasteNote(`자동으로 채웠습니다: ${filled.join(", ") || "본문"}. 아래 내용을 확인하고 빈칸만 채워 등록하세요.`);
  }

  // 차비는 지원 딜러·급구·대회 딜러에만 있습니다.
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
        차비(교통비) 지원
      </label>
      {form.jobTravelPay ? (
        <Field
          label="차비 금액"
          numeric
          value={form.jobTravelPayAmount}
          onChange={(v) => set("jobTravelPayAmount", v)}
          placeholder="10000"
        />
      ) : null}
    </div>
  );
  const regionLabel =
    jobKind === "SEEKING" || jobKind === "APPLY"
      ? "희망 지역"
      : jobKind === "TEAM"
        ? "주요 활동 지역"
        : jobKind === "TOURNAMENT"
          ? "대회 지역"
          : "근무 지역";

  const preview = buildJobTitle(jobKind, {
    location,
    companyName: form.jobCompanyName,
    payAmount: form.jobPayAmount,
    workDate: form.jobDateFlexible ? (jobKind === "TOURNAMENT" ? "" : "날짜 협의") : form.jobWorkDate,
    endDate: form.jobDateFlexible ? "" : form.jobEndDate,
  });

  function missingField(): string | null {
    if (!region) return `${regionLabel}을 선택하세요.`;
    if (!form.jobCompanyName.trim()) return `${nameLabel}을(를) 입력하세요.`;
    if (dated && !form.jobDateFlexible && !form.jobWorkDate) return `날짜를 고르거나 "${flexibleLabel}"를 선택하세요.`;
    if (multiDay && form.jobEndDate && form.jobWorkDate && form.jobEndDate < form.jobWorkDate) {
      return "마지막 날짜가 시작 날짜보다 빠릅니다.";
    }
    const payOptional = jobKind === "TEAM" || (jobKind === "FIXED" && form.jobPayType === "협의");
    if (!payOptional && !form.jobPayAmount.trim()) return "급여를 입력하세요.";
    if (form.jobApplyValue.trim() && !/^https?:\/\/\S+$/i.test(form.jobApplyValue.trim())) {
      return "지원서 링크는 https:// 로 시작해야 합니다.";
    }
    if (!form.jobContact.trim() && !form.jobApplyValue.trim()) return "연락처나 지원서 링크 중 하나는 입력하세요.";
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

      <section
        className="grid gap-2 rounded-xl border border-[#FEE500]/40 bg-[#FEE500]/[0.06] p-3"
        aria-label="카톡 공고 붙여넣기"
      >
        <Label htmlFor="job-paste" className="text-sm font-bold text-[#FEE500]">
          카톡 공고 붙여넣기 → 자동 채우기
        </Label>
        <p className="text-xs text-[#c9c0b2]">
          오픈채팅방에 올리던 공고를 그대로 붙여넣으면 대회명·날짜·장소·시급·복장·연락처를 찾아 채워 줍니다. 원문은 본문에
          그대로 들어갑니다.
        </p>
        <Textarea
          id="job-paste"
          className="min-h-32 text-sm"
          placeholder={"【 RABBIT FESTIVAL 】\n• MAIN EVENT\n10월 31일 (토) - 65명\n장소 : …\n시급 : 20,000원 (6시간 보장)"}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
        />
        <Button type="button" variant="secondary" className="min-h-11" onClick={applyPaste}>
          자동 채우기
        </Button>
        {pasteNote ? <p className="text-xs text-[#e7c98a]">{pasteNote}</p> : null}
      </section>

      <div className="grid gap-2">
        <p className="write-label">
          제목 <span className="write-label-hint">입력값으로 자동 생성</span>
        </p>
        <p className="write-title-input flex items-center break-keep">{preview}</p>
      </div>

      <section className="grid gap-3" aria-label="기본 정보">
        <p className="text-sm font-bold text-[#e7c98a]">
          기본 정보 <span className="text-xs font-semibold text-[#9CA3AF]">· <Required /> 표시는 꼭 입력해야 합니다</span>
        </p>
        <div className="grid gap-2">
          <Label>
            {regionLabel} <Required />
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {regions.map((name) => (
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
            {jobKind === "TOURNAMENT" ? "장소 · 주소" : "상세주소"}
          </Label>
          <Input
            id="job-address"
            className="h-11"
            value={place}
            placeholder={
              jobKind === "TEAM"
                ? "예: 강남구 전역"
                : jobKind === "TOURNAMENT"
                  ? "예: 구로 G스타디움 · 서울시 구로구 구로중앙로 134"
                  : "예: 강남구 테헤란로 123"
            }
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
                {jobKind === "URGENT" ? "필요 날짜" : jobKind === "TOURNAMENT" ? "대회 시작일" : "근무 날짜"} <Required />
              </Label>
              <Input
                id="work-date"
                type="date"
                className="h-11 text-base"
                value={form.jobWorkDate}
                disabled={form.jobDateFlexible}
                onChange={(event) => set("jobWorkDate", event.target.value)}
              />
              {multiDay ? (
                <>
                  <Label htmlFor="end-date" className="mt-1">
                    마지막 날짜 <span className="text-xs text-[#9CA3AF]">(여러 날이면)</span>
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    className="h-11 text-base"
                    value={form.jobEndDate}
                    min={form.jobWorkDate || undefined}
                    disabled={form.jobDateFlexible}
                    onChange={(event) => set("jobEndDate", event.target.value)}
                  />
                </>
              ) : null}
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={form.jobDateFlexible}
                  onChange={(event) => set("jobDateFlexible", event.target.checked)}
                />
                {flexibleLabel}
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
                  {PAY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
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
            value={form.jobContact}
            onChange={(v) => set("jobContact", v)}
            placeholder="김포카 010-0000-0000 또는 카카오 오픈채팅"
          />

          {hasApplyLink ? (
            <Field
              label="지원서 링크"
              value={form.jobApplyValue}
              onChange={(v) => set("jobApplyValue", v)}
              placeholder="https://forms.gle/…"
            />
          ) : null}

          {canAlwaysOpen ? (
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={form.jobAlwaysOpen}
                onChange={(event) => set("jobAlwaysOpen", event.target.checked)}
              />
              상시 모집 (자동 마감 없음)
            </label>
          ) : null}
        </div>
        <p className="text-xs text-[#9CA3AF]">연락처나 지원서 링크 중 하나는 꼭 넣어 주세요.</p>
      </section>

      <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3" aria-label="추가 정보">
        <p className="text-sm font-bold text-[#e7c98a]">
          추가 정보 <span className="text-xs font-semibold text-[#9CA3AF]">· 아는 만큼만 적어 주세요</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {jobKind === "FIXED" ? (
            <>
              <Field label="근무 일수" value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주5일" />
              <Field label="근무 시간" value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="20:00–04:00" />
              <Field label="복리후생" value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="식대 · 교통비" />
              <Field label="경력 요구조건" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 1년 이상" />
            </>
          ) : null}

          {jobKind === "APPLY" || jobKind === "TOURNAMENT" ? (
            <>
              <Field
                label="행사 일정 · 인원"
                value={form.jobSchedule}
                onChange={(v) => set("jobSchedule", v)}
                placeholder="MAIN EVENT 10/31 65명 / 매장대항전 11/1 35명"
              />
              <Field label="모집 인원" value={form.jobHeadcount} onChange={(v) => set("jobHeadcount", v)} placeholder="70명+@" />
              <Field label="보장 시간" value={form.jobGuaranteedHours} onChange={(v) => set("jobGuaranteedHours", v)} placeholder="6시간" />
              <Field label="출근 시간" value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="추후 공지" />
              <Field label="복지 · 복리후생" value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="식사 제공, 주차" />
              <Field label="근무 복장" value={form.jobDressCode} onChange={(v) => set("jobDressCode", v)} placeholder="상의 검정 셔츠 · 하의 검정 슬랙스" />
              <Field label="자격 · 경력" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="TDA 룰 숙지자, 1년 이상 경력자" />
              <Field label="지원 방법" value={form.jobApplyMethod} onChange={(v) => set("jobApplyMethod", v)} placeholder="문자 지원 (성함/경력/거주지)" />
              {jobKind === "TOURNAMENT" ? (
                <div className="grid gap-2">
                  <Label htmlFor="deadline">모집 마감일</Label>
                  <Input
                    id="deadline"
                    type="date"
                    className="h-11 text-base"
                    value={form.jobDeadline}
                    onChange={(event) => set("jobDeadline", event.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="overtime">연장 유무</Label>
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
              )}
              {travelPayField}
              {jobKind === "APPLY" ? (
                <label className="flex min-h-11 items-center gap-2 self-start text-sm">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={form.jobSnacks}
                    onChange={(event) => set("jobSnacks", event.target.checked)}
                  />
                  간식 제공
                </label>
              ) : null}
            </>
          ) : null}

          {jobKind === "TEAM" ? (
            <>
              <Field
                label="우대 조건 · 주요 이력"
                value={form.jobExperience}
                onChange={(v) => set("jobExperience", v)}
                placeholder="타지역 출장 가능하신 분 · WSOP 서킷 스태프"
              />
              <Field label="근무 혜택" value={form.jobBenefits} onChange={(v) => set("jobBenefits", v)} placeholder="세션비 · 숙소" />
              <Field label="지원 방법" value={form.jobApplyMethod} onChange={(v) => set("jobApplyMethod", v)} placeholder="구글폼 지원서" />
            </>
          ) : null}

          {jobKind === "URGENT" ? (
            <>
              <Field label="근무 시간" value={form.jobWorkHours} onChange={(v) => set("jobWorkHours", v)} placeholder="22:00–06:00" />
              <Field label="경력 요구조건" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="대타 경험" />
              {travelPayField}
            </>
          ) : null}

          {jobKind === "SEEKING" ? (
            <>
              <Field label="가능 일정" value={form.jobSchedule} onChange={(v) => set("jobSchedule", v)} placeholder="주말 · 야간" />
              <Field label="경력" value={form.jobExperience} onChange={(v) => set("jobExperience", v)} placeholder="라이브 2년" />
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
            placeholder="근무 조건, 분위기, 참고 사항을 적어 주세요 (카톡 공고를 붙여넣으면 원문이 들어갑니다)"
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
