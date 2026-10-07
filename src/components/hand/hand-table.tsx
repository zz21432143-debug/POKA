import { PlayingCard } from "@/components/hand/playing-card";
import {
  formatBb,
  seatsAroundHero,
  tableSlotStyle,
  type HandReviewData,
  type SeatState,
} from "@/lib/hand-review";

function SeatBubble({
  seat,
  reveal,
  winner,
}: {
  seat: SeatState;
  reveal: boolean;
  winner: boolean;
}) {
  const show =
    (seat.isHero && seat.cards.length === 2) ||
    (reveal && seat.showCards && seat.cards.length === 2 && !seat.isHero);
  return (
    <div className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
      {show ? (
        <div className="flex gap-0.5">
          {seat.cards.map((code) => (
            <PlayingCard key={code} code={code} size="sm" variant="felt" />
          ))}
        </div>
      ) : null}
      <div
        className={
          winner
            ? "relative flex min-w-[4.6rem] flex-col items-center rounded-2xl bg-gradient-to-b from-amber-200 to-amber-700 px-2 py-1.5 text-center shadow-[0_0_18px_rgba(251,191,36,0.65)]"
            : "flex min-w-[4.6rem] flex-col items-center rounded-2xl bg-[#2a2418] px-2 py-1.5 text-center ring-1 ring-white/10"
        }
      >
        {winner ? (
          <span className="text-[10px] font-black tracking-widest text-white drop-shadow">WIN</span>
        ) : null}
        <span className="text-[11px] font-bold text-white">{seat.isHero ? "나" : seat.id}</span>
        {seat.isHero ? <span className="text-[10px] text-white/80">{seat.id}</span> : null}
        <span className="text-[10px] font-semibold text-sky-200">{formatBb(seat.stackBb)}</span>
      </div>
    </div>
  );
}

export function HandTable({
  hand,
  revealOpponents,
}: {
  hand: HandReviewData;
  revealOpponents: boolean;
}) {
  const around = seatsAroundHero(hand);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#141414] p-3 sm:p-4">
      <div className="relative mx-auto aspect-[16/11] w-full max-w-lg">
        <div className="absolute inset-[8%] rounded-[50%] bg-[#0b3d18] shadow-[inset_0_0_0_10px_#08210e,inset_0_0_40px_#04150a]" />
        <div className="absolute inset-[14%] rounded-[50%] bg-[#0f6a2c]" />
        <div className="absolute inset-[18%] rounded-[50%] border border-yellow-500/25" />

        <div className="absolute top-1/2 left-1/2 flex w-[70%] -translate-x-1/2 -translate-y-[58%] flex-col items-center gap-2">
          <div className="flex items-center gap-1">
            {hand.board.map((code) => (
              <PlayingCard key={code} code={code} size="lg" variant="felt" />
            ))}
            {hand.board.length === 0 ? (
              <p className="text-xs text-white/50">보드 없음</p>
            ) : null}
          </div>
          {hand.potBb ? (
            <div className="flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1">
              <span className="size-4 rounded-full bg-gradient-to-br from-red-400 to-red-700 ring-1 ring-white/40" />
              <span className="text-[11px] font-semibold text-amber-200">{formatBb(hand.potBb)}</span>
            </div>
          ) : null}
        </div>

        {around.map((seat, index) => (
          <div
            key={seat.id}
            className="absolute z-10"
            style={tableSlotStyle(index, around.length)}
          >
            <SeatBubble
              seat={seat}
              reveal={revealOpponents}
              winner={hand.winnerSeat === seat.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
