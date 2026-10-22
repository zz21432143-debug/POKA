import { getHomeCounts } from "@/lib/home-data";
import { getQuiz } from "@/lib/quiz-server";
import { HOLDEM_GUIDES } from "@/lib/holdem-guides";
import { ATTENDANCE_POINTS } from "@/lib/rewards";
import { SITE_HOST } from "@/lib/site";
import { todayKstDate } from "@/lib/dates";

const BASE = `https://${SITE_HOST}`;
/** 카톡 링크로 들어온 방문은 관리자 「유입 경로」의 카카오톡 줄에 잡힘 */
const tag = (path: string) => `${BASE}${path}${path.includes("?") ? "&" : "?"}from=kakao`;

/** "2026-10-22" → "10/22" */
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 오늘 날짜 빈자리 수 */
async function todaySlots() {
  const { loadJobBoard } = await import("@/lib/job-board");
  const b = await loadJobBoard(null);
  return b.slots.filter((s) => s.date === b.today).length;
}

/**
 * 공식 오픈채팅방에 올릴 「POKA 소식」 글(정보 위주 · 같은 홍보 반복 X). 그날 숫자로 자동으로 만듦.
 * 링크마다 ?from=kakao → 효과를 유입 경로로 확인.
 */
export async function kakaoNewsText() {
  const today = todayKstDate();
  const [counts, slots, quiz] = await Promise.all([
    getHomeCounts().catch(() => null),
    todaySlots().catch(() => 0),
    getQuiz().catch(() => null),
  ]);
  const guide = [...HOLDEM_GUIDES].sort((a, b) => b.updated.localeCompare(a.updated))[0];
  const lines = [`📢 POKA 소식 (${md(today)})`, ""];
  if (counts) {
    lines.push(`🃏 모집 중 딜러 공고 ${counts.jobs}개${slots ? ` · 오늘 빈자리 ${slots}곳` : ""}${counts.urgent ? ` · 급구 ${counts.urgent}건` : ""}`);
    lines.push(`👉 ${tag(slots ? "/boards/jobs/slots" : "/boards/jobs")}`, "");
    if (counts.nextEvent) {
      const ev = counts.nextEvent;
      const when = ev.eventDate ? ` (${md(ev.eventDate)}${ev.eventEndDate && ev.eventEndDate !== ev.eventDate ? `~${md(ev.eventEndDate)}` : ""})` : "";
      lines.push(`🏆 다음 대회: ${ev.title}${when} · 예정 대회 ${counts.events}개`);
      lines.push(`👉 ${tag("/boards/schedule")}`, "");
    }
  }
  if (quiz) {
    lines.push(`🧩 오늘의 퀴즈: ${quiz.question.length > 60 ? `${quiz.question.slice(0, 59)}…` : quiz.question}`);
    lines.push(`👉 ${tag("/quiz")}`, "");
  }
  if (guide) {
    lines.push(`📘 홀덤 가이드: ${guide.title.split(" — ")[0]}`);
    lines.push(`👉 ${tag(`/info/holdem/${guide.slug}`)}`, "");
  }
  lines.push(`✅ 매일 출석 +${ATTENDANCE_POINTS}P · 요괴 마을에서 요괴도 키워 보세요`);
  lines.push(`👉 ${tag("/attendance")}`);
  return lines.join("\n");
}
