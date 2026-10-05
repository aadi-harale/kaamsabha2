import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { activatePolicyProposal, castVote, createBooking, declineJobSafely, reviewPolicyImpact, signIn } from "../lib/commands.ts";
import { comparePolicyProposal, memberPolicyTwin } from "../lib/policy-twin.ts";
import { workerSpokenSummary } from "../lib/worker-guidance.ts";
import { workerPayExample } from "../lib/worker-copy.ts";

const booking = (state: ReturnType<typeof initialState>, service = "electrician", amount = 760) =>
  createBooking(signIn(state, "customer01", "customer"), { customerId: "customer01", service, locality: "Kharadi, Pune", scheduledAt: "2026-10-05T15:00:00.000Z", amount });

test("an empty register has no invented jobs, income or history-based simulation", () => {
  const state = initialState();
  const twin = memberPolicyTwin(state, state.proposals[0], state.workers[1]);
  assert.ok(state.earningsHistory.length > 0);
  assert.equal(twin.rows.length, 0); assert.equal(twin.myCurrent, 0); assert.equal(twin.myProposed, 0);
  assert.deepEqual(twin.before, { floor: 760, wait: 12 });
  assert.deepEqual(twin.after, { floor: 860, wait: 10 });
});

test("both rules use identical frozen jobs and respect quotes above the proposed floor", () => {
  const state = booking(booking(initialState()), "appliance", 1000);
  const original = structuredClone(state);
  const twin = memberPolicyTwin(state, state.proposals[0], state.workers.find(w => w.id === "W02")!);
  assert.equal(twin.mine.length, 2);
  assert.equal(twin.myCurrent, 1760); assert.equal(twin.myProposed, 1860);
  assert.equal(twin.changedJobs, 1);
  assert.ok(twin.mine.every(row => row.workerId === "W02"));
  assert.equal(twin.rows.find(row => row.service === "appliance")!.proposedPay, 1000);
  assert.deepEqual(comparePolicyProposal(state, state.proposals[0]), comparePolicyProposal(state, state.proposals[0]));
  assert.deepEqual(state, original, "the twin cannot alter jobs, receipts, votes, policy or earnings");
});

test("current availability and workload cannot replace frozen member facts", () => {
  const state = booking(initialState());
  const expected = comparePolicyProposal(state, state.proposals[0]);
  state.workers = state.workers.map(w => ({ ...w, available: false, active: false, workloadTodayMinutes: 9999, maxDailyMinutes: 240 }));
  assert.deepEqual(comparePolicyProposal(state, state.proposals[0]), expected);
});

test("a passed-over worker sees zero assigned jobs, not a promised pay increase", () => {
  const state = booking(initialState(), "plumbing");
  const farhan = memberPolicyTwin(state, state.proposals[0], state.workers.find(w => w.id === "W12")!);
  const leela = memberPolicyTwin(state, state.proposals[0], state.workers.find(w => w.id === "W13")!);
  assert.equal(farhan.mine.length, 0); assert.equal(farhan.myProposed, 0);
  assert.equal(farhan.cooperativeCurrent, 760); assert.equal(farhan.cooperativeProposed, 860);
  assert.equal(leela.myCurrent, 760); assert.equal(leela.myProposed, 860);
});

test("missing and inconsistent receipts are excluded rather than guessed", () => {
  const state = booking(initialState());
  state.receipts[0].candidateSnapshot = [];
  let twin = comparePolicyProposal(state, state.proposals[0]);
  assert.equal(twin.rows.length, 0); assert.equal(twin.excluded.length, 1);
  const mismatch = booking(initialState());
  mismatch.receipts[0].workerId = "W11";
  twin = comparePolicyProposal(mismatch, mismatch.proposals[0]);
  assert.equal(twin.rows.length, 0); assert.equal(twin.excluded.length, 1);
});

test("a safe decline compares only the latest dispatch and keeps the declined member excluded", () => {
  let state = booking(initialState());
  state = declineJobSafely(signIn(state, "W02", "worker"), state.jobs[0].id, "Safety concern");
  const twin = comparePolicyProposal(state, state.proposals[0]);
  assert.equal(state.receipts.length, 2);
  assert.equal(twin.rows.length, 1);
  assert.equal(twin.rows[0].receiptId, state.jobs[0].receiptId);
  assert.equal(twin.rows[0].workerId, state.jobs[0].workerId);
  assert.notEqual(twin.rows[0].workerId, "W02");
});

test("the preview matches real booking pay after a member-approved activation", () => {
  let state = booking(initialState(), "electrician", 700);
  const oldReceipt = structuredClone(state.receipts[0]);
  const preview = comparePolicyProposal(state, state.proposals[0]);
  const proposalId = state.proposals[0].id;
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), proposalId, "W02");
  state = castVote(state, proposalId, "W02", "yes");
  state = activatePolicyProposal(signIn(state, "admin01", "admin"), proposalId);
  state = booking(state, "electrician", 700);
  assert.equal(state.jobs[0].amount, preview.rows[0].proposedPay);
  assert.equal(state.receipts[0].protectedPayout, preview.rows[0].proposedPay);
  assert.equal(state.jobs[0].workerId, preview.rows[0].workerId);
  assert.deepEqual(state.receipts[1], oldReceipt);
  assert.equal(comparePolicyProposal(state, state.proposals[0]).before.floor, 760);
  const next = { ...state.proposals[0], status: "voting" as const, proposedMinimumPayout: 960 };
  assert.equal(comparePolicyProposal(state, next).before.floor, 860, "an open vote uses the actual current floor");
});

test("Listen includes personal counterfactual amounts in all three languages", () => {
  const state = booking(initialState());
  const worker = state.workers.find(w => w.id === "W02")!;
  for (const locale of ["en", "hi", "mr"] as const) {
    const text = workerSpokenSummary({ ...state, locale }, worker, "governance", undefined, undefined, state.proposals[0].id);
    assert.match(text, /760/); assert.match(text, /860/);
    assert.ok(!/[{}]/.test(text));
    if (locale !== "en") assert.match(text, /[ऀ-ॿ]/);
  }
});

test("a simpler personal explanation keeps a high quote unchanged and does not promise work with no saved example", () => {
  const state = booking(initialState(), "appliance", 1000);
  const worker = state.workers.find(w => w.id === "W02")!;
  const twin = memberPolicyTwin(state, state.proposals[0], worker);
  const before = JSON.stringify(state);
  for (const locale of ["en", "hi", "mr"] as const) {
    const text = workerPayExample(locale, twin.mine[0], 860);
    assert.match(text, /1,000/);
    assert.ok(!text.includes("860"), "an above-floor job cannot be explained as falling to the new minimum");
    assert.ok(!/[{}]/.test(text));
    assert.match(workerPayExample(locale, undefined, 860), /860/);
    if (locale === "en") {
      assert.match(text, /stay the same/);
      assert.match(workerPayExample(locale, undefined, 860), /does not guarantee a job/);
    }
  }
  assert.equal(JSON.stringify(state), before);
});
