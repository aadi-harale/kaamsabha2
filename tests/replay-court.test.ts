import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { closeChallenge, createBooking, openChallenge, remedyChallenge, replayChallenge, resolveChallenge, signIn, signOut } from "../lib/commands.ts";

function booking(){
  let state=signIn(initialState(),"customer01","customer");
  state=createBooking(state,{customerId:"customer01",service:"electrician",locality:"Kharadi, Pune",scheduledAt:new Date(0).toISOString()});
  return state;
}

test("Replay Court uses frozen candidate facts instead of current worker or policy state",()=>{
  let state=booking();
  const job=state.jobs[0],receipt=state.receipts[0];
  assert.ok(receipt.candidateSnapshot?.length);
  state=signOut(state);state=signIn(state,"W02","worker");
  state=openChallenge(state,job.id,{receiptId:receipt.id,category:"opportunity",statement:"Please verify the workload ordering from the original allocation.",desiredOutcome:"Explain or correct the allocation"});
  const challenge=state.challenges[0];
  const frozenPolicy=challenge.decisionSnapshot?.policyVersion;
  state={...state,workers:state.workers.map(w=>w.id==="W02"?{...w,workloadTodayMinutes:999,available:false}:w),policy:{...state.policy,version:"constitution-v99",minimumPayout:9999}};
  state=signOut(state);state=signIn(state,"admin01","admin");
  state=replayChallenge(state,challenge.id);
  assert.equal(state.challenges[0].status,"replayed");
  assert.equal(state.challenges[0].replayResult?.outcome,"confirmed");
  assert.equal(state.challenges[0].decisionSnapshot?.policyVersion,frozenPolicy);
  assert.match(state.challenges[0].replayResult?.summary??"",/Frozen replay reproduced/);
});

test("Replay Court detects a frozen selection mismatch and requires a remedy before closing",()=>{
  let state=booking();const job=state.jobs[0],receipt=state.receipts[0];
  state=signOut(state);state=signIn(state,"W02","worker");
  state=openChallenge(state,job.id,{receiptId:receipt.id,category:"opportunity",statement:"The selected member does not match the workload order.",desiredOutcome:"Correct the decision"});
  const challengeId=state.challenges[0].id;
  state={...state,challenges:state.challenges.map(c=>c.id===challengeId&&c.decisionSnapshot?{...c,decisionSnapshot:{...c.decisionSnapshot,selectedWorkerId:"W99"}}:c)};
  state=signOut(state);state=signIn(state,"admin01","admin");
  state=replayChallenge(state,challengeId);
  assert.equal(state.challenges[0].replayResult?.outcome,"violation");
  state=resolveChallenge(state,challengeId,"violation","Frozen replay did not reproduce the recorded selection.");
  assert.equal(state.challenges[0].status,"violation");
  assert.throws(()=>closeChallenge(state,challengeId),/remedy/i);
  state=remedyChallenge(state,challengeId,"Restore the affected opportunity credit and review the source record.");
  assert.equal(state.challenges[0].status,"remedied");
  state=closeChallenge(state,challengeId);
  assert.equal(state.challenges[0].status,"closed");
});

test("legacy replay without candidate facts escalates to human review rather than guessing",()=>{
  let state=booking();const job=state.jobs[0],receipt=state.receipts[0];
  state=signOut(state);state=signIn(state,"W02","worker");
  state=openChallenge(state,job.id,{receiptId:receipt.id,category:"eligibility",statement:"Please check the original eligibility facts.",desiredOutcome:"Human explanation if evidence is incomplete"});
  const challengeId=state.challenges[0].id;
  state={...state,challenges:state.challenges.map(c=>c.id===challengeId&&c.decisionSnapshot?{...c,decisionSnapshot:{...c.decisionSnapshot,candidateSnapshot:[]}}:c)};
  state=signOut(state);state=signIn(state,"admin01","admin");
  state=replayChallenge(state,challengeId);
  assert.equal(state.challenges[0].replayResult?.outcome,"human-review");
  assert.match(state.challenges[0].replayResult?.summary??"",/does not contain enough frozen candidate facts/);
});
