import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

/** 본문 안의 http(s) 주소만 링크로 바꿉니다. 나머지 글자는 그대로(줄바꿈 유지는 .article-copy가 담당). */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="break-all text-[#e7c98a] underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
