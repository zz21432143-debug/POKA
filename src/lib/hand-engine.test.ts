import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { legalActions, replayHand, sizePresets } from "./hand-engine";
import { CONTENT_PLAN } from "./content-plan";
import { normalizeHand, SAMPLE_TABLE_HAND, type HandReviewData } from "./hand-review";

const plan = (id: string) => normalizeHand(CONTENT_PLAN.find((p) => p.id === id)?.hand as HandReviewData);

describe("hand betting engine", () => {
  it("replays the AJs 3-bet pot: pots per street and BTN to act on the river", () => {
    const state = replayHand(plan("tue-2"));
    assert.equal(state.potAtStart.preflop, 1.5);
    assert.equal(state.potAtStart.flop, 22.5);
    assert.equal(state.potAtStart.turn, 36.5);
    assert.equal(state.potAtStart.river, 36.5);
    assert.equal(state.pot, 118.5);
    assert.equal(state.street, "river");
    assert.equal(state.toAct, "BTN");
    assert.deepEqual(
      legalActions(state, "BTN").map((a) => a.label),
      ["폴드", "올인 콜 82"],
    );
  });

  it("replays the set hand: flop shove, CO to act", () => {
    const state = replayHand(plan("wed-2"));
    assert.equal(state.potAtStart.flop, 5.5);
    assert.equal(state.toAct, "CO");
    assert.equal(state.currentBet, 97.5);
  });

  it("gives the button the decision after folds on the bubble", () => {
    const state = replayHand(plan("thu-2"));
    assert.equal(state.toAct, "BTN");
    assert.deepEqual(legalActions(state, "BTN").map((a) => a.action), ["fold", "call"]);
    assert.deepEqual(sizePresets(state, "BTN").map((p) => p.total), [2.5, 3]);
  });

  it("handles the sample hand and closes rounds", () => {
    const state = replayHand(SAMPLE_TABLE_HAND);
    assert.equal(state.potAtStart.flop, 4.4);
    assert.equal(state.potAtStart.turn, 22.4);
  });

  it("starts a fresh heads-up hand with the button to act and moves on after a call", () => {
    const empty = normalizeHand({ heroPosition: "BTN", villainPosition: "BB" });
    const s0 = replayHand(empty);
    assert.equal(s0.toAct, "BTN");
    const afterLimp = replayHand({
      ...empty,
      streets: { ...empty.streets, preflop: [{ actor: "BTN", action: "raise", amount: 2.5 }, { actor: "BB", action: "call", amount: 1.5 }] },
    });
    assert.equal(afterLimp.roundClosed, true);
    assert.equal(afterLimp.pot, 5);
    const flop = replayHand({
      ...empty,
      streets: {
        ...empty.streets,
        preflop: [{ actor: "BTN", action: "raise", amount: 2.5 }, { actor: "BB", action: "call", amount: 1.5 }],
        flop: [{ actor: "BB", action: "check" }],
      },
    });
    assert.equal(flop.toAct, "BTN");
    assert.deepEqual(sizePresets(flop, "BTN").map((p) => p.label), ["33%", "50%", "75%", "팟"]);
  });
});

describe("next turn for the editor", () => {
  it("moves to the flop after preflop closes and asks for board cards", async () => {
    const { nextTurn } = await import("./hand-engine");
    const empty = normalizeHand({ heroPosition: "BTN", villainPosition: "BB" });
    const hand = {
      ...empty,
      streets: { ...empty.streets, preflop: [{ actor: "BTN", action: "raise" as const, amount: 2.5 }, { actor: "BB", action: "call" as const, amount: 1.5 }] },
    };
    const turn = nextTurn(hand);
    assert.equal(turn.street, "flop");
    assert.equal(turn.toAct, "BB");
    assert.equal(turn.needBoard, 3);
    const folded = nextTurn({ ...hand, streets: { ...hand.streets, preflop: [{ actor: "BTN", action: "raise", amount: 2.5 }, { actor: "BB", action: "fold" }] } });
    assert.equal(folded.done, "fold");
  });
});
