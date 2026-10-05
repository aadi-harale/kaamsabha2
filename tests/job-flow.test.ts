import assert from "node:assert/strict";
import test from "node:test";
import type { Job, JobStatus, OtpChallenge } from "../lib/domain.ts";
import { jobFlow, otpIsLive, otpIsStale, waitingOnLabel } from "../lib/job-flow.ts";

const NOW = 1_800_000_000_000;

function job(status: JobStatus, extra: Partial<Job> = {}): Job {
  return {
    id: "KMS-00001", customerId: "customer01", service: "electrician", locality: "Kharadi, Pune",
    scheduledAt: new Date(NOW).toISOString(), emergency: false, status, amount: 760,
    evidence: [], changeOrders: [], ...extra
  };
}
function liveOtp(purpose: OtpChallenge["purpose"]): OtpChallenge {
  return { purpose, token: "t.p", expiresAt: NOW + 60_000, attemptsLeft: 5 };
}
function expiredOtp(purpose: OtpChallenge["purpose"]): OtpChallenge {
  return { purpose, token: "t.p", expiresAt: NOW - 1_000, attemptsLeft: 5 };
}

test("a live code is one that is unused, unexpired and still has attempts", () => {
  assert.equal(otpIsLive(liveOtp("start"), NOW), true);
  assert.equal(otpIsLive(expiredOtp("start"), NOW), false);
  assert.equal(otpIsLive({ ...liveOtp("start"), attemptsLeft: 0 }, NOW), false);
  assert.equal(otpIsLive({ ...liveOtp("start"), usedAt: NOW }, NOW), false);
  assert.equal(otpIsLive(undefined, NOW), false);
  // A used code is finished, not stale: nothing is owed to anybody.
  assert.equal(otpIsStale({ ...liveOtp("start"), usedAt: NOW }, NOW), false);
  assert.equal(otpIsStale(expiredOtp("start"), NOW), true);
  assert.equal(otpIsStale({ ...liveOtp("start"), attemptsLeft: 0 }, NOW), true);
});

test("both sides are always told who is holding the job up, and it is never both", () => {
  const statuses: JobStatus[] = [
    "requested", "assigned", "accepted", "travelling", "arrived",
    "change_pending", "started", "completed", "settled", "cancelled"
  ];
  for (const status of statuses) {
    const extra = status === "change_pending"
      ? { changeOrders: [{ id: "CHG-1", description: "extra switch", amountDelta: 120, requestedBy: "W02" }] }
      : {};
    const asCustomer = jobFlow(job(status, extra), "customer", NOW);
    const asWorker = jobFlow(job(status, extra), "worker", NOW);
    assert.equal(asCustomer.waitingOn, asWorker.waitingOn, `${status}: one shared answer`);
    assert.ok(asCustomer.nextStep.length > 10, `${status}: customer gets a next step`);
    assert.ok(asWorker.nextStep.length > 10, `${status}: worker gets a next step`);
    assert.ok(asCustomer.otherSide.length > 10, `${status}: customer sees what the member is doing`);
    assert.ok(asWorker.otherSide.length > 10, `${status}: worker sees what the customer is doing`);
    assert.ok(
      !(asCustomer.yourMove && asWorker.yourMove),
      `${status}: the job cannot be waiting on both sides at once`
    );
  }
});

test("on arrival the move is the customer's until a code is live, then the member's", () => {
  const waiting = jobFlow(job("arrived"), "customer", NOW);
  assert.equal(waiting.waitingOn, "customer");
  assert.equal(waiting.yourMove, true);
  assert.match(waiting.nextStep, /issue the start code/i);
  assert.match(jobFlow(job("arrived"), "worker", NOW).nextStep, /wait for their start code/i);

  const issued = jobFlow(job("arrived", { startOtp: liveOtp("start") }), "worker", NOW);
  assert.equal(issued.waitingOn, "worker");
  assert.equal(issued.yourMove, true);
  assert.match(issued.nextStep, /enter it to begin work/i);
});

test("an expired code hands the move back to the customer with a reissue instruction", () => {
  const stale = jobFlow(job("arrived", { startOtp: expiredOtp("start") }), "customer", NOW);
  assert.equal(stale.waitingOn, "customer");
  assert.match(stale.nextStep, /no longer valid.*fresh one/i);
  assert.match(jobFlow(job("arrived", { startOtp: expiredOtp("start") }), "worker", NOW).nextStep, /ask the customer to issue a new one/i);
});

test("during work the move moves worker to customer to worker as proof and the finish code land", () => {
  const working = job("started");
  assert.equal(jobFlow(working, "worker", NOW).waitingOn, "worker");
  assert.match(jobFlow(working, "worker", NOW).nextStep, /add your work proof/i);

  const proofed = job("started", {
    workerId:"W02",
    evidence: [{ id: "EV-1", label: "Before/after work proof", createdAt: new Date(NOW).toISOString(), uploadedBy: "W02" }]
  });
  assert.equal(jobFlow(proofed, "customer", NOW).waitingOn, "customer");
  assert.match(jobFlow(proofed, "customer", NOW).nextStep, /issue the finish code/i);
  assert.match(jobFlow(proofed, "worker", NOW).nextStep, /waiting for the customer/i);

  const codeOut = job("started", { ...proofed, completionOtp: liveOtp("completion") });
  assert.equal(jobFlow(codeOut, "worker", NOW).waitingOn, "worker");
});

test("a pending scope addition stops work and names the amount for the customer", () => {
  const pending = job("change_pending", {
    changeOrders: [{ id: "CHG-1", description: "replace one extra switch", amountDelta: 120, requestedBy: "W02" }]
  });
  const view = jobFlow(pending, "customer", NOW);
  assert.equal(view.waitingOn, "customer");
  assert.match(view.nextStep, /\+₹120/);
  assert.match(view.nextStep, /work stays stopped/i);
  assert.match(jobFlow(pending, "worker", NOW).nextStep, /do not start it yet/i);
});

test("an unassigned job is waiting on the cooperative, not on either person", () => {
  const view = jobFlow(job("requested"), "customer", NOW);
  assert.equal(view.waitingOn, "cooperative");
  assert.equal(view.yourMove, false);
  assert.equal(jobFlow(job("requested"), "worker", NOW).yourMove, false);
});

test("steps are ordered, progress monotonically, and end complete when paid", () => {
  const order = ["booked", "assigned", "accepted", "travel", "scope", "start", "work", "finish", "paid"];
  const flow = jobFlow(job("started"), "worker", NOW);
  assert.deepEqual(flow.steps.map((s) => s.id), order);
  const current = flow.steps.findIndex((s) => s.state === "current");
  flow.steps.forEach((step, index) => {
    if (index < current) assert.equal(step.state, "done", `${step.id} before the current step is done`);
    if (index > current) assert.equal(step.state, "upcoming", `${step.id} after the current step is upcoming`);
  });
  const settled = jobFlow(job("settled"), "customer", NOW);
  assert.ok(settled.steps.every((s) => s.state === "done"));
  assert.equal(settled.finished, true);
  assert.equal(settled.waitingOn, "nobody");
});

test("a cancelled job stops at the step it reached instead of pretending to finish", () => {
  const view = jobFlow(job("cancelled"), "customer", NOW);
  assert.equal(view.cancelled, true);
  assert.equal(view.finished, false);
  assert.ok(view.steps.some((s) => s.state === "stopped"));
  assert.ok(!view.steps.some((s) => s.state === "current"));
  assert.match(view.nextStep, /cancelled/i);
});

test("every step carries wording for both audiences", () => {
  jobFlow(job("assigned"), "customer", NOW).steps.forEach((step) => {
    assert.ok(step.customerLabel.length > 2, `${step.id} needs customer wording`);
    assert.ok(step.workerLabel.length > 2, `${step.id} needs worker wording`);
  });
  assert.equal(waitingOnLabel("worker"), "Waiting on the member");
  assert.equal(waitingOnLabel("nobody"), "Nothing to do");
});
