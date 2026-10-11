import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * 종이 문서 보기. 어두운 책상(DocDesk) 위에 A4 비율의 흰 종이(DocSheet)를 올려 보여 줍니다.
 * 본문 html은 반드시 서버에서 contentToDocHtml(=sanitize)로 거른 값만 넣습니다.
 */
export function DocDesk({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("doc-desk", className)}>{children}</div>;
}

export function DocSheet({
  title,
  html,
  meta,
  pageLabel,
  actions,
  children,
  id,
}: {
  /** 종이 맨 위 가운데 제목. html 안에 제목을 넣었으면 비워 둡니다. */
  title?: string;
  /** 거른(sanitized) 본문 HTML */
  html?: string;
  /** 제목 아래 작은 정보(날짜 등) */
  meta?: ReactNode;
  /** 종이 맨 아래 쪽 번호(예: "- 3 -") */
  pageLabel?: string;
  /** 종이 오른쪽 위 버튼(수정 등) */
  actions?: ReactNode;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <article id={id} className="doc-sheet">
      {actions ? <div className="doc-actions">{actions}</div> : null}
      {title ? <h2 className="doc-title">{title}</h2> : null}
      {meta ? <div className="doc-meta">{meta}</div> : null}
      {html !== undefined ? (
        <div className="doc-body" data-doc-body dangerouslySetInnerHTML={{ __html: html }} />
      ) : null}
      {children ? <div className="doc-body">{children}</div> : null}
      {pageLabel ? <p className="doc-pageno">{pageLabel}</p> : null}
    </article>
  );
}
