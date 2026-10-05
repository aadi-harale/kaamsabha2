import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { adminOverview, memberCapacityStatus } from "../lib/admin-overview.ts";
import { createBooking, signIn, cancelBookingProtected, transitionJob } from "../lib/commands.ts";

test("operations totals exclude synthetic demand, sample earnings and seeded federation illustration", () => {
  const state = initialState(), before = JSON.stringify(state), totals = adminOverview(state);
  assert.equal(totals.bookings, 0); assert.equal(totals.paid, 0); assert.equal(totals.covered, 0);
  assert.equal(totals.transfers, 0); assert.equal(totals.readyProposals, 0);
  assert.equal(JSON.stringify(state), before);
});
test("bookings, active work, coverage and cancellation totals follow executable actions", () => {
  let state = signIn(initialState(), "customer01", "customer");
  state = createBooking(state, { customerId: "customer01", service: "electrician", locality: "Kharadi, Pune", scheduledAt: new Date().toISOString(), amount: 760 });
  const job = state.jobs[0];
  assert.equal(adminOverview(state).bookings, 1); assert.equal(adminOverview(state).activeJobs, 1);
  assert.equal(adminOverview(state).covered, 1); assert.equal(adminOverview(state).served, 0);
  state = signIn(state, job.workerId!, "worker"); state = transitionJob(state, job.id, "accepted");
  state = signIn(state, "customer01", "customer"); state = cancelBookingProtected(state, job.id, "Customer cancelled");
  const totals = adminOverview(state);
  assert.equal(totals.activeJobs, 0); assert.equal(totals.served, 0); assert.equal(totals.bookings, 1);
  assert.equal(totals.cancellationPay, 190); assert.equal(totals.paid, 0);
});
test("member availability distinguishes each hard block before reporting safe capacity", () => {
  const worker = initialState().workers.find(w => w.id === "W02")!;
  assert.equal(memberCapacityStatus(worker), "Safe capacity");
  assert.equal(memberCapacityStatus({ ...worker, verified: false }), "Certification needed");
  assert.equal(memberCapacityStatus({ ...worker, active: false }), "Inactive");
  assert.equal(memberCapacityStatus({ ...worker, available: false }), "Unavailable");
  assert.equal(memberCapacityStatus({ ...worker, workloadTodayMinutes: worker.maxDailyMinutes ?? 480 }), "At work limit");
});
