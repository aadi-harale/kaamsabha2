import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { createBooking, recordOtpIssued, signIn, signOut, transitionJob } from "../lib/commands.ts";
import { decidePreStartScopeChange, proposePreStartScopeChange } from "../lib/prestart-scope.ts";

function arriveElectrician(){
  let state=signIn(initialState(),"customer01","customer");
  state=createBooking(state,{customerId:"customer01",service:"electrician",locality:"Kharadi, Pune",scheduledAt:new Date(0).toISOString()});
  const jobId=state.jobs[0].id;
  state=signOut(state);
  state=signIn(state,"W02","worker");
  state=transitionJob(state,jobId,"accepted");
  state=transitionJob(state,jobId,"travelling");
  state=transitionJob(state,jobId,"arrived");
  return {state,jobId};
}

test("extra scope is proposed after arrival and blocks start until customer approval",()=>{
  let {state,jobId}=arriveElectrician();
  state=proposePreStartScopeChange(state,jobId,"Replace one additional switch",180);
  let job=state.jobs.find(j=>j.id===jobId)!;
  assert.equal(job.status,"change_pending");
  assert.equal(job.amount,760);
  assert.equal(job.changeOrders[0].approved,undefined);

  state=signOut(state);
  state=signIn(state,"customer01","customer");
  assert.throws(()=>recordOtpIssued(state,jobId,{purpose:"start",token:"x",expiresAt:Date.now()+60000,attemptsLeft:5}),/after worker arrival|arrival/i);

  state=decidePreStartScopeChange(state,jobId,job.changeOrders[0].id,true);
  job=state.jobs.find(j=>j.id===jobId)!;
  assert.equal(job.status,"arrived");
  assert.equal(job.amount,940);
  assert.equal(job.changeOrders[0].approved,true);

  state=recordOtpIssued(state,jobId,{purpose:"start",token:"fresh",expiresAt:Date.now()+60000,attemptsLeft:5});
  assert.equal(state.jobs.find(j=>j.id===jobId)?.startOtp?.token,"fresh");
});

test("declining added scope returns to original arrived scope and price",()=>{
  let {state,jobId}=arriveElectrician();
  state=proposePreStartScopeChange(state,jobId,"Add another fixture",250);
  const changeId=state.jobs.find(j=>j.id===jobId)!.changeOrders[0].id;
  state=signOut(state);
  state=signIn(state,"customer01","customer");
  state=decidePreStartScopeChange(state,jobId,changeId,false);
  const job=state.jobs.find(j=>j.id===jobId)!;
  assert.equal(job.status,"arrived");
  assert.equal(job.amount,760);
  assert.equal(job.changeOrders[0].approved,false);
});

test("scope proposal invalidates any start OTP issued before the scope changed",()=>{
  let {state,jobId}=arriveElectrician();
  state=signOut(state);
  state=signIn(state,"customer01","customer");
  state=recordOtpIssued(state,jobId,{purpose:"start",token:"stale",expiresAt:Date.now()+60000,attemptsLeft:5});
  state=signOut(state);
  state=signIn(state,"W02","worker");
  state=proposePreStartScopeChange(state,jobId,"Replace an extra damaged socket",120);
  assert.equal(state.jobs.find(j=>j.id===jobId)?.startOtp,undefined);
});
