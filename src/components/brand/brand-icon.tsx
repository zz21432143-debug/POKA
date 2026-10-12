import { cn } from "cn";

/**
 * POKA 브랜드 아이콘(오니·동양 테마). 브랜드 시안의 붉은 먹·금색 팔레트를 따릅니다.
 * main: 주홍(기본) / accent: 금색(기본). 빨간 바탕(선택된 메뉴) 위에서는 크림/진홍으로 바뀝니다.
 */
export type BrandIconName =
  | "torii" // 홈(신사 문)
  | "chips" // 지원 딜러(포커 칩)
  | "lantern" // 대회 딜러(등불)
  | "flame" // 급구·인기(불꽃)
  | "noren" // 고정 직원(가게 포렴)
  | "oni" // 팀(오니 탈)
  | "omamori" // 출석(부적)
  | "cloud" // 자유 게시판(소용돌이 구름)
  | "cards" // 핸드리뷰(카드)
  | "moon" // 대회 캘린더(붉은 달)
  | "fan" // 공식 홍보(쥘부채)
  | "scroll" // TDA 룰(두루마리)
  | "coin" // 마크 상점(엽전)
  | "pagoda" // 랭킹(탑)
  | "bell" // 공지(범종)
  | "brush" // 건의(붓)
  | "gourd" // 제휴·광고(호리병)
  | "seal"; // 운영 정책(도장)

export function BrandIcon({
  name,
  className,
  active = false,
}: {
  name: BrandIconName;
  className?: string;
  /** 빨간 바탕 위(선택된 메뉴)일 때 */
  active?: boolean;
}) {
  const main = active ? "#fff4e6" : "#e0483f";
  const accent = active ? "#8b1d1f" : "#e7c98a";
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-5 shrink-0", className)}>
      {name === "torii" ? (
        <>
          <path fill={main} d="M2 5.2c3.2 1 6.6 1.5 10 1.5s6.8-.5 10-1.5l-.7 2.6c-3 .8-6.1 1.2-9.3 1.2s-6.3-.4-9.3-1.2L2 5.2Z" />
          <path fill={main} d="M4.2 10.6h15.6v2H4.2zM6.3 8.6h2.2V21H6.3zM15.5 8.6h2.2V21h-2.2z" />
          <path fill={accent} d="M11 8.9h2v1.7h-2z" />
        </>
      ) : null}
      {name === "chips" ? (
        <>
          <circle cx="12" cy="12" r="9" fill={main} />
          <path fill={accent} d="M10.6 3h2.8v2.6h-2.8zM10.6 18.4h2.8V21h-2.8zM3 10.6h2.6v2.8H3zM18.4 10.6H21v2.8h-2.6z" />
          <circle cx="12" cy="12" r="4.9" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="2.2 1.6" />
          <circle cx="12" cy="12" r="2" fill={accent} />
        </>
      ) : null}
      {name === "lantern" ? (
        <>
          <path fill={accent} d="M11.4 1.2h1.2v2H11.4zM8 3h8v2.2H8zM8 18.8h8V21H8zM11.3 21h1.4v2.4h-1.4z" />
          <path fill={main} d="M12 4.8c4.4 0 7.2 3.2 7.2 7.2S16.4 19.2 12 19.2 4.8 16 4.8 12 7.6 4.8 12 4.8Z" />
          <path fill="none" stroke={accent} strokeWidth="1.1" d="M8.8 6.1c-1.5 3.8-1.5 8 0 11.8M15.2 6.1c1.5 3.8 1.5 8 0 11.8M12 5.2v13.6" />
        </>
      ) : null}
      {name === "flame" ? (
        <>
          <path fill={main} d="M12 1.8c1.2 3.4-.6 5.3-2.3 7.2C8.2 10.7 6.5 12.6 6.5 15.4a5.5 5.5 0 0 0 11 0c0-2.6-1.3-4.5-2.5-5.7.2 1.6-.4 2.8-1.4 3.3.5-4.1-.4-8-1.6-11.2Z" />
          <path fill={accent} d="M12.1 13c1 1.3 2.3 2.2 2.3 3.8a2.4 2.4 0 0 1-4.8 0c0-1.5 1.3-2.5 2.5-3.8Z" />
        </>
      ) : null}
      {name === "noren" ? (
        <>
          <path fill={accent} d="M2.6 3.6h18.8v1.9H2.6z" />
          <path fill={main} d="M4 5.5h4.9v12.8l-2.45 1.7L4 18.3zM9.55 5.5h4.9v12.8L12 20l-2.45-1.7zM15.1 5.5H20v12.8L17.55 20l-2.45-1.7z" />
          <circle cx="12" cy="10.8" r="1.7" fill={accent} />
        </>
      ) : null}
      {name === "oni" ? (
        <>
          <path fill={main} d="M6.4 7.4 4 2.2l4.3 3.6A7.4 7.4 0 0 1 12 4.8c1.4 0 2.6.4 3.7 1L20 2.2l-2.4 5.2c.6 1 .9 2 .9 3.2v3.3c0 3.8-2.9 6.9-6.5 6.9s-6.5-3.1-6.5-6.9v-3.3c0-1.1.3-2.2.9-3.2Z" />
          <path fill={accent} d="m7.8 10.6 3 1.1-.4 1.3-3-1.1zM16.2 10.6l-3 1.1.4 1.3 3-1.1zM9 15.6h6l-.9 1.6-1.05-.9-1.05.9-1.05-.9-1.05.9z" />
        </>
      ) : null}
      {name === "omamori" ? (
        <>
          <path fill={accent} d="M11.4 .8h1.2v2.6h-1.2z" />
          <path fill={main} d="M7 6 12 3.4 17 6v14a1.2 1.2 0 0 1-1.2 1.2H8.2A1.2 1.2 0 0 1 7 20z" />
          <circle cx="12" cy="4.9" r="1.4" fill={accent} />
          <path fill={accent} d="M9.4 10h5.2v1.3H9.4zM9.4 12.8h5.2v1.3H9.4zM11.35 9h1.3v6.6h-1.3zM9.4 16.6h5.2v1.2H9.4z" />
        </>
      ) : null}
      {name === "cloud" ? (
        <>
          <path fill={main} d="M6.4 18.6a4.6 4.6 0 0 1-.6-9.2 5.8 5.8 0 0 1 11-1.3 4.7 4.7 0 0 1 1.4 9.2 4.2 4.2 0 0 1-2.6 1.3Z" />
          <path fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" d="M9.2 14.4a1.9 1.9 0 1 1 2.1 1.9 3 3 0 1 0-3-3.1" />
        </>
      ) : null}
      {name === "cards" ? (
        <>
          <path fill={accent} d="m3.6 7 6.9-1.9 3.7 13.7-6.9 1.9z" />
          <path fill={main} d="M10.2 3.8h8a1.5 1.5 0 0 1 1.5 1.5v13.4a1.5 1.5 0 0 1-1.5 1.5h-8a1.5 1.5 0 0 1-1.5-1.5V5.3a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path fill={accent} d="M14.2 8c1.2 1.4 2.7 2.4 2.7 3.9a1.7 1.7 0 0 1-2.9 1.2 1.7 1.7 0 0 1-2.9-1.2c0-1.5 1.5-2.5 3.1-3.9Zm-.6 5h1.2l-.6 2.4z" />
        </>
      ) : null}
      {name === "moon" ? (
        <>
          <circle cx="12" cy="10.8" r="7.8" fill={main} />
          <path fill={accent} d="M2.4 16.6c2.2-1 4.1-.6 5.4.3 1.6-1.3 3.9-1.4 5.6-.2 1.8-1.2 4.5-1.3 8.2.4v1.9H2.4z" />
          <circle cx="9.4" cy="8.2" r="1.2" fill={accent} opacity="0.6" />
        </>
      ) : null}
      {name === "fan" ? (
        <>
          <path fill={main} d="M12 20 2.6 10.9a13.2 13.2 0 0 1 18.8 0z" />
          <path fill="none" stroke={accent} strokeWidth="1" d="M12 20 6.6 6.6M12 20V4.8M12 20l5.4-13.4M12 20 3.8 9.6M12 20l8.2-10.4" />
          <path fill={accent} d="M11.1 19.2h1.8V23h-1.8z" />
        </>
      ) : null}
      {name === "scroll" ? (
        <>
          <path fill={main} d="M6 5.6h12v12.8H6z" />
          <path fill={accent} d="M3 4.4h3.2v15.2H3zM17.8 4.4H21v15.2h-3.2z" />
          <path fill={accent} d="M8.2 8.6h7.6v1.3H8.2zM8.2 11.4h7.6v1.3H8.2zM8.2 14.2h4.8v1.3H8.2z" />
        </>
      ) : null}
      {name === "coin" ? (
        <>
          <circle cx="12" cy="12" r="9" fill={main} />
          <circle cx="12" cy="12" r="6.8" fill="none" stroke={accent} strokeWidth="1" />
          <path fill={accent} d="M9.9 9.9h4.2v4.2H9.9z" />
          <path fill={accent} d="M11.3 5.8h1.4v2.4h-1.4zM11.3 15.8h1.4v2.4h-1.4zM5.8 11.3h2.4v1.4H5.8zM15.8 11.3h2.4v1.4h-2.4z" />
        </>
      ) : null}
      {name === "pagoda" ? (
        <>
          <path fill={main} d="M12 1.6 7.6 5.6h8.8zM4.6 8h14.8l-2.2 2.3H6.8zM3.6 12.8h16.8l-2.4 2.4H6zM2.6 17.8h18.8l-2.6 2.6H5.2z" />
          <path fill={accent} d="M9.4 5.6h5.2V8H9.4zM8 10.3h8v2.5H8zM7 15.2h10v2.6H7zM6.2 20.4h11.6V22H6.2z" />
        </>
      ) : null}
      {name === "bell" ? (
        <>
          <path fill={accent} d="M10.9 1.6h2.2v2.6h-2.2z" />
          <path fill={main} d="M7.2 6.2c0-1.3 1.1-2.2 2.4-2.2h4.8c1.3 0 2.4.9 2.4 2.2v9.6l1.8 2.6H5.4l1.8-2.6z" />
          <path fill={accent} d="M7.2 8.6h9.6v1.3H7.2zM7.2 12.6h9.6v1.3H7.2z" />
          <circle cx="12" cy="20.6" r="1.6" fill={accent} />
        </>
      ) : null}
      {name === "brush" ? (
        <>
          <path fill={accent} d="m14.8 2.4 3 3-6.8 6.8-3-3z" />
          <path fill={main} d="m7.4 9.8 3 3c-1.3 3.2-3.8 7.2-7.6 8.8.8-3.9 3.1-7.4 4.6-11.8Z" />
          <path fill={accent} d="m17.2 2 1-1 3.8 3.8-1 1z" />
        </>
      ) : null}
      {name === "gourd" ? (
        <>
          <path fill={accent} d="M10.9 2.2h2.2v3h-2.2z" />
          <path fill={main} d="M12 5.2c1.5 0 2.6 1.1 2.6 2.6 0 1.2-.6 2-1.3 2.6 3 .8 5.1 3.3 5.1 6.3a6.4 6.4 0 0 1-12.8 0c0-3 2.1-5.5 5.1-6.3-.7-.6-1.3-1.4-1.3-2.6 0-1.5 1.1-2.6 2.6-2.6Z" />
          <path fill={accent} d="M8.6 10.2h6.8v1.4H8.6zM15.8 11.6h2.2v3.4h-2.2z" />
        </>
      ) : null}
      {name === "seal" ? (
        <>
          <path fill={main} d="M7 3.6h10a3.4 3.4 0 0 1 3.4 3.4v10a3.4 3.4 0 0 1-3.4 3.4H7A3.4 3.4 0 0 1 3.6 17V7A3.4 3.4 0 0 1 7 3.6Z" />
          <path fill="none" stroke={accent} strokeWidth="1.1" d="M6.4 6.4h11.2v11.2H6.4z" />
          <path fill={accent} d="M8.4 8.6h7.2v1.3H8.4zM11.35 8.6h1.3v7h-1.3zM8.4 14.3h7.2v1.3H8.4z" />
        </>
      ) : null}
    </svg>
  );
}
