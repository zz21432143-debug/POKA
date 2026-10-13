import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { JOB_KIND_LABEL } from "@/lib/nav";
import { titleRegion } from "@/lib/jobs";
import { payNumber } from "@/lib/job-jsonld";

export const alt = "POKA 게시글";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** "2026-10-18" → "10/18(일)" */
function shortDate(day: string | null) {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  return `${m}/${d}(${"일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}

/**
 * 글마다 카톡·SNS 미리보기 그림.
 * 구인: 분류 · 지역 · 상호 · 급여 · 날짜를 크게(연락처는 넣지 않음). 그 밖: 게시판 이름 + 제목.
 */
export default async function PostOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post
    .findUnique({
      where: { id },
      select: {
        title: true,
        boardType: true,
        hidden: true,
        isPrivate: true,
        jobKind: true,
        jobLocation: true,
        jobCompanyName: true,
        jobPayType: true,
        jobPayAmount: true,
        jobWorkDate: true,
        jobWorkHours: true,
        eventDate: true,
        promoLocation: true,
      },
    })
    .catch(() => null);
  const mascot = await readFile(join(process.cwd(), "public/icons/poka-512.png"));
  const mascotSrc = `data:image/png;base64,${mascot.toString("base64")}`;

  const open = post && !post.hidden && !post.isPrivate && post.boardType !== "ANONYMOUS_REVIEW" && post.jobKind !== "SEEKING";
  const isJob = Boolean(open && post?.jobKind);
  const urgent = post?.jobKind === "URGENT";
  const kicker = !open
    ? "POKA"
    : isJob
      ? `${urgent ? "🚨 " : ""}${JOB_KIND_LABEL[post!.jobKind as keyof typeof JOB_KIND_LABEL] ?? "구인"}`
      : (BOARD_LABELS[post!.boardType as BoardTypeKey] ?? "POKA");
  const amount = payNumber(post?.jobPayAmount ?? null);
  const facts = isJob
    ? [
        titleRegion(post!.jobLocation) !== "미정" ? titleRegion(post!.jobLocation) : null,
        post!.jobPayType && amount ? `${post!.jobPayType} ${amount.toLocaleString("ko-KR")}원` : null,
        shortDate(post!.jobWorkDate),
        post!.jobWorkHours,
      ].filter(Boolean)
    : post?.boardType === "SCHEDULE"
      ? [shortDate(post.eventDate), post.promoLocation].filter(Boolean)
      : [];
  const headline = !open ? "홀덤·딜러 커뮤니티" : isJob && post!.jobCompanyName ? post!.jobCompanyName : post!.title;
  const sub = open && isJob && post!.jobCompanyName ? post!.title : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          background: urgent ? "linear-gradient(160deg, #2a0707 0%, #5a1010 60%, #8b1a1a 100%)" : "linear-gradient(160deg, #120b0b 0%, #2a0f10 55%, #4a1416 100%)",
          color: "#f6efe6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              padding: "10px 26px",
              borderRadius: 999,
              background: urgent ? "#ffdddd" : "#c9a25c",
              color: urgent ? "#8b1a1a" : "#1d1611",
              fontSize: 40,
            }}
          >
            {kicker}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: headline.length > 22 ? 58 : 76, lineHeight: 1.15, maxHeight: 270, overflow: "hidden" }}>{headline}</div>
          {sub ? <div style={{ display: "flex", fontSize: 34, color: "#f3dcc4", maxHeight: 90, overflow: "hidden" }}>{sub}</div> : null}
          {facts.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {facts.map((fact) => (
                <div key={String(fact)} style={{ display: "flex", padding: "8px 22px", borderRadius: 16, background: "rgba(255,255,255,0.12)", fontSize: 38, color: "#ffe9b8" }}>
                  {fact}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mascotSrc} width={84} height={84} alt="" style={{ borderRadius: 20 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 40 }}>POKA</div>
              <div style={{ fontSize: 24, color: "#e7c98a", letterSpacing: 2 }}>POKERWIKI.CO.KR</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#d8c6ae" }}>{isJob ? "연락처는 POKA에서 확인" : "딜러 구인부터 매장 운영까지"}</div>
        </div>
      </div>
    ),
    size,
  );
}
