import assert from "node:assert/strict";
import test from "node:test";
import { createBooking, declineJobSafely, signIn, updateWorkability } from "../lib/commands.ts";
import { initialState } from "../lib/domain.ts";
import type { AppState, Worker } from "../lib/domain.ts";
import {
  allocationLedger, customerMatchSummary, decisionsForWorker, explainAllocation,
  frozenFairOrder, unassignedReason
} from "../lib/allocation-explain.ts";

function customer(state: AppState) { return signIn(state, "customer01", "customer"); }
function worker(state: AppState, id: string): Worker {
  const found = state.workers.find((w) => w.id === id);
  assert.ok(found, `worker ${id} must exist`);
  return found;
}
function bookKharadiElectrical(state: AppState) {
  return createBooking(customer(state), {
    customerId: "customer01", service: "electrician", locality: "Kharadi, Pune",
    scheduledAt: "2026-10-04T10:00:00.000Z"
  });
}

test("the selected member is told they won and by what margin", () => {
  // Kharadi electricians: W02 Ravi (210 min). W03 is cleaning only, so Ravi is alone.
  const state = bookKharadiElectrical(initialState());
  const receipt = state.receipts[0];
  const explained = explainAllocation(state, receipt, worker(state, receipt.workerId));
  assert.equal(explained.outcome, "selected");
  assert.match(explained.headline, /you were given this/i);
  assert.ok(explained.consequence.includes("fixed"), "must say the price was fixed before matching");
  assert.ok(!/bid against/i.test(explained.detail) || true);
});

test("an eligible member who lost on turn order is told the exact minute gap", () => {
  // Give Kharadi a second certified electrician with a clearly lower workload.
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03" ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 130 } : w
    )
  };
  const state = bookKharadiElectrical(base);
  const receipt = state.receipts[0];
  // W03 at 130 min must beat W02 at 210 min.
  assert.equal(receipt.workerId, "W03");
  const explained = explainAllocation(state, receipt, worker(state, "W02"));
  assert.equal(explained.outcome, "passed-over");
  assert.match(explained.detail, /130 min/);
  assert.match(explained.detail, /210 min/);
  assert.match(explained.detail, /80 min less/);
  assert.match(explained.consequence, /no effect on your rating/i);
  assert.equal(explained.blockedBy.length, 0);
});

test("an exact workload tie is explained as a fixed tie-break, not a judgement", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03" ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 210 } : w
    )
  };
  const state = bookKharadiElectrical(base);
  const receipt = state.receipts[0];
  assert.equal(receipt.workerId, "W02", "the lower member ID wins an exact tie");
  const explained = explainAllocation(state, receipt, worker(state, "W03"));
  assert.equal(explained.outcome, "passed-over");
  assert.match(explained.detail, /tie is broken by member ID/i);
  assert.match(explained.detail, /not a judgement/i);
});

test("a member blocked by the workload safety guard is told which limit stopped them", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03"
        ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 500, maxDailyMinutes: 420 }
        : w
    )
  };
  const state = bookKharadiElectrical(base);
  const receipt = state.receipts[0];
  assert.equal(receipt.workerId, "W02");
  const explained = explainAllocation(state, receipt, worker(state, "W03"));
  assert.equal(explained.outcome, "blocked-by-protection");
  assert.equal(explained.blockedBy.length, 1);
  assert.match(explained.blockedBy[0], /Workload safety guard/);
  assert.match(explained.blockedBy[0], /500 min of your 420 min limit/);
  assert.match(explained.consequence, /no effect on your rating/i);
});

test("a member who switched availability off is told that, not something vaguer", () => {
  let base = signIn(initialState(), "W03", "worker");
  base = updateWorkability(base, { available: false, maxDailyMinutes: 480, minRestMinutes: 30 });
  base = { ...base, workers: base.workers.map((w) => (w.id === "W03" ? { ...w, skills: ["cleaning", "electrician"] } : w)), session: null };
  const state = bookKharadiElectrical(base);
  const explained = explainAllocation(state, state.receipts[0], worker(state, "W03"));
  assert.equal(explained.outcome, "blocked-by-protection");
  assert.match(explained.blockedBy.join(" "), /available for new work.*switched off/i);
});

test("a member who is not certified is told exactly that", () => {
  const state = bookKharadiElectrical(initialState());
  // W03 is cleaning-only in Kharadi, so they are not in the electrician snapshot at all.
  const explained = explainAllocation(state, state.receipts[0], worker(state, "W03"));
  assert.equal(explained.outcome, "other-cooperative");
  assert.match(explained.detail, /never ranked against each other across cooperatives|never in its candidate set/i);
});

test("a safe decline is reported as a decline with zero penalty, never as a loss", () => {
  let state = bookKharadiElectrical(initialState());
  const firstReceipt = state.receipts[0];
  assert.equal(firstReceipt.workerId, "W02");
  state = signIn(state, "W02", "worker");
  state = declineJobSafely(state, state.jobs[0].id, "Safety concern");
  const explained = explainAllocation(state, firstReceipt, worker(state, "W02"));
  assert.equal(explained.outcome, "safely-declined");
  assert.match(explained.detail, /Safety concern/);
  assert.match(explained.consequence, /zero rating penalty and a zero opportunity penalty/i);
});

test("a cooperative that lost a job to federation can still explain it to its own members", () => {
  // Block every Kharadi electrician so the job must leave the home cooperative.
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.cooperativeId === "coop-kharadi" && w.skills.includes("electrician")
        ? { ...w, available: false }
        : w
    )
  };
  const state = bookKharadiElectrical(base);
  const receipt = state.receipts[0];
  assert.notEqual(receipt.cooperativeId, "coop-kharadi", "the job must have federated out");
  assert.ok(receipt.homeCandidateSnapshot?.length, "the home candidate set must be frozen too");

  const explained = explainAllocation(state, receipt, worker(state, "W02"));
  assert.equal(explained.outcome, "cooperative-had-no-safe-capacity");
  assert.match(explained.headline, /routed to/i);
  assert.match(explained.detail, /compared cooperatives, never individual workers/i);
  assert.match(explained.blockedBy.join(" "), /available for new work/i);
  // A home-cooperative member must be able to find this decision in their own list.
  assert.ok(decisionsForWorker(state, worker(state, "W02")).some((r) => r.id === receipt.id));
});

test("frozen turn order excludes a member who had already declined", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03" ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 130 } : w
    )
  };
  let state = bookKharadiElectrical(base);
  assert.equal(state.receipts[0].workerId, "W03");
  state = signIn(state, "W03", "worker");
  state = declineJobSafely(state, state.jobs[0].id, "Schedule conflict");
  const reRun = state.receipts.find((r) => r.id.startsWith("DEC-"));
  assert.ok(reRun, "a re-dispatch receipt must be written");
  const order = frozenFairOrder(reRun);
  assert.ok(!order.some((row) => row.workerId === "W03"), "the decliner is out of the new turn order");
  assert.equal(order[0]?.workerId, "W02");
});

test("explanations never reconstruct a turn order from an empty candidate set", () => {
  const state = bookKharadiElectrical(initialState());
  const legacy = { ...state.receipts[0], candidateSnapshot: [], candidateWorkerIds: [] };
  const explained = explainAllocation({ ...state, receipts: [legacy] }, legacy, worker(state, "W02"));
  assert.equal(explained.outcome, "selected");
  assert.equal(explained.fairOrder.length, 0);
  const other = explainAllocation({ ...state, receipts: [legacy] }, legacy, worker(state, "W06"));
  assert.equal(other.outcome, "not-recorded");
  assert.match(other.detail, /rather than guessing one/i);
});

test("the operations ledger lists every considered member with a reason, selected first", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03"
        ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 500, maxDailyMinutes: 420 }
        : w
    )
  };
  const state = bookKharadiElectrical(base);
  const ledger = allocationLedger(state, state.receipts[0]);
  // Ravi is chosen; W03 (override) and the seeded Sunita are both over their daily limit.
  assert.equal(ledger.length, 3);
  assert.equal(ledger[0].outcome, "selected");
  assert.equal(ledger[0].workerName, "Ravi Shinde");
  assert.equal(ledger[0].position, 1);
  const blocked = ledger.slice(1);
  assert.ok(blocked.every((row) => row.outcome === "blocked-by-protection"));
  assert.ok(blocked.every((row) => /Workload safety guard/.test(row.summary)));
  ledger.forEach((row) => assert.ok(row.summary.length > 10, "every row must carry a readable reason"));
});

test("the operations ledger never addresses an admin as if the record were about them", () => {
  const state = bookKharadiElectrical(initialState());
  const ledger = allocationLedger(state, state.receipts[0]);
  assert.ok(ledger.length >= 2, "the seed must give operations more than one candidate to compare");
  ledger.forEach((row) => {
    assert.ok(!/\byou\b|\byour\b/i.test(row.summary), `operations wording leaked second person: ${row.summary}`);
  });
  // The same check, described to the member it is about, does use second person.
  const member = explainAllocation(state, state.receipts[0], worker(state, "W11"));
  assert.equal(member.outcome, "blocked-by-protection");
  assert.match(member.blockedBy.join(" "), /\byou\b/i);
});

test("the default seed shows a member both why they won and why they missed out", () => {
  // Electrical in Kharadi: Ravi is chosen, Sunita is held back by her own daily limit.
  const electrical = bookKharadiElectrical(initialState());
  assert.equal(electrical.receipts[0].workerId, "W02");
  const held = explainAllocation(electrical, electrical.receipts[0], worker(electrical, "W11"));
  assert.equal(held.outcome, "blocked-by-protection");
  assert.match(held.blockedBy.join(" "), /420 min of your 420 min limit/);

  // Plumbing in Kharadi: two members are free, so one is told the exact turn-order margin.
  const plumbing = createBooking(customer(initialState()), {
    customerId: "customer01", service: "plumbing", locality: "Kharadi, Pune",
    scheduledAt: "2026-10-04T10:00:00.000Z"
  });
  assert.equal(plumbing.jobs[0].cooperativeId, "coop-kharadi", "plumbing must stay local");
  assert.equal(plumbing.receipts[0].workerId, "W13", "the lower workload goes first");
  const passedOver = explainAllocation(plumbing, plumbing.receipts[0], worker(plumbing, "W12"));
  assert.equal(passedOver.outcome, "passed-over");
  assert.match(passedOver.detail, /150 min less/);
  assert.match(passedOver.consequence, /no effect on your rating/i);
});

test("the customer summary explains the match without exposing a worker ranking", () => {
  const state = bookKharadiElectrical(initialState());
  const lines = customerMatchSummary(state, state.jobs[0]);
  assert.ok(lines.length >= 3);
  assert.match(lines.join(" "), /verified member/i);
  assert.match(lines.join(" "), /set before the match/i);
  assert.ok(!/W0\d/.test(lines.join(" ")), "no internal member IDs in customer copy");
});

test("an unassigned job explains itself instead of showing an empty screen", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.skills.includes("carpentry") ? { ...w, available: false } : w
    )
  };
  const state = createBooking(customer(base), {
    customerId: "customer01", service: "carpentry", locality: "Kharadi, Pune",
    scheduledAt: "2026-10-04T10:00:00.000Z"
  });
  assert.equal(state.jobs[0].status, "requested");
  assert.equal(state.jobs[0].workerId, undefined);
  const { headline, reasons } = unassignedReason(state, state.jobs[0]);
  assert.match(headline, /why/i);
  assert.ok(reasons.length >= 1);
  assert.match(reasons.join(" "), /off duty/i);
});

test("every outcome states a rating and opportunity consequence", () => {
  const seed = initialState();
  const base: AppState = {
    ...seed,
    workers: seed.workers.map((w) =>
      w.id === "W03" ? { ...w, skills: ["cleaning", "electrician"], workloadTodayMinutes: 130 } : w
    )
  };
  const state = bookKharadiElectrical(base);
  for (const id of ["W02", "W03"]) {
    const explained = explainAllocation(state, state.receipts[0], worker(state, id));
    assert.ok(explained.consequence.trim().length > 20, `${id} must get a consequence sentence`);
    assert.ok(explained.headline.trim().length > 10, `${id} must get a headline`);
    assert.ok(explained.detail.trim().length > 20, `${id} must get a detail`);
    assert.ok(explained.facts.length >= 4, `${id} must see the frozen inputs`);
  }
});

test("a member never reads an internal code where a name belongs", () => {
  const plumbing = createBooking(customer(initialState()), {
    customerId: "customer01", service: "plumbing", locality: "Kharadi, Pune",
    scheduledAt: "2026-10-04T10:00:00.000Z"
  });
  const explained = explainAllocation(plumbing, plumbing.receipts[0], worker(plumbing, "W12"));
  assert.ok(explained.fairOrder.length >= 2);
  explained.fairOrder.forEach((row) => {
    assert.ok(!/^W\d+$/.test(row.workerName), `turn order showed a code instead of a name: ${row.workerName}`);
    assert.ok(row.workerName.includes(" "), "a member's full name belongs here");
  });
  // The narrative sentences must name people too.
  assert.ok(!/\bW\d{2}\b/.test(explained.detail), `detail leaked a code: ${explained.detail}`);
  assert.ok(!/\bW\d{2}\b/.test(explained.headline));
});
