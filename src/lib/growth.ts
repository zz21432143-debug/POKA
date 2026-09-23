import { shiftDate, todayKstDate, weekStartKst } from "./dates";
import { KAKAO_OPEN_CHAT_URL } from "./kakao";

export const WEEKLY_HUB_PREFIX = "이번 주 홀덤 대회 일정";

export const DEALER_CREW_NICKNAMES = [
  "펠트딜러",
  "크라운딜러",
  "핸드헌터",
  "리버샤크",
  "칩리더",
  "샷클락",
  "나이트시프트",
  "주말스팟",
  "토너스태프",
  "스페이드에이스",
] as const;

export function weeklyHubTitle(weekStart = weekStartKst()): string {
  const end = shiftDate(weekStart, 6);
  const fmt = (value: string) => value.replaceAll("-", ".");
  return `${WEEKLY_HUB_PREFIX} (${fmt(weekStart)}–${fmt(end)})`;
}

export function weeklyHubContent(events: { title: string; eventDate?: string | null; promoLocation?: string | null }[]) {
  const lines = events
    .filter((event) => event.title && !event.title.startsWith(WEEKLY_HUB_PREFIX))
    .map((event) => {
      const when = event.eventDate?.replaceAll("-", ".") ?? "날짜 미정";
      const where = event.promoLocation ? ` · ${event.promoLocation}` : "";
      return `- ${when}${where} — ${event.title}`;
    });
  const list = lines.length > 0 ? lines.join("\n") : "- 아직 등록된 홀덤 대회가 없습니다. 관리자가 일정을 올리면 여기에 모입니다.";
  return `한국 홀덤 토너먼트만 모은 주간 허브입니다. 바카라·카지노 일정은 다루지 않습니다.

${list}

개별 대회 글과 달력은 대회 스케줄 게시판에서 이어서 보세요.`;
}

export function kakaoDailyLines(input: {
  today?: string;
  attendancePath?: string;
  handPath?: string;
  weekPath?: string;
  siteOrigin?: string;
}) {
  const today = input.today ?? todayKstDate();
  const origin = (input.siteOrigin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const link = (path: string) => (origin ? `${origin}${path}` : path);
  return [
    `[POKA ${today.replaceAll("-", ".")}] 홀덤만`,
    `1. 출석 ${link(input.attendancePath ?? "/attendance")}`,
    `2. 오늘의 핸드 ${link(input.handPath ?? "/boards/hand-review")}`,
    `3. 이번 주 대회 ${link(input.weekPath ?? "/boards/schedule")}`,
    `오픈채팅 ${KAKAO_OPEN_CHAT_URL}`,
    "투표·검색·후기는 사이트에서.",
  ].join("\n");
}

export function kstDayStart(date = todayKstDate()) {
  return new Date(`${date}T00:00:00+09:00`);
}
