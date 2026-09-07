import test from "node:test";
import assert from "node:assert/strict";
import { eligible, initialState, selectWorker } from "../lib/domain.ts";

test("deterministic seed keeps protection floor and worker eligibility", () => {
  const state = initialState();
  assert.equal(state.policy.minimumPayout, 760);
  assert.equal(state.workers.length, 3);
  assert.equal(eligible(state.workers[0], "electrician"), true);
});

test("dispatch respects hard eligibility and stable workload ordering", () => {
  const state = initialState();
  const selected = selectWorker(state, "electrician");
  assert.equal(selected?.id, "W01");
  const unsafe = { ...state, workers: state.workers.map((w) => w.id === "W01" ? { ...w, workloadTodayMinutes: 500 } : w) };
  assert.equal(selectWorker(unsafe, "electrician")?.id, "W02");
});

test("ineligible skill is never assigned", () => {
  const state = initialState();
  assert.equal(selectWorker(state, "plumbing"), undefined);
});
