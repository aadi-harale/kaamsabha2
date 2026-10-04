import test from "node:test";
import assert from "node:assert/strict";
import { authenticateDemoAccount, DEMO_PASSWORD, demoAccounts } from "../lib/demo-auth.ts";
import { createBooking, signIn, transitionJob } from "../lib/commands.ts";
import { initialState } from "../lib/domain.ts";

test("demo authentication derives roles from accounts",()=>{
  const state=initialState();
  const customer=authenticateDemoAccount(state,"customer",DEMO_PASSWORD);
  const worker=authenticateDemoAccount(state,"ravi",DEMO_PASSWORD);
  const admin=authenticateDemoAccount(state,"admin",DEMO_PASSWORD);
  assert.equal(customer?.role,"customer");
  assert.equal(customer?.userId,"customer01");
  assert.equal(worker?.role,"worker");
  assert.equal(worker?.userId,"W02");
  assert.equal(admin?.role,"admin");
  assert.equal(admin?.userId,"admin01");
  assert.equal(authenticateDemoAccount(state,"admin","wrong"),null);
  assert.ok(demoAccounts(state).some(account=>account.username==="meena"&&account.role==="worker"));
});

test("job lifecycle transition is worker RBAC protected",()=>{
  let state=signIn(initialState(),"customer01","customer");
  state=createBooking(state,{customerId:"customer01",service:"electrician",locality:"Kharadi, Pune",scheduledAt:new Date(0).toISOString()});
  const jobId=state.jobs[0].id;
  assert.throws(()=>transitionJob(state,jobId,"accepted"),/worker/i);
});
