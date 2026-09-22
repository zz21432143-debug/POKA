import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SAMPLE_TABLE_HAND,
  normalizeHand,
  resolveActorSeat,
  seatsAroundHero,
  tableSlotStyle,
  validateHandReview,
} from "./hand-review";

describe("hand review table", () => {
  it("maps legacy Hero/Villain actors onto seats", () => {
    const hand = normalizeHand({
      heroPosition: "BTN",
      villainPosition: "BB",
      heroCards: ["Ah", "Kd"],
      villainCards: ["Qs", "Qh"],
      board: ["2c", "7d", "9s"],
      streets: {
        preflop: [{ actor: "Villain", action: "raise", amount: 2.5 }],
        flop: [],
        turn: [],
        river: [],
      },
    });
    assert.equal(resolveActorSeat("Hero", hand), "BTN");
    assert.equal(resolveActorSeat("Villain", hand), "BB");
    assert.equal(hand.seats.find((seat) => seat.id === "BB")?.showCards, true);
    assert.deepEqual(seatsAroundHero(hand)[0]?.id, "BTN");
  });

  it("accepts the sample table hand with a revealed villain", () => {
    assert.equal(validateHandReview(SAMPLE_TABLE_HAND), null);
    const utg = SAMPLE_TABLE_HAND.seats.find((seat) => seat.id === "UTG");
    assert.equal(utg?.showCards, true);
    assert.equal(utg?.cards.length, 2);
    assert.equal(SAMPLE_TABLE_HAND.winnerSeat, "UTG");
  });

  it("puts hero at the bottom slot", () => {
    const style = tableSlotStyle(0, 5);
    assert.equal(style.top, "86%");
    assert.equal(style.left, "50%");
  });
});
