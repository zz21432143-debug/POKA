export function AdPlacementMap() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm">
      <figcaption className="mb-3 text-sm font-semibold">화면에서 구좌가 붙는 위치</figcaption>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        아래는 지금 사이트 레이아웃을 축소한 그림입니다. A·B·C가 실제 광고가 들어가는 자리입니다.
      </p>
      <div className="rounded-xl bg-[#f4f7f8] p-3">
        <div className="mb-2 rounded-md bg-white px-3 py-2 text-center text-[11px] font-medium text-muted-foreground">
          상단 헤더 · 로고 · 메뉴 · 검색
        </div>
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-2 hidden rounded-md bg-white p-2 text-[10px] text-muted-foreground sm:block">
            왼쪽
            <br />
            메뉴
          </div>
          <div className="col-span-12 space-y-2 sm:col-span-7">
            <div className="rounded-md ring-2 ring-primary">
              <p className="px-2 pt-2 text-[10px] font-semibold text-primary">B · 홈 홍보 포스터</p>
              <div className="grid grid-cols-3 gap-1 p-2">
                {["1칸", "2칸", "3칸"].map((label) => (
                  <div
                    key={label}
                    className="flex aspect-[5/7] items-center justify-center rounded bg-emerald-100 text-[10px] font-semibold text-emerald-800"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <p className="px-2 pb-2 text-[10px] text-muted-foreground">홈 맨 위 · 3초마다 한 칸 이동</p>
            </div>
            <div className="rounded-md bg-white px-2 py-2 text-[10px] text-muted-foreground">최신글 1</div>
            <div className="rounded-md bg-white px-2 py-2 text-[10px] text-muted-foreground">최신글 2</div>
            <div className="rounded-md bg-white px-2 py-2 text-[10px] text-muted-foreground">최신글 3</div>
            <div className="rounded-md bg-amber-100 px-2 py-2 text-[10px] font-semibold text-amber-900 ring-2 ring-amber-400">
              C · 네이티브 인피드 (3번째와 4번째 사이)
            </div>
            <div className="rounded-md bg-white px-2 py-2 text-[10px] text-muted-foreground">최신글 4</div>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-sky-50 p-1 ring-2 ring-sky-400">
              {["A1", "A2", "A3"].map((label) => (
                <div key={label} className="rounded bg-sky-100 py-3 text-center text-[10px] font-semibold text-sky-900">
                  {label}
                  <span className="mt-0.5 block font-normal">300×150</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-12 space-y-2 sm:col-span-3">
            <div className="rounded-md bg-white px-2 py-3 text-center text-[10px] text-muted-foreground">프로필</div>
            <div className="rounded-md bg-white px-2 py-3 text-center text-[10px] text-muted-foreground">공지 · 인기글</div>
          </div>
        </div>
        <p className="mt-2 rounded-md bg-sky-50 px-2 py-2 text-[10px] text-sky-900">
          A1–A3는 글 목록 아래 가로 한 줄입니다. 비율은 300×150(2:1)입니다.
        </p>
      </div>
    </figure>
  );
}
