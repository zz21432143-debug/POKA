import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/link";
import { COURSES, COURSE_POINTS, getCourse } from "@/lib/courses";
import { courseViews } from "@/lib/course-titles";
import { CourseList } from "@/components/study/course-progress";

export function generateStaticParams() {
  return COURSES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) return { title: "공부 코스" };
  const title = `${course.title} 코스 — 홀덤 공부 순서 ${course.steps.length}편`;
  return { title, description: `${course.hint}. 읽는 순서대로 정리한 POKA 무료 공부 코스.`, alternates: { canonical: `/study/course/${course.id}` } };
}

/** 공부 코스 한 개: 읽는 순서 · 읽은 글 표시 */
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = courseViews().find((c) => c.id === id);
  if (!course) notFound();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#9CA3AF]">
        <Link href="/study#courses" className="text-[#E5E7EB] hover:text-[#C59B27]">
          홀덤 공부 · 코스
        </Link>
      </p>
      <header className="board-intro">
        <h1>📚 {course.title} 코스</h1>
        <p className="mt-2">
          {course.hint}. 위에서부터 순서대로 읽으면 돼요. 다 읽으면 +{COURSE_POINTS}P(회원 · 한 번).
        </p>
      </header>
      <CourseList courses={[course]} expanded />
      <Link href="/study#courses" className="inline-flex min-h-11 items-center text-sm font-bold text-[#e7c98a] underline">
        ← 다른 코스 보기
      </Link>
    </div>
  );
}
