import assert from "node:assert/strict";
import test from "node:test";
import {
  addEvidence, createBooking, recordOtpFailure, recordOtpIssued, recordOtpVerified,
  signIn, signOut, transitionJob
} from "../lib/commands.ts";
import { initialState } from "../lib/domain.ts";
import type { AppState, OtpChallenge } from "../lib/domain.ts";
import { OTP_MAX_ATTEMPTS, resolveOtpRuntimeConfig } from "../lib/otp-config.ts";
import { issueOtp, verifyOtp } from "../lib/otp.ts";

function challenge(purpose: OtpChallenge["purpose"], over: Partial<OtpChallenge> = {}): OtpChallenge {
  return {
    purpose, token: "signed", expiresAt: Date.now() + 60_000,
    attemptsLeft: OTP_MAX_ATTEMPTS, issuedAt: Date.now(), demoCode: "123456", ...over
  };
}

/** Walk a job to the point where a start code can be issued. */
function arrivedJob(): { state: AppState; jobId: string } {
  let state = signIn(initialState(), "customer01", "customer");
  state = createBooking(state, {
    customerId: "customer01", service: "electrician", locality: "Kharadi, Pune",
    scheduledAt: new Date(0).toISOString()
  });
  const jobId = state.jobs[0].id;
  state = signIn(signOut(state), "W02", "worker");
  state = transitionJob(state, jobId, "accepted");
  state = transitionJob(state, jobId, "travelling");
  state = transitionJob(state, jobId, "arrived");
  return { state: signIn(signOut(state), "customer01", "customer"), jobId };
}

test("the code a customer is given survives in the register, not just on their screen", () => {
  const { state, jobId } = arrivedJob();
  const next = recordOtpIssued(state, jobId, challenge("start"));
  const stored = next.jobs.find((job) => job.id === jobId)?.startOtp;
  // This is what makes the job finishable after a reload or a sign-out: the code lives with
  // the job, so the member can still be told it.
  assert.equal(stored?.demoCode, "123456");
  assert.equal(stored?.attemptsLeft, OTP_MAX_ATTEMPTS);
  assert.ok(stored?.issuedAt);
});

test("an expired code costs the member nothing; a wrong guess costs one attempt", () => {
  const { state, jobId } = arrivedJob();

  const expired = recordOtpIssued(state, jobId, challenge("start", { expiresAt: Date.now() - 1_000 }));
  const afterExpiry = recordOtpFailure(expired, jobId, "start");
  assert.equal(
    afterExpiry.jobs.find((job) => job.id === jobId)?.startOtp?.attemptsLeft,
    OTP_MAX_ATTEMPTS,
    "the clock running out is not a failed guess"
  );

  const live = recordOtpIssued(state, jobId, challenge("start"));
  const afterGuess = recordOtpFailure(live, jobId, "start");
  assert.equal(afterGuess.jobs.find((job) => job.id === jobId)?.startOtp?.attemptsLeft, OTP_MAX_ATTEMPTS - 1);
});

test("a used code cannot be spent twice, and failures cannot be recorded against it", () => {
  const { state, jobId } = arrivedJob();
  let next = recordOtpIssued(state, jobId, challenge("start"));
  next = signIn(signOut(next), "W02", "worker");
  next = recordOtpVerified(next, jobId, "start");
  assert.equal(next.jobs.find((job) => job.id === jobId)?.status, "started");
  assert.throws(() => recordOtpVerified(next, jobId, "start"), /already used/i);
  assert.throws(() => recordOtpFailure(next, jobId, "start"), /already used/i);
});

test("a locked code stops the member before another wasted attempt", () => {
  const { state, jobId } = arrivedJob();
  let next = recordOtpIssued(state, jobId, challenge("start", { attemptsLeft: 0 }));
  next = signIn(signOut(next), "W02", "worker");
  assert.throws(() => recordOtpVerified(next, jobId, "start"), /locked/i);
});

test("start and completion codes are distinct, job-bound and single-purpose", () => {
  const secret = "test-secret";
  const start = issueOtp("KMS-00001", "start", secret, 1_000, 60_000, "nonce-a");
  const finish = issueOtp("KMS-00001", "completion", secret, 1_000, 60_000, "nonce-b");
  assert.notEqual(start.code, finish.code, "the two codes for one job must differ");

  // The right code, on the wrong purpose or the wrong job, must not verify.
  assert.equal(verifyOtp(start.token, start.code, "KMS-00001", "start", secret, 2_000).ok, true);
  assert.equal(verifyOtp(start.token, start.code, "KMS-00001", "completion", secret, 2_000).ok, false);
  assert.equal(verifyOtp(start.token, start.code, "KMS-00002", "start", secret, 2_000).ok, false);
  assert.equal(verifyOtp(start.token, finish.code, "KMS-00001", "start", secret, 2_000).ok, false);
  const late = verifyOtp(start.token, start.code, "KMS-00001", "start", secret, 1_000 + 60_001);
  assert.equal(late.ok, false);
  assert.equal(late.ok === false ? late.reason : "", "expired");
});

test("a deployment with a real secret never puts the code where a worker can read it", () => {
  assert.equal(resolveOtpRuntimeConfig({ KAAMSABHA_OTP_SECRET: "prod" })?.demo, false);
  assert.equal(resolveOtpRuntimeConfig({ KAAMSABHA_OTP_SECRET: "prod", KAAMSABHA_DEMO_MODE: "true" })?.demo, true);
  assert.equal(resolveOtpRuntimeConfig({})?.demo, true, "the local demo must still work out of the box");
  assert.equal(resolveOtpRuntimeConfig({ KAAMSABHA_DEMO_MODE: "false" }), null, "no secret and no demo means disabled");
});

test("a completion code still cannot be issued before the customer has proof to review", () => {
  const { state, jobId } = arrivedJob();
  let next = recordOtpIssued(state, jobId, challenge("start"));
  next = signIn(signOut(next), "W02", "worker");
  next = recordOtpVerified(next, jobId, "start");
  next = signIn(signOut(next), "customer01", "customer");
  assert.throws(() => recordOtpIssued(next, jobId, challenge("completion")), /work proof/i);

  next = signIn(signOut(next), "W02", "worker");
  next = addEvidence(next, jobId, "Before/after work proof");
  next = signIn(signOut(next), "customer01", "customer");
  const issued = recordOtpIssued(next, jobId, challenge("completion"));
  assert.equal(issued.jobs.find((job) => job.id === jobId)?.completionOtp?.demoCode, "123456");
});
