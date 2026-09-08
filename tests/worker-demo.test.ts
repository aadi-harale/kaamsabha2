import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { signIn } from "../lib/commands.ts";
import { summarizeWorkerEarnings, workerEarningEntries } from "../lib/earnings.ts";

test("workers can sign in by member name while internal IDs remain stable",()=>{
  const seed=initialState();
  const ravi=signIn(seed,"Ravi Shinde","worker");
  assert.equal(ravi.session?.userId,"W02");
  const anil=signIn(seed,"Anil Kulkarni","worker");
  assert.equal(anil.session?.userId,"W10");
});

test("every seeded worker has meaningful earnings analytics history",()=>{
  const state=initialState();
  assert.ok(state.workers.some(w=>w.name==="Meena Jadhav"));
  assert.ok(state.workers.some(w=>w.name==="Ravi Shinde"));
  assert.ok(state.workers.some(w=>w.name==="Anil Kulkarni"));
  for(const worker of state.workers){
    const entries=workerEarningEntries(state,worker.id);
    const summary=summarizeWorkerEarnings(state,worker.id);
    assert.ok(entries.length>=8,`${worker.name} should have seeded earnings history`);
    assert.ok(summary.total>0,`${worker.name} should have a positive earnings total`);
    assert.ok(summary.completedJobs>=8,`${worker.name} should have completed-job history`);
    assert.ok(summary.averageJobPayout>=760,`${worker.name} should show protected average payout`);
  }
});
