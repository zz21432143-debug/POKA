import { PlayingCard } from "@/components/hand/playing-card";
import {
  ACTION_LABEL,
  STREET_LABEL,
  STREETS,
  boardForStreet,
  type HandReviewData,
} from "@/lib/hand-review";

export function HandViewer({ hand }: { hand: HandReviewData }) {
  return (
    <section className="max-w-full overflow-x-clip rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-primary">그래픽 핸드 뷰어</p>
          <p className="text-sm text-muted-foreground">
            {hand.heroPosition} vs {hand.villainPosition}
            {hand.effectiveBb ? ` · ${hand.effectiveBb}bb` : ""}
          </p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-clip">
          <span className="text-xs text-muted-foreground">Hero</span>
          {hand.heroCards.map((code) => (
            <PlayingCard key={code} code={code} size="lg" />
          ))}
        </div>
      </div>

      {hand.villainCards.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Villain</span>
          {hand.villainCards.map((code) => (
            <PlayingCard key={code} code={code} />
          ))}
        </div>
      ) : null}

      <ol className="mt-5 space-y-4">
        {STREETS.map((street) => {
          const actions = hand.streets[street];
          const cards = boardForStreet(hand.board, street);
          if (street !== "preflop" && cards.length === 0 && actions.length === 0) return null;
          return (
            <li key={street} className="rounded-lg bg-muted/40 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-primary">{STREET_LABEL[street]}</span>
                {cards.map((code) => (
                  <PlayingCard key={`${street}-${code}`} code={code} size="sm" />
                ))}
              </div>
              {actions.length === 0 ? (
                <p className="text-xs text-muted-foreground">액션 없음</p>
              ) : (
                <div className="card-scroller flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto">
                  {actions.map((row, index) => (
                    <div key={`${street}-${index}`} className="flex items-center gap-2">
                      {index > 0 ? (
                        <span className="text-muted-foreground" aria-hidden>
                          →
                        </span>
                      ) : null}
                      <span className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-3 text-sm">
                        <span className="mr-1.5 text-xs text-muted-foreground">{row.actor}</span>
                        {ACTION_LABEL[row.action]}
                        {row.amount != null ? ` ${row.amount}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
