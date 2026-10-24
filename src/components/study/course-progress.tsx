"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/link";
import { cn } from "cn";

const LOCAL_KEY = "poka-course-read";

function localRead(): string[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function saveLocal(list: string[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* 저장소를 못 쓰면 이 화면에서만 */
  }
}

/** 회원은 서버, 비회원은 이 기기 기록 */
async function fetchRead(): Promise<{ read: string[]; member: boolean }> {
  const res = await fetch("/api/course", { cache: "no-store" }).catch(() => null);
  if (res?.ok) {
    const data = (await res.json()) as { read?: string[] };
    return { read: data.read ?? [], member: true };
  }
  return { read: localRead(), member: false };
}

export type CourseStepView = { key: string; href: string; title: string };
export type CourseView = { id: string; title: string; level: string; hint: string; steps: CourseStepView[] };

/** 가이드 글 아래: 코스 n/m · 읽음 표시 · 다음 글 */
export function CourseStepBox({
  stepKey,
  course,
  index,
  next,
}: {
  stepKey: string;
  course: { id: string; title: string; total: number };
  index: number;
  next: { href: string; title: string } | null;
}) {
  const [marked, setMarked] = useState(false);
  const [reward, setReward] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      // 이 글을 읽음으로: 회원은 서버(코스를 다 읽으면 보상), 비회원은 이 기기
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: stepKey }),
      }).catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { points?: number };
        if (alive && data.points) setReward(data.points);
      } else {
        saveLocal([...new Set([...localRead(), stepKey])]);
      }
      if (alive) setMarked(true);
    })();
    return () => {
      alive = false;
    };
  }, [stepKey]);

  return (
    <section data-course-box aria-label="공부 코스" className="grid gap-2 rounded-2xl border border-[#c9a25c]/40 bg-[#c9a25c]/10 p-4">
      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#f3d9a4]">
        📚 <Link href={`/study/course/${course.id}`} className="underline underline-offset-4">{course.title} 코스</Link>
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs text-[#e7c98a]">
          {index + 1} / {course.total}편
        </span>
        {marked ? <span className="text-xs text-emerald-300">✓ 읽음</span> : null}
      </p>
      {reward ? (
        <p data-course-reward className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-black text-emerald-200">
          🎉 코스를 다 읽었어요! +{reward}P
        </p>
      ) : null}
      {next ? (
        <Link
          href={next.href}
          data-course-next
          className="inline-flex min-h-12 items-center justify-between gap-2 rounded-xl bg-[#c9a25c] px-4 text-base font-black text-[#1d1611] hover:bg-[#e7c98a]"
        >
          <span className="min-w-0 truncate">다음 글: {next.title}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <Link href="/study#courses" className="inline-flex min-h-11 items-center text-sm font-bold text-[#e7c98a] underline">
          코스 마지막 글이에요 · 다른 코스 보기 →
        </Link>
      )}
    </section>
  );
}

/** 코스 목록(홀덤 공부 · 코스 페이지): 읽은 글 수 · 이어서 읽기 */
export function CourseList({ courses, expanded = false }: { courses: CourseView[]; expanded?: boolean }) {
  const [read, setRead] = useState<Set<string> | null>(null);
  const [member, setMember] = useState(true);
  useEffect(() => {
    void fetchRead().then((r) => {
      setRead(new Set(r.read));
      setMember(r.member);
    });
  }, []);
  return (
    <div className="grid gap-3">
      {!member ? (
        <p className="text-xs text-[#b8ab98]">로그인하면 읽은 기록이 휴대폰 · PC 어디서나 이어지고, 코스를 다 읽으면 포인트를 받아요.</p>
      ) : null}
      <ul className={cn("grid gap-3", !expanded && "sm:grid-cols-2")}>
        {courses.map((course) => {
          const doneCount = read ? course.steps.filter((s) => read.has(s.key)).length : 0;
          const nextStep = course.steps.find((s) => !read?.has(s.key)) ?? course.steps[0];
          const finished = read != null && doneCount === course.steps.length;
          return (
            <li key={course.id} data-course={course.id} className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">{course.level}</span>
                <h3 className="text-lg font-black text-[#f3d9a4]">
                  <Link href={`/study/course/${course.id}`}>{course.title}</Link>
                </h3>
                <span className="ml-auto text-xs font-bold text-[#e7c98a]">
                  {read ? `${doneCount}/${course.steps.length}편` : `${course.steps.length}편`}
                  {finished ? " · 완료 🎉" : ""}
                </span>
              </div>
              <p className="text-sm text-[#d1c7b5]">{course.hint}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#c9a25c]" style={{ width: `${(doneCount / course.steps.length) * 100}%` }} />
              </div>
              {expanded ? (
                <ol className="grid gap-1">
                  {course.steps.map((step, i) => (
                    <li key={step.key}>
                      <Link href={step.href} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-[15px] text-[#E5E7EB] hover:bg-white/5">
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-black", read?.has(step.key) ? "bg-emerald-500 text-black" : "bg-white/10 text-[#e7c98a]")}>
                          {read?.has(step.key) ? "✓" : i + 1}
                        </span>
                        <span className="min-w-0">{step.title}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <Link href={nextStep.href} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-black text-[#f3d9a4] hover:bg-[#c9a25c]/15">
                  {finished ? "처음부터 다시 보기" : doneCount ? `이어서 읽기: ${nextStep.title}` : `시작하기: ${nextStep.title}`}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
