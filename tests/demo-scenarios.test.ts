import assert from "node:assert/strict";
import test from "node:test";
import { initialState } from "../lib/domain.ts";
import { resetRegister, runScenario, SCENARIOS } from "../lib/demo-scenarios.ts";
import { explainAllocation, frozenFairOrder } from "../lib/allocation-explain.ts";
import { jobFlow } from "../lib/job-flow.ts";

test("every scenario leaves a register a person could have produced by clicking", () => {
  for (const scenario of SCENARIOS) {
    const state = scenario.run();
    assert.equal(state.schema, 1, `${scenario.id}: still a valid register`);
    assert.equal(state.session, null, `${scenario.id}: must not leave someone signed in`);
    assert.ok(state.revision > 0, `${scenario.id}: the register moved`);
    // The giveaway for fabricated state would be a job with no decision behind it.
    state.jobs
      .filter((job) => job.workerId)
      .forEach((job) => {
        const receipt = state.receipts.find((item) => item.id === job.receiptId);
        assert.ok(receipt, `${scenario.id}: job ${job.id} has no decision receipt`);
        assert.ok(
          receipt.candidateSnapshot?.length,
          `${scenario.id}: receipt ${receipt.id} has no frozen candidate set, so it was not produced by dispatch`,
        );
        assert.ok(receipt.protectedPayout >= state.policy.minimumPayout, `${scenario.id}: payout below floor`);
      });
  }
});

test("running a scenario twice gives the same register", () => {
  for (const scenario of SCENARIOS) {
    const a = scenario.run();
    const b = scenario.run();
    assert.deepEqual(
      a.jobs.map((j) => [j.service, j.status, j.workerId]),
      b.jobs.map((j) => [j.service, j.status, j.workerId]),
      `${scenario.id} is not idempotent`,
    );
  }
});

test("one scenario does not leave the previous one's jobs behind", () => {
  const first = runScenario("why-not-me");
  const second = runScenario("federation");
  assert.ok(first && second);
  assert.equal(second.jobs.length, 1, "each scenario starts from a clean seed");
  assert.equal(second.jobs[0].service, "carpentry");
});

test("the 'why not me' scenario actually produces a passed-over member", () => {
  const state = runScenario("why-not-me");
  assert.ok(state);
  const farhan = state.workers.find((w) => w.id === "W12");
  assert.ok(farhan);
  const explained = explainAllocation(state, state.receipts[0], farhan);
  assert.equal(explained.outcome, "passed-over");
  assert.match(explained.detail, /150 min less/);
  assert.ok(frozenFairOrder(state.receipts[0]).length >= 2, "a real comparison was frozen");
});

test("the 'protection held' scenario blames the limit, not a ranking", () => {
  const state = runScenario("protection-held");
  assert.ok(state);
  const sunita = state.workers.find((w) => w.id === "W11");
  assert.ok(sunita);
  const explained = explainAllocation(state, state.receipts[0], sunita);
  assert.equal(explained.outcome, "blocked-by-protection");
  assert.match(explained.blockedBy.join(" "), /420 min of your 420 min limit/);
});

test("the OTP scenario stops exactly where the customer must act", () => {
  const state = runScenario("ready-for-otp");
  assert.ok(state);
  const job = state.jobs[0];
  assert.equal(job.status, "arrived");
  assert.equal(job.startOtp, undefined, "the code is the customer's to issue");
  const flow = jobFlow(job, "customer");
  assert.equal(flow.waitingOn, "customer");
  assert.match(flow.nextStep, /issue the start code/i);
});

test("the mid-job scenario stops where the customer reviews proof", () => {
  const state = runScenario("mid-job");
  assert.ok(state);
  const job = state.jobs[0];
  assert.equal(job.status, "started");
  assert.equal(job.evidence.length, 1);
  assert.ok(job.startOtp?.usedAt, "the start code was actually spent, not skipped");
  const flow = jobFlow(job, "customer");
  assert.equal(flow.waitingOn, "customer");
  assert.match(flow.nextStep, /finish code/i);
});

test("the federation scenario really leaves the home cooperative", () => {
  const state = runScenario("federation");
  assert.ok(state);
  const job = state.jobs[0];
  assert.equal(job.homeCooperativeId, "coop-kharadi");
  assert.notEqual(job.cooperativeId, "coop-kharadi");
  assert.ok(job.federationOpportunityId, "a federation record exists");
  assert.ok(state.receipts[0].homeCandidateSnapshot, "the home candidate set is frozen too");
});

test("the safe-decline scenario records zero penalty and re-dispatches", () => {
  const state = runScenario("safe-decline");
  assert.ok(state);
  assert.equal(state.safeDeclines.length, 1);
  assert.equal(state.safeDeclines[0].penalty, 0);
  assert.notEqual(state.jobs[0].workerId, "W02", "dispatch ran again without the decliner");
  const ravi = state.workers.find((w) => w.id === "W02");
  assert.ok(ravi);
  const firstReceipt = state.receipts.find((r) => r.workerId === "W02");
  assert.ok(firstReceipt);
  assert.equal(explainAllocation(state, firstReceipt, ravi).outcome, "safely-declined");
});

test("reset returns the untouched seed", () => {
  const reset = resetRegister();
  assert.deepEqual(reset.jobs, []);
  assert.deepEqual(reset.receipts, []);
  assert.deepEqual(reset.settlements, []);
  assert.equal(reset.workers.length, initialState().workers.length);
});

test("every scenario tells the reader where to go next", () => {
  const ids = new Set<string>();
  for (const scenario of SCENARIOS) {
    assert.ok(!ids.has(scenario.id), `duplicate id ${scenario.id}`);
    ids.add(scenario.id);
    assert.ok(scenario.name.length > 5, `${scenario.id} needs a name`);
    assert.ok(scenario.sets.length > 30, `${scenario.id} must say what it sets up`);
    assert.ok(scenario.then.length > 30, `${scenario.id} must say what to look at`);
    assert.ok(scenario.signInAs.length > 2, `${scenario.id} must name an account`);
  }
  assert.equal(runScenario("no-such-scenario"), null);
});
