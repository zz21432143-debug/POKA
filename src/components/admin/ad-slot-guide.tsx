import { BANNER_SIZE, PLACEMENT_META, POSTER_SIZE } from "@/lib/inventory-policy";

const SLOTS = [
  {
    key: "B",
    color: "bg-[#8b2222] text-white",
    name: "메인 포스터",
    code: "B1–B6",
    where: "홈 화면 맨 위 큰 그림 바로 아래. 세로 포스터가 한 줄에 3장씩 보이고 옆으로 넘어갑니다.",
    fill: "공식 홍보 게시판 글의 사진이 들어갑니다. 비어 있는 자리에는 'POKA 무료 홍보 이벤트' 포스터가 나옵니다.",
    size: POSTER_SIZE,
  },
  {
    key: "A",
    color: "bg-[#1e6fd9] text-white",
    name: "하단 가로 배너",
    code: "A1·A2·A3",
    where: "홈·게시판·출석체크·검색 화면에서 글 목록이 끝난 맨 아래. 가로 배너 3개가 나란히 보입니다.",
    fill: "여기서 사진을 올려 채웁니다. 비워 두면 구글 광고가 대신 나옵니다.",
    size: BANNER_SIZE,
  },
  {
    key: "S",
    color: "bg-[#c59b27] text-[#1d1611]",
    name: "오른쪽 사이드 배너",
    code: "S",
    where: "PC: 화면 오른쪽 내 프로필 상자 바로 아래. 휴대폰: 맨 아래 가로 배너(A) 밑.",
    fill: "여기서 사진을 올려 채웁니다. 비워 두면 '광고 문의' 안내가 나옵니다.",
    size: PLACEMENT_META.SIDEBAR.size,
  },
  {
    key: "C",
    color: "bg-[#2a9d55] text-white",
    name: "글 목록 속 광고",
    code: "C",
    where: "게시판 글 목록과 홈 '최신글' 목록에서 3번째 글 바로 아래. 글처럼 한 줄로 끼어 들어가고 '제휴'·'AD' 표시가 붙습니다.",
    fill: "제목을 넣어야 보입니다(사진은 선택, 제목 왼쪽 작은 썸네일). 제목을 비우면 이 줄은 아예 안 나옵니다.",
    size: PLACEMENT_META.NATIVE.size,
  },
] as const;

function Tag({ k, className = "" }: { k: string; className?: string }) {
  const slot = SLOTS.find((row) => row.key === k);
  return (
    <span className={`grid place-items-center rounded font-black ${slot?.color ?? ""} ${className}`}>{k}</span>
  );
}

/** 배너 관리 맨 위: 홍보 자리가 화면 어디에 나오는지 그림과 함께 설명 */
export function AdSlotGuide() {
  return (
    <section aria-label="홍보 자리 안내" className="grid items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
      {/* 화면 미니 지도(PC 기준) */}
      <figure className="mx-auto grid w-full max-w-md content-start gap-1.5">
        <figcaption className="text-xs font-bold text-muted-foreground">PC 화면에서의 위치</figcaption>
        <div className="grid grid-cols-[1fr_3.5fr_1.6fr] content-start items-start gap-1 rounded-lg border border-border bg-[#120b0b] p-1.5 text-[10px] text-[#9CA3AF]">
          <div className="col-span-3 rounded bg-white/10 px-1 py-0.5">상단 메뉴</div>
          <div className="self-stretch rounded bg-white/5 p-1">왼쪽 메뉴</div>
          <div className="grid gap-1">
            <div className="rounded bg-white/10 py-2 text-center">큰 그림</div>
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3].map((n) => (
                <Tag key={n} k="B" className="aspect-[5/7] text-xs" />
              ))}
            </div>
            <div className="grid gap-0.5 rounded bg-white/5 p-1">
              <span className="h-1.5 rounded bg-white/15" />
              <span className="h-1.5 rounded bg-white/15" />
              <span className="h-1.5 rounded bg-white/15" />
              <Tag k="C" className="h-3 text-[9px]" />
              <span className="h-1.5 rounded bg-white/15" />
              <span className="text-center">글 목록</span>
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3].map((n) => (
                <Tag key={n} k="A" className="aspect-[2/1] text-xs" />
              ))}
            </div>
          </div>
          <div className="grid content-start gap-1">
            <div className="rounded bg-white/10 py-3 text-center">내 프로필</div>
            <Tag k="S" className="aspect-[6/5] text-sm" />
            <div className="rounded bg-white/5 py-2 text-center">공지</div>
          </div>
        </div>
      </figure>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SLOTS.map((slot) => (
          <li key={slot.key} className="rounded-xl border border-border p-3 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <Tag k={slot.key} className="size-6 text-xs" />
              {slot.name} <span className="text-xs font-semibold text-muted-foreground">({slot.code})</span>
            </p>
            <p className="mt-1.5 leading-6">
              <b className="text-[#e7c98a]">어디에:</b> {slot.where}
            </p>
            <p className="mt-1 leading-6 text-muted-foreground">
              <b className="text-foreground">채우는 법:</b> {slot.fill}
            </p>
            <p className="mt-1.5 inline-flex rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40">
              권장 {slot.size}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
