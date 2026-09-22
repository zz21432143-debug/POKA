import type { BoardType, JobKind } from "@/generated/prisma/enums";
import { buildJobTitle } from "./jobs";
import type { FeedKey } from "./feed";
import { FEATURED_OFFICIAL_POSTERS, OFFICIAL_POSTER_IMAGES } from "./official-posters";

export const SEED_PER_BOARD = 20;

export const SEED_NICKNAMES = [
  "펠트딜러",
  "핸드헌터",
  "신입버튼",
  "리버샤크",
  "플롭닌자",
  "칩리더",
  "스몰블라인드",
  "빅블라인드",
  "스트래들킹",
  "팟커밋",
  "체크레이즈",
  "올인권",
  "샷클락",
  "브릭가드",
  "턴텍스처",
  "레인보우보드",
  "모노크롬",
  "스페이드에이스",
  "하트리버",
  "클럽캐셔",
  "크라운딜러",
  "나이트시프트",
  "주말스팟",
  "토너스태프",
] as const;

const LOCS = [
  "서울 강남",
  "서울 홍대",
  "경기 분당",
  "부산 서면",
  "대구 동성로",
  "인천 송도",
  "경기 수원",
  "경기 일산",
  "서울 잠실",
  "서울 청담",
  "서울 건대",
  "서울 신림",
  "서울 노원",
  "대전 둔산",
  "광주 상무",
  "제주 연동",
  "울산 삼산",
  "경남 창원",
  "서울 신사",
  "서울 송파",
];

function times<T>(make: (index: number) => T): T[] {
  return Array.from({ length: SEED_PER_BOARD }, (_, index) => make(index));
}

export type CatalogPost = {
  boardType: BoardType;
  jobKind?: JobKind;
  title: string;
  content: string;
  authorNickname: string;
  daysAgo: number;
  upvoteCount: number;
  bannerImageUrl?: string;
  promoLocation?: string;
  promoTag?: string;
  storeVerified?: boolean;
  eventDate?: string;
  eventEndDate?: string;
  eventPrize?: string;
  eventLink?: string;
  handReview?: boolean;
  ratings?: [number, number, number, number];
  jobLocation?: string;
  jobCompanyName?: string;
  jobPayType?: string;
  jobPayAmount?: string;
  jobSchedule?: string;
  jobWorkHours?: string;
  jobBenefits?: string;
  jobExperience?: string;
  jobContact?: string;
  jobWorkDate?: string;
  jobDateFlexible?: boolean;
  jobGuaranteedHours?: string;
  jobOvertime?: string;
  jobTravelPay?: boolean;
  jobSnacks?: boolean;
  jobDressCode?: string;
  jobApplyMethod?: string;
  isPaid?: boolean;
};

function nick(index: number) {
  return SEED_NICKNAMES[index % SEED_NICKNAMES.length];
}

export const ATTENDANCE_LINES = times(
  (index) =>
    [
      "오늘도 핸드 공부합니다.",
      "출근 전 출석 찍고 갑니다.",
      "주말 스팟 대비 컨디션 체크.",
      "스트리트별 사이징 복습 중.",
      "인증 딜러 스터디 후 출석.",
      "캐주얼 한 궤도 뛰고 왔습니다.",
      "룰북 한 장 더 읽고 출석.",
      "대타 콜 대기하며 출석.",
      "토너 스태프 교육 후 체크.",
      "샷클락 연습 끝나고 출석.",
      "플롭 텍스처 노트 정리.",
      "팀 미팅 전 출석합니다.",
      "야간 시프트 전 출석.",
      "주간 베스트핸드 후보 올리는 날.",
      "매장 오픈 준비 완료.",
      "출석 연속 유지 도전.",
      "오늘 판정 이슈 정리할 예정.",
      "현장 스케치 찍고 출석.",
      "핸드리뷰 초안 쓰고 출석.",
      "퇴근길 출석 완료.",
    ][index],
);

export function catalogPosts(today: string): Record<Exclude<FeedKey, "attendance">, CatalogPost[]> {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));

  const free: CatalogPost[] = times((i) => ({
    boardType: "FREE",
    title: [
      "오늘 캐주얼에서 겪은 이상한 런",
      "딜러 콜 타이밍, 다들 어떻게 하세요",
      "야간 시프트 체력 관리 팁",
      "주말 바쁜 매장 동선 공유",
      "신입 교육 체크리스트 나눠요",
      "샷클락 도입 후 템포 체감",
      "식대 나오는 매장 추천받습니다",
      "토너 브레이크 운영 노하우",
      "올블랙 복장 브랜드 추천",
      "연속 출석 보상 체감되시나요",
      "핸드 노트 앱 쓰시는 분",
      "주중 낮 게임 분위기 어떤가요",
      "딜러 체어 높이 조절 팁",
      "손님 매너 이슈 대처법",
      "시급 협의할 때 기준점",
      "지방 원정 스팟 짐 싸는 법",
      "팀 단톡 예절 질문",
      "라이브 첫 달 회고",
      "프로모션 칩 세는 속도 올리기",
      "오늘 퇴근하고 맥주 한잔 하실 분",
    ][i],
    content: `${LOCS[i]}에서 겪은 이야기입니다. 현장 감이랑 운영 팁을 나눠 주세요. (${i + 1}번째 글)`,
    authorNickname: nick(i + 1),
    daysAgo: i,
    upvoteCount: (i * 3) % 17,
  }));

  const rules: CatalogPost[] = times((i) => ({
    boardType: "RULE_QA",
    title: [
      "스트래들 이후 액션 순서가 맞나요?",
      "런잇투이스 선언 타이밍",
      "올인 후 사이드팟 정리가 헷갈립니다",
      "미스딜 선언은 몇 장부터인가요",
      "버튼 데드 시 스트래들 가능?",
      "쇼다운 오픈 순서 TDA 기준",
      "스트링벳 경고 몇 번이면 페널티",
      "언콜드 레이즈 정정 가능한가요",
      "토너 샷클락 연장 칩 사용 시점",
      "캐주얼 킬팟 분배 규칙",
      "엑스트라 블라인드 착석 타이밍",
      "보드 카드 노출 후 핸드 데드?",
      "칩 던지며 콜이라고 하면 레이즈?",
      "딜러 실수 시 핸드 백업 범위",
      "엔티 게임 스트래들 허용 여부",
      "폰 확인은 언제부터 가능한가요",
      "올인 플레이어 테이블 토크",
      "컬러업 중 베팅 접수하나요",
      "버튼 스킵된 핸드 유효한가요",
      "마지막 핸드 선언 후 바이인",
    ][i],
    content: `룰북과 현장 하우스룰이 달라 확인 부탁드립니다. 상황 번호 ${i + 1}. ${LOCS[i]} 매장 기준입니다.`,
    authorNickname: nick(i + 2),
    daysAgo: i,
    upvoteCount: 2 + (i % 9),
  }));

  const sketch: CatalogPost[] = times((i) => ({
    boardType: "SKETCH",
    title: [
      "코엑스 위클리 파이널 테이블",
      "홍대 심야 캐주얼 분위기",
      "부산 오픈 등록 데스크",
      "강남 프라이빗 룸 조명",
      "송도 나이트 브레이크 풍경",
      "제주 썸머 토너 야외 흡연존",
      "잠실 메인 이벤트 갤러리",
      "분당 주말 오픈 줄",
      "청담 하이폴더 테이블",
      "서면 딜러 교대 순간",
      "수원 아카데미 수업 현장",
      "신사 프로모션 현수막",
      "건대 신입 오리엔테이션",
      "대전 리저널 플레이어 입장",
      "광주 상무 캐주얼 바",
      "울산 심야 시프트",
      "창원 토너 스태프 단체컷",
      "노원 소규모 홈게임 세팅",
      "신림 첫방문 이벤트",
      "일산 주간 리그 시상",
    ][i],
    content: `${LOCS[i]} 현장 스케치입니다. 사진 한 장과 짧은 메모.`,
    authorNickname: nick(i + 3),
    daysAgo: i,
    upvoteCount: i % 11,
    bannerImageUrl: `/banners/slot-${(i % 6) + 1}.svg`,
  }));

  const hand: CatalogPost[] = times((i) => ({
    boardType: "HAND_REVIEW",
    title: [
      "BTN vs BB, 100bb, AJs 3bet pot",
      "CO 오픈 후 SB 스퀴즈 콜",
      "UTG JJ, 플롭 A-high 투톤",
      "BB 디펜스 블러프캐치",
      "스트래들 팟 KQo 플롭 드로우",
      "숏스택 15bb 푸시폴 구간",
      "멀티웨이 셋 vs 플러시드로우",
      "턴 프로브 사이징 질문",
      "리버 오버벳 블러프 빈도",
      "허어로 콜다운 스팟",
      "3bet pot 드라이 플롭 cbet",
      "4bet 폴드 너무 타이트한가요",
      "SRP 탑페어 위크키커",
      "포지션 없는 너티 핸드",
      "돈크벳 상대 플로트",
      "블라인드 배틀 스몰페어",
      "토너 ICM 버블 콜",
      "파이널 테이블 샷클락 올인",
      "라이브 리드 투톤 플러시",
      "체크레이즈 이후 턴 배럴",
    ][i],
    content: `이 핸드라면 Fold/Check/Call/Raise 투표 부탁합니다. 유효스택 ${80 + i}bb, 자리 ${LOCS[i]}.`,
    authorNickname: nick(i),
    daysAgo: i,
    upvoteCount: 8 + (i % 20),
    handReview: true,
  }));

  const anonymous: CatalogPost[] = times((i) => ({
    boardType: "ANONYMOUS_REVIEW",
    title: [
      "강남 캐주얼 룸 딜러 진행 후기",
      "홍대 라이브 룸 시설 후기",
      "분당 매장 서비스는 무난",
      "서면 룸 환기 아쉬움",
      "송도 나이트 매너 좋았음",
      "잠실 주말 대기 길어요",
      "청담 하이 테이블 진행",
      "수원 캐주얼 첫방문",
      "제주 관광 겸 플레이",
      "대전 둔산 딜러 콜 정확",
      "광주 상무 분위기",
      "울산 심야 손님층",
      "창원 토너 데이1 운영",
      "노원 소규모 룸",
      "신림 프로모션 과한 권유",
      "일산 주간 리그 진행",
      "신사 프라이빗 응대",
      "건대 학생 손님 많음",
      "송파 주차 편함",
      "인천 송도 칩 상태",
    ][i],
    content: `${LOCS[i]} 익명 후기입니다. 진행·시설 위주로 적습니다.`,
    authorNickname: nick(i + 5),
    daysAgo: i,
    upvoteCount: 1 + (i % 8),
    ratings: [
      3 + (i % 3),
      2 + (i % 4),
      3 + ((i + 1) % 3),
      3 + ((i + 2) % 3),
    ] as [number, number, number, number],
  }));

  const schedule: CatalogPost[] = times((i) => {
    const day = String(((i * 1) % 27) + 1).padStart(2, "0");
    const end = String(Math.min(28, ((i * 1) % 27) + 2)).padStart(2, "0");
    const month = String(m).padStart(2, "0");
    return {
      boardType: "SCHEDULE" as const,
      title: [
        "서울 홀덤 위클리",
        "부산 오픈 메인",
        "인천 송도 딥스택",
        "제주 썸머 페스티벌",
        "대전 리저널",
        "광주 나이트 컵",
        "수원 주말 오픈",
        "잠실 하이롤러",
        "강남 캐주얼 리그",
        "홍대 심야 토너",
        "분당 마이크로 시리즈",
        "청담 인비테이셔널",
        "대구 동성로 컵",
        "울산 삼산 오픈",
        "창원 스태프 초청",
        "노원 커뮤니티 컵",
        "신사 프라이빗 싯앤고",
        "건대 신입 프렌들리",
        "송파 팀 리그",
        "일산 주간 챔피언십",
      ][i],
      content: `${LOCS[i]}에서 열리는 토너먼트입니다. 일자별·월별 일정표에 표시됩니다.`,
      authorNickname: "펠트딜러",
      daysAgo: i,
      upvoteCount: 4,
      eventDate: `${y}-${month}-${day}`,
      eventEndDate: `${y}-${month}-${end}`,
      eventPrize: `₩${(30 + i * 5).toLocaleString("ko-KR")},000,000`,
      eventLink: "https://poka.example/events",
      promoLocation: LOCS[i],
      bannerImageUrl: `/banners/slot-${(i % 6) + 1}.svg`,
    };
  });

  const official: CatalogPost[] = times((i) => {
    const featured = FEATURED_OFFICIAL_POSTERS[i];
    return {
      boardType: "PROMO",
      title: featured
        ? featured.title
        : [
            "딜러 아카데미 설명회",
            "첫방문 칩 패키지",
            "브랜드 스폰서 나잇",
            "팀 유니폼 협찬",
            "샷클락 장비 지원",
            "하이폴더 초대권",
            "서머 토너 얼리버드",
            "인증 매장 감사제",
            "야간 뷔페 이벤트",
            "주차 2시간 무료",
            "생일 바운티 칩",
            "스태프 채용 설명",
            "프로 플레이어 사인회",
            "시즌 랭킹 시상식",
          ][i - 6],
      content: featured ? featured.content : `${LOCS[i]} 공식 홍보·제휴 소식입니다.`,
      authorNickname: "펠트딜러",
      daysAgo: i,
      upvoteCount: 6,
      bannerImageUrl: featured ? featured.image : OFFICIAL_POSTER_IMAGES[i % OFFICIAL_POSTER_IMAGES.length],
      promoLocation: featured ? featured.location : LOCS[i],
      promoTag: featured ? featured.tag : ["나이트", "제휴", "협찬", "멤버십", "교육"][i % 5],
      storeVerified: true,
      isPaid: featured ? featured.isPaid : false,
    };
  });

  const jobsFixed: CatalogPost[] = times((i) => {
    const company = ["POKA 펍", "에이스 룸", "펠트하우스", "미드나잇", "골드칩"][i % 5];
    const location = LOCS[i];
    const amount = String(2800000 + i * 50000);
    return {
      boardType: "JOBS" as const,
      jobKind: "FIXED" as const,
      title: buildJobTitle("FIXED", { location, companyName: company, payAmount: amount }),
      content: `${location} 고정 직원 모집입니다. 주말 포함, 라이브 경험 우대.`,
      authorNickname: nick(0),
      daysAgo: i,
      upvoteCount: i % 6,
      jobLocation: location,
      jobCompanyName: company,
      jobPayType: "월급",
      jobPayAmount: amount,
      jobSchedule: i % 2 ? "주5일" : "주6일",
      jobWorkHours: "20:00–04:00",
      jobBenefits: "식대 · 교통비",
      jobExperience: "라이브 1년 이상",
      jobContact: `010-2${String(100 + i).padStart(3, "0")}-1111`,
      isPaid: i === 0,
    };
  });

  const jobsApply: CatalogPost[] = times((i) => {
    const location = LOCS[i];
    const amount = String(18000 + i * 500);
    const workDate = `${today.slice(0, 8)}${String((i % 27) + 1).padStart(2, "0")}`;
    return {
      boardType: "JOBS" as const,
      jobKind: "APPLY" as const,
      title: buildJobTitle("APPLY", { location, payAmount: amount }),
      content: `${location} 단기 스팟 지원 딜러를 찾습니다.`,
      authorNickname: nick(0),
      daysAgo: i,
      upvoteCount: i % 5,
      jobLocation: location,
      jobPayType: "시급",
      jobPayAmount: amount,
      jobWorkDate: workDate,
      jobDateFlexible: i % 4 === 0,
      jobGuaranteedHours: "6시간",
      jobOvertime: i % 2 ? "가능" : "불가",
      jobTravelPay: i % 2 === 0,
      jobSnacks: true,
      jobDressCode: "올블랙",
      jobExperience: "스팟 딜러 경험",
      jobContact: `010-3${String(200 + i).padStart(3, "0")}-2222`,
    };
  });

  const jobsTeam: CatalogPost[] = times((i) => {
    const location = LOCS[i];
    const company = ["ACE 딜러팀", "나이트크루", "골드스태프", "리버팀", "버튼크루"][i % 5];
    return {
      boardType: "JOBS" as const,
      jobKind: "TEAM" as const,
      title: buildJobTitle("TEAM", { location, companyName: company }),
      content: `${location} 중심으로 움직이는 팀원 모집입니다.`,
      authorNickname: nick(1),
      daysAgo: i,
      upvoteCount: i % 4,
      jobLocation: location,
      jobCompanyName: company,
      jobExperience: "토너 스태프 경험",
      jobBenefits: "세션비 · 숙소",
      jobApplyMethod: "프로필 회신",
      jobContact: `010-4${String(300 + i).padStart(3, "0")}-3333`,
    };
  });

  const jobsUrgent: CatalogPost[] = times((i) => {
    const location = LOCS[i];
    const workDate = i % 3 === 0 ? "" : `${today.slice(0, 8)}${String((i % 27) + 1).padStart(2, "0")}`;
    return {
      boardType: "JOBS" as const,
      jobKind: "URGENT" as const,
      title: buildJobTitle("URGENT", {
        location,
        workDate: workDate || "즉시",
      }),
      content: `${location} 급구/대타입니다. 오늘·내일 가능한 분만.`,
      authorNickname: nick(0),
      daysAgo: i % 5,
      upvoteCount: i % 3,
      jobLocation: location,
      jobPayType: "시급",
      jobPayAmount: String(22000 + i * 500),
      jobWorkDate: workDate || undefined,
      jobDateFlexible: !workDate,
      jobWorkHours: "22:00–06:00",
      jobExperience: "대타 경험",
      jobContact: `010-5${String(400 + i).padStart(3, "0")}-4444`,
    } as CatalogPost;
  });

  const jobsSeek: CatalogPost[] = times((i) => {
    const location = LOCS[i];
    const name = nick(i + 2);
    return {
      boardType: "JOBS" as const,
      jobKind: "SEEKING" as const,
      title: buildJobTitle("SEEKING", { location, companyName: name }),
      content: `${location} 희망. 야간·주말 가능합니다. 이력은 본문에 적었습니다.`,
      authorNickname: name,
      daysAgo: i,
      upvoteCount: i % 4,
      jobLocation: location,
      jobCompanyName: name,
      jobPayAmount: "시급 2만원대",
      jobSchedule: i % 2 ? "주말 · 야간" : "주중 야간",
      jobExperience: i % 3 ? "라이브 1년" : "아카데미 수료",
      jobContact: `010-6${String(500 + i).padStart(3, "0")}-5555`,
    };
  });

  return {
    schedule,
    official,
    rules,
    sketch,
    free,
    "hand-review": hand,
    anonymous,
    "jobs/fixed": jobsFixed,
    "jobs/apply": jobsApply,
    "jobs/team": jobsTeam,
    "jobs/urgent": jobsUrgent,
    "jobs/seek": jobsSeek,
  };
}

export function seedCountByFeed(catalog: ReturnType<typeof catalogPosts>) {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, rows]) => [key, rows.length]),
  ) as Record<Exclude<FeedKey, "attendance">, number>;
}
