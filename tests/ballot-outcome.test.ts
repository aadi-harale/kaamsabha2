import assert from "node:assert/strict";
import test from "node:test";
import { initialState, type AppState } from "../lib/domain.ts";
import { activatePolicyProposal, castVote, createBooking, reviewPolicyImpact, signIn } from "../lib/commands.ts";
import { memberBallotOutcome, memberBallotResultText } from "../lib/ballot-outcome.ts";
import { workerSpokenSummary } from "../lib/worker-guidance.ts";

test("a saved no vote records dissent but cannot individually veto an approved ballot or activate it", () => {
  let state = initialState();
  const original = structuredClone(state);
  let result = memberBallotOutcome(state, state.proposals[0], "W02");
  assert.equal(result.stage, "waiting");
  assert.equal(result.participants, 8); assert.equal(result.yes, 8);
  assert.equal(result.participantsNeeded, 1); assert.equal(result.supportNeeded, 0);
  assert.deepEqual(state, original, "viewing results cannot mutate the register");
  const proposalId = state.proposals[0].id;
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), proposalId, "W02");
  state = castVote(state, proposalId, "W02", "no", "Keep the old minimum for discussion");
  result = memberBallotOutcome(state, state.proposals[0], "W02");
  assert.equal(result.stage, "ready");
  assert.equal(result.participants, 9); assert.equal(result.yes, 8); assert.equal(result.no, 1);
  assert.equal(result.mine?.choice, "no"); assert.equal(result.mine?.reason, "Keep the old minimum for discussion");
  assert.equal(state.policy.minimumPayout, 760); assert.equal(result.newJob, undefined);
  assert.match(memberBallotResultText(state, state.proposals[0], "W02"), /has not started yet/);
  assert.deepEqual(state.earningsHistory, original.earningsHistory);
  const leela = memberBallotOutcome(state, state.proposals[0], "W13");
  assert.equal(leela.mine, undefined); assert.equal(leela.no, 1, "members see the same collective result, not another member's private reason");
});

test("participation without enough support remains pending and the actual activation command refuses it", () => {
  let state: AppState = { ...initialState(), votes: [], policyReviews: [] };
  const proposalId = state.proposals[0].id;
  for (const [index, worker] of state.workers.slice(0, 9).entries()) {
    state = reviewPolicyImpact(signIn(state, worker.id, "worker"), proposalId, worker.id);
    state = castVote(state, proposalId, worker.id, index < 6 ? "yes" : "no", "Discuss first");
  }
  const result = memberBallotOutcome(state, state.proposals[0], "W02");
  assert.equal(result.stage, "waiting"); assert.equal(result.participantsNeeded, 0);
  assert.equal(result.supportNeeded, 1); assert.equal(result.yes, 6); assert.equal(result.no, 3);
  assert.throws(() => activatePolicyProposal(signIn(state, "admin01", "admin"), proposalId), /7 support votes/);
});

test("the outcome shows activation only after the command and proves it with the member's own new receipt", () => {
  let state = createBooking(signIn(initialState(), "customer01", "customer"), { customerId: "customer01", service: "electrician", locality: "Kharadi, Pune", scheduledAt: "2026-10-05T15:00:00.000Z" });
  const old = structuredClone(state.receipts[0]);
  const proposalId = state.proposals[0].id;
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), proposalId, "W02");
  state = castVote(state, proposalId, "W02", "yes");
  assert.equal(memberBallotOutcome(state, state.proposals[0], "W02").stage, "ready");
  state = activatePolicyProposal(signIn(state, "admin01", "admin"), proposalId);
  let result = memberBallotOutcome(state, state.proposals[0], "W02");
  assert.equal(result.stage, "active"); assert.equal(result.newJob, undefined, "an old job is not evidence of this vote");
  state = createBooking(signIn(state, "customer01", "customer"), { customerId: "customer01", service: "electrician", locality: "Kharadi, Pune", scheduledAt: "2026-10-05T16:00:00.000Z" });
  result = memberBallotOutcome(state, state.proposals[0], "W02");
  assert.equal(result.newJob?.id, state.jobs[0].id); assert.equal(result.newJob?.amount, 860);
  assert.equal(memberBallotOutcome(state, state.proposals[0], "W13").newJob, undefined);
  assert.deepEqual(state.receipts[1], old);
  const restored = JSON.parse(JSON.stringify(state));
  assert.deepEqual(memberBallotOutcome(restored, restored.proposals[0], "W02"), JSON.parse(JSON.stringify(result)));
  restored.receipts[0].workerId = "W13";
  assert.equal(memberBallotOutcome(restored, restored.proposals[0], "W02").newJob, undefined, "a mismatched receipt is not proof");
});

test("invalid, closed and historical proposals never pretend to be the current approved rule", () => {
  const state = initialState(); const proposal = state.proposals[0];
  assert.equal(memberBallotOutcome(state, { ...proposal, proposedMinimumPayout: 700 }, "W02").stage, "blocked");
  assert.equal(memberBallotOutcome(state, { ...proposal, status: "rejected" }, "W02").stage, "rejected");
  assert.equal(memberBallotOutcome(state, { ...proposal, status: "simulated" }, "W02").stage, "simulated");
  assert.equal(memberBallotOutcome(state, { ...proposal, status: "active", activatedAt: "previous-activation" }, "W02").stage, "superseded");
});

test("workers can read and hear their saved choice, real vote counts and pending activation in each language", () => {
  let state = initialState(); const proposalId = state.proposals[0].id;
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), proposalId, "W02");
  state = castVote(state, proposalId, "W02", "no", "Please discuss the change");
  const worker = state.workers.find(w => w.id === "W02")!;
  for (const locale of ["en", "hi", "mr"] as const) {
    const localized = { ...state, locale };
    const resultText = memberBallotResultText(localized, localized.proposals[0], "W02");
    const spoken = workerSpokenSummary(localized, worker, "governance", undefined, undefined, proposalId);
    assert.ok(spoken.includes(resultText));
    assert.match(spoken, /9/); assert.match(spoken, /8/); assert.match(spoken, /1/);
    assert.match(spoken, /760/); assert.match(spoken, /860/);
    assert.ok(!/[{}]/.test(spoken + resultText));
    assert.ok(!spoken.includes("Please discuss the change"), "the voice summary does not read free-text reasons");
    if (locale !== "en") assert.match(resultText, /[ऀ-ॿ]/);
  }
});
