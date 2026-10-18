import Link from "@/components/ui/link";
import { SIDEBAR_NAV } from "@/lib/nav";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

/** 왼쪽 메뉴 큰 묶음의 모음 화면: 그 묶음의 메뉴를 카드로 */
export function SidebarHub({ title, intro, sticker }: { title: string; intro: string; sticker: keyof typeof BOARD_STICKER }) {
  const group = SIDEBAR_NAV.find((g) => g.title === title);
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER[sticker]}>{title}</BoardTitle>
        <p className="mt-2">{intro}</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group?.items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="ink-panel touch-target relative z-10 flex min-h-20 flex-col rounded-2xl p-4 hover:bg-[#241c1e]">
              <p className="flex items-center gap-2 font-bold text-white">
                {item.label}
                {item.badge ? <span className="nav-new-badge">{item.badge}</span> : null}
              </p>
              <p className="mt-1 text-sm text-[#9CA3AF]">{item.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
