import assert from "node:assert/strict";
import test from "node:test";
import type { Challenge } from "../lib/domain.ts";
import { runScenario } from "../lib/demo-scenarios.ts";
import { activatePolicyProposal, castVote, createBooking, reviewPolicyImpact, signIn } from "../lib/commands.ts";
import { activeMemberChange, chooseWorkerVoice, workerChallengeProgress, workerNextAction, workerSpokenSummary } from "../lib/worker-guidance.ts";

test("capturing a receipt does not complete a replay and human review still awaits an answer", () => {
  const opened: Challenge = { id: "case", jobId: "job", workerId: "W02", reason: "Check the rule", status: "open", createdAt: "2026-10-05", replaySummary: "Frozen receipt captured" };
  assert.deepEqual(workerChallengeProgress(opened), { checked: false, answered: false });
  const replayed: Challenge = { ...opened, status: "replayed", replayedAt: "2026-10-05" };
  assert.deepEqual(workerChallengeProgress(replayed), { checked: true, answered: false });
  assert.deepEqual(workerChallengeProgress({ ...replayed, status: "human-review", resolvedAt: "2026-10-05" }), { checked: true, answered: false });
  assert.deepEqual(workerChallengeProgress({ ...replayed, status: "confirmed", resolvedAt: "2026-10-05" }), { checked: true, answered: true });
});

test("the next action respects expired codes, pending scope and unpaid completion", () => {
  const state = runScenario("ready-for-otp")!;
  const job = state.jobs[0];
  assert.equal(workerNextAction(job, 100), "wait");
  const startOtp = { purpose: "start" as const, token: "test", expiresAt: 200, attemptsLeft: 5 };
  assert.equal(workerNextAction({ ...job, startOtp }, 100), "start-code");
  assert.equal(workerNextAction({ ...job, startOtp }, 200), "wait");
  assert.equal(workerNextAction({ ...job, startOtp: { ...startOtp, attemptsLeft: 0 } }, 100), "wait");
  assert.equal(workerNextAction({ ...job, startOtp, changeOrders: [{ id: "pending", description: "Extra switch", amountDelta: 100, requestedBy: "W02" }] }, 100), "wait");
  assert.equal(workerNextAction({ ...job, status: "started" }, 100), "proof");
  assert.equal(workerNextAction({ ...job, status: "completed" }, 100), "wait");
});

test("spoken summaries reconcile each worker's ledger and keep codes and other members' notes private", () => {
  const state = runScenario("ravi-earnings")!;
  const ravi = state.workers.find(w => w.id === "W02")!;
  const job = state.jobs[0];
  job.startOtp = { purpose: "start", token: "SECRET_TOKEN", demoCode: "998877", expiresAt: Date.now() + 60000, attemptsLeft: 5 };
  for (const locale of ["en", "hi", "mr"] as const) {
    const home = workerSpokenSummary({ ...state, locale }, ravi, "home", job);
    const money = workerSpokenSummary({ ...state, locale }, ravi, "earnings");
    assert.match(home, /8,110/);
    assert.match(home, /760/);
    assert.match(money, /190/);
    assert.ok(!/[{}]/.test(home + money));
    assert.ok(!home.includes("998877") && !home.includes("SECRET_TOKEN"));
    if (locale !== "en") assert.match(home, /[ऀ-ॿ]/);
  }
  const meena = state.workers.find(w => w.id === "W01")!;
  assert.match(workerSpokenSummary(state, meena, "home"), /7,030/);
  state.challenges = [{ id: "other", jobId: job.id, workerId: "W01", reason: "Private reason", status: "closed", adminNote: "OTHER_MEMBER_PRIVATE_NOTE", createdAt: "2026-10-05" }];
  assert.ok(!workerSpokenSummary(state, ravi, "fair").includes("OTHER_MEMBER_PRIVATE_NOTE"));
});

test("a vote effect appears only after activation and links a later job's frozen policy", () => {
  let state = runScenario("ravi-earnings")!;
  const oldReceipts = structuredClone(state.receipts);
  const proposal = state.proposals[0];
  assert.equal(activeMemberChange(state, "W02"), null);
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), proposal.id, "W02");
  state = castVote(state, proposal.id, "W02", "yes");
  assert.equal(activeMemberChange(state, "W02"), null, "approval is not activation");
  state = activatePolicyProposal(signIn(state, "admin01", "admin"), proposal.id);
  let change = activeMemberChange(state, "W02")!;
  assert.equal(change.participants, 9); assert.equal(change.support, 9);
  assert.equal(change.mine?.choice, "yes");
  assert.equal(change.newJob, undefined, "an old job cannot become proof of a new rule");
  assert.equal(change.proposal.simulation.currentFloor, 760);
  assert.equal(state.policy.minimumPayout, 860);
  state = createBooking(signIn(state, "customer01", "customer"), { customerId: "customer01", service: "electrician", locality: "Kharadi, Pune", scheduledAt: "2026-10-05T15:00:00.000Z" });
  change = activeMemberChange(state, "W02")!;
  assert.equal(change.newJob?.id, state.jobs[0].id);
  assert.equal(state.receipts[0].policyVersion, "constitution-v3");
  assert.equal(state.receipts[0].protectionFloor, 860);
  assert.deepEqual(state.receipts.slice(1), oldReceipts);
  assert.equal(activeMemberChange({ ...state, policy: { ...state.policy, activeFrom: "different-activation" } }, "W02"), null, "historical activation cannot be shown as the current one");
});

test("voice selection matches the chosen language and never substitutes English for Marathi", () => {
  const english = { lang: "en-US", localService: true };
  const hindiRemote = { lang: "hi-IN", localService: false };
  const hindiLocal = { lang: "hi_IN", localService: true };
  assert.equal(chooseWorkerVoice([english, hindiRemote, hindiLocal], "hi"), hindiLocal);
  assert.equal(chooseWorkerVoice([english, hindiRemote], "hi"), hindiRemote);
  assert.equal(chooseWorkerVoice([english, hindiRemote], "mr"), undefined);
  assert.equal(chooseWorkerVoice([], "en"), undefined);
});
