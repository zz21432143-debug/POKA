"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StickySubmit } from "@/components/ui/sticky-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocEditor } from "@/components/docs/doc-editor";
import type { BoardType } from "@/generated/prisma/enums";
import { FIRST_POST_BOARDS, FIRST_POST_POINTS, postRewardLine } from "@/lib/rewards";
import { MoneyTitleHint } from "@/components/posts/money-title-hint";
import { boardAllowsPhotos } from "@/lib/post-photos";
import { PostPhotoPicker } from "@/components/posts/post-photo-picker";
import { cn } from "cn";
import { QUESTION_TEMPLATES } from "@/lib/accept-answer";

export type BoardCategory = { boardType: BoardType; label: string };

export function BoardWriteForm({
  boardType: initialBoardType,
  hint,
  categories,
  initialTitle,
}: {
  boardType: BoardType;
  hint: string;
  /** 말머리. 주면 작성자가 고른 말머리가 게시판 종류가 됩니다. */
  categories?: BoardCategory[];
  /** 제목 미리 채우기(홈 「오늘의 이야기거리」) */
  initialTitle?: string;
}) {
  const router = useRouter();
  const [boardType, setBoardType] = useState<BoardType>(initialBoardType);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [content, setContent] = useState("");
  const [bannerSlot, setBannerSlot] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const photoBoard = boardAllowsPhotos(boardType);
  const [promoLocation, setPromoLocation] = useState("");
  const [promoTag, setPromoTag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isPrivate, setIsPrivate] = useState(boardType === "SUGGESTION");
  const [password, setPassword] = useState("");

  // 임시 저장: 쓰다가 나가거나 뒤로가기를 눌러도 다음에 들어오면 그대로(등록하면 지움)
  const draftKey = `poka-draft-${initialBoardType}`;
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      const d = raw ? (JSON.parse(raw) as { title?: string; content?: string; boardType?: BoardType }) : null;
      if (d && (d.title || d.content)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 임시 글은 브라우저에서만 읽을 수 있음
        setTitle(d.title ?? "");
        setContent(d.content ?? "");
        if (d.boardType && categories?.some((c) => c.boardType === d.boardType)) setBoardType(d.boardType);
        setDraftLoaded(true);
      }
    } catch {
      /* 저장소를 못 쓰면 건너뜀 */
    }
  }, [draftKey, categories]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = window.setTimeout(() => {
      try {
        if (title.trim() || content.trim()) {
          localStorage.setItem(draftKey, JSON.stringify({ title, content, boardType, at: Date.now() }));
          setDraftSaved(true);
        } else localStorage.removeItem(draftKey);
      } catch {
        /* 무시 */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [draftKey, title, content, boardType]);
  // 창을 닫거나 새로고침할 때: 쓰던 글이 있으면 한 번 묻기
  useEffect(() => {
    const dirty = Boolean(title.trim() || content.trim()) && !pending;
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [title, content, pending]);
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* 무시 */
    }
  }

  async function submit() {
    // 자유 · 질문 · 건의: 본문 10자 이상(공백 빼고)
    if (["FREE", "RULE_QA", "SUGGESTION"].includes(boardType) && content.replace(/\s+/g, "").length < 10) {
      setError(`본문을 10자 이상 써 주세요(지금 ${content.replace(/\s+/g, "").length}자).`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardType,
          title,
          content,
          bannerSlot: bannerSlot ? Number(bannerSlot) : null,
          bannerImageUrl,
          imageUrls: photoBoard ? photos : [],
          promoLocation,
          promoTag,
          isPrivate: boardType === "SUGGESTION" ? isPrivate : false,
          password: boardType === "SUGGESTION" ? password : undefined,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string; points?: number };
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "저장에 실패했습니다.");
      // 오늘 활동 포인트 한도에 닿아 포인트가 0이면 글 화면에서 한 번 알려 줌
      if (payload.points === 0) {
        try {
          window.sessionStorage.setItem("poka-cap-note", payload.id);
        } catch {
          /* 못 써도 글은 올라감 */
        }
      }
      clearDraft();
      router.replace(`/posts/${payload.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="ink-panel flex flex-col gap-4 rounded-2xl p-4 sm:p-5">
      {draftLoaded ? (
        <p data-draft-loaded className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          📝 쓰다 만 글을 불러왔어요.
          <button
            type="button"
            className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs font-bold"
            onClick={() => {
              clearDraft();
              setTitle("");
              setContent("");
              setDraftLoaded(false);
            }}
          >
            지우고 새로 쓰기
          </button>
        </p>
      ) : null}
      <p className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-foreground">
        {hint} · 작성 {postRewardLine(boardType)}
        {FIRST_POST_BOARDS.has(boardType) ? <span className="ml-1 font-bold text-[#ffcf4a]">· 커뮤니티 첫 글은 +{FIRST_POST_POINTS}P 보너스(한 번)</span> : null}
      </p>
      {categories && categories.length > 1 ? (
        <div className="grid gap-2">
          <p className="write-label">말머리</p>
          <div role="radiogroup" aria-label="말머리" className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <button
                key={category.boardType}
                type="button"
                role="radio"
                aria-checked={boardType === category.boardType}
                onClick={() => setBoardType(category.boardType)}
                className={cn(
                  "touch-target inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold",
                  boardType === category.boardType
                    ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]"
                    : "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60",
                )}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="title" className="write-label">제목</Label>
        <Input
          id="title"
          className="write-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            boardType === "HAND_REVIEW"
              ? "예: BTN vs BB AJs 3벳팟"
              : boardType === "RULE_QA"
                ? "예: 올인 후 사이드팟 분배가 맞나요?"
                : "제목을 입력하세요"
          }
        />
        <MoneyTitleHint title={title} />
        {boardType === "NOTICE" ? (
          // 공지 말머리: 누르면 제목 앞에 [업데이트] 같은 태그가 붙고, 맨 위 공지 띠에 색 태그로 보여요
          <div data-notice-tags className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-400">말머리</span>
            {["업데이트", "이벤트", "점검", "안내", "공지", ""].map((tag) => {
              const cur = title.match(/^\s*\[([^\]]{1,6})\]/)?.[1] ?? "";
              return (
                <button
                  key={tag || "none"}
                  type="button"
                  data-notice-tag={tag || "none"}
                  aria-pressed={cur === tag}
                  onClick={() => setTitle((t) => (tag ? `[${tag}] ` : "") + t.replace(/^\s*\[[^\]]{1,6}\]\s*/, ""))}
                  className={`min-h-9 rounded-full border px-3 text-xs font-black ${cur === tag ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]" : "border-white/20 text-zinc-200 hover:border-[#c9a25c]"}`}
                >
                  {tag || "없음"}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {boardType === "PROMO" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="매장/장소" value={promoLocation} onChange={setPromoLocation} placeholder="강남" />
          <Field label="이벤트 태그" value={promoTag} onChange={setPromoTag} placeholder="나이트 · 첫방문 칩" />
          <Field
            label="대표 이미지 URL"
            value={bannerImageUrl}
            onChange={setBannerImageUrl}
            placeholder="/banners/slot-1.svg"
          />
          <div className="grid gap-2">
            <Label htmlFor="slot">프리미엄 배너 구좌 (선택, 1~6)</Label>
            <Input
              id="slot"
              className="h-11"
              inputMode="numeric"
              value={bannerSlot}
              onChange={(e) => setBannerSlot(e.target.value)}
              placeholder="비우면 일반 홍보글"
            />
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="content" className="write-label">내용</Label>
          {QUESTION_TEMPLATES[boardType] ? (
            <button
              type="button"
              data-question-template
              onClick={() => {
                const tpl = QUESTION_TEMPLATES[boardType] ?? "";
                setContent((v) => (v.trim() ? `${v.trimEnd()}\n\n${tpl}` : tpl));
              }}
              className="min-h-10 rounded-lg border border-[#c9a25c]/60 px-3 text-xs font-black text-[#e7c98a]"
            >
              📝 질문 틀 넣기
            </button>
          ) : null}
        </div>
        {boardType === "NOTICE" ? (
          // 공지사항은 종이 문서(A4) 모양으로 보이므로 서식 버튼·미리보기가 있는 편집기를 씁니다.
          <DocEditor id="content" title={title} value={content} onChange={setContent} placeholder="내용을 입력하세요" />
        ) : (
          <Textarea
            id="content"
            className="write-body-input"
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        )}
        {/* 자유 · 질문 · 건의: 10자 이상(한두 글자 글 방지) */}
        {["FREE", "RULE_QA", "SUGGESTION"].includes(boardType) && content.replace(/\s+/g, "").length < 10 ? (
          <p data-write-min-hint className="text-xs text-[#e7c98a]">본문을 조금 더 자세히 써 주세요 · 10자 이상 ({content.replace(/\s+/g, "").length}/10)</p>
        ) : null}
      </div>
      {photoBoard ? <PostPhotoPicker value={photos} onChange={setPhotos} /> : null}
      {boardType === "SUGGESTION" ? (
        <fieldset className="rounded-xl border border-border bg-muted/40 p-3">
          <legend className="px-1 text-sm font-semibold">비밀글</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <span className="touch-check">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
              />
            </span>
            비밀글 설정
          </label>
          {isPrivate ? (
            <div className="mt-2 grid gap-2">
              <Label htmlFor="secret-password">비밀번호 (4자리 이상)</Label>
              <Input
                id="secret-password"
                type="password"
                minLength={4}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="본문 열람용 비밀번호"
              />
            </div>
          ) : null}
        </fieldset>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <StickySubmit>
        {draftSaved ? <span data-draft-saved className="text-center text-[11px] text-muted-foreground sm:hidden">✓ 쓰던 글은 자동으로 임시 저장돼요</span> : null}
        <Button type="button" size="touch" disabled={pending} onClick={submit}>
          {pending ? "등록 중…" : "등록"}
        </Button>
      </StickySubmit>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        className="h-11"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
