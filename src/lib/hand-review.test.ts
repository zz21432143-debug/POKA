import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_HAND,
  SAMPLE_TABLE_HAND,
  actorLabel,
  formatActionLine,
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

  it("starts as heads-up BB vs BTN with Korean action lines", () => {
    const sitting = EMPTY_HAND.seats.filter((seat) => seat.sitting).map((seat) => seat.id);
    assert.deepEqual(sitting, ["BTN", "BB"]);
    assert.equal(actorLabel("BB", EMPTY_HAND), "나 (BB)");
    assert.equal(actorLabel("BTN", EMPTY_HAND), "상대 (BTN)");
    assert.equal(
      formatActionLine({ actor: "BTN", action: "raise", amount: 3 }, EMPTY_HAND),
      "상대 (BTN) 레이즈 3 BB",
    );
    assert.deepEqual(
      EMPTY_HAND.blinds.map((row) => row.actor),
      ["BTN", "BB"],
    );
  });
});
