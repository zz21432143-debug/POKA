/** 글 사진(본문 아래). 원본 비율 그대로, 누르면 새 창에서 크게 봅니다. */
export function PostPhotos({ urls, title }: { urls: string[]; title: string }) {
  if (urls.length === 0) return null;
  return (
    <ul className="grid gap-3" aria-label="첨부 사진">
      {urls.map((url, index) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} 사진 ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              className="mx-auto block h-auto max-h-[80dvh] w-auto max-w-full rounded-xl border border-white/10 bg-black object-contain"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
