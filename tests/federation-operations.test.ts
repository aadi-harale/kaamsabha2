import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { signIn } from "../lib/commands.ts";
import { openFederationTransferRequest, routeFederationTransfer } from "../lib/federation-operations.ts";
import { readPolicyAnalyses, recordPolicyAnalysis } from "../lib/policy-intelligence.ts";

test("admin can open genuine overflow and choose the receiving cooperative",()=>{
 let state=signIn(initialState(),"admin01","admin");
 state=openFederationTransferRequest(state,{homeCooperativeId:"coop-kharadi",service:"carpentry",slaMinutes:35});
 const request=state.federation.opportunities[0];
 assert.equal(request.status,"open");
 assert.equal(request.homeCooperativeId,"coop-kharadi");
 assert.equal(request.selectedCooperativeId,undefined);
 assert.equal(request.candidates.find(c=>c.cooperativeId==="coop-yerawada")?.eligible,true);
 assert.equal(state.jobs.find(j=>j.id===request.jobId)?.status,"requested");
 state=routeFederationTransfer(state,request.id,"coop-yerawada");
 const routed=state.federation.opportunities.find(o=>o.id===request.id)!;
 const job=state.jobs.find(j=>j.id===request.jobId)!;
 assert.equal(routed.status,"accepted");
 assert.equal(routed.selectedCooperativeId,"coop-yerawada");
 assert.equal(routed.workerId,"W05");
 assert.equal(job.cooperativeId,"coop-yerawada");
 assert.equal(job.workerId,"W05");
 assert.equal(job.status,"assigned");
 assert.equal(state.receipts.find(r=>r.id===routed.workerReceiptId)?.protectedPayout,state.policy.minimumPayout);
});

test("federation request is blocked when the home cooperative still has safe local capacity",()=>{
 const state=signIn(initialState(),"admin01","admin");
 assert.throws(()=>openFederationTransferRequest(state,{homeCooperativeId:"coop-kharadi",service:"electrician",slaMinutes:35}),/still has safe local capacity/);
});

test("admin cannot route a federation job to an ineligible cooperative",()=>{
 let state=signIn(initialState(),"admin01","admin");
 state=openFederationTransferRequest(state,{homeCooperativeId:"coop-kharadi",service:"carpentry",slaMinutes:35});
 const request=state.federation.opportunities[0];
 assert.throws(()=>routeFederationTransfer(state,request.id,"coop-viman"),/not eligible|unavailable|qualified/i);
});

test("policy AI analysis is stored as an auditable review record and never mutates policy or workers",()=>{
 let state=signIn(initialState(),"admin01","admin");
 state={...state,issues:[{id:"ISS-1",openedBy:"W02",category:"Payment / payout",status:"open",notes:["Several jobs feel underpaid after travel."]}],suggestions:[{id:"SUG-1",workerId:"W03",category:"safety",title:"Longer rest gap",details:"Heavy jobs need more rest before another offer.",status:"submitted",createdAt:new Date(0).toISOString()}]};
 const policyBefore=JSON.stringify(state.policy),workersBefore=JSON.stringify(state.workers);
 state=recordPolicyAnalysis(state,{mode:"manual-fallback",analyzedCount:2,themes:[{label:"Workload & safety",count:1,severity:"medium",evidence:"Heavy jobs need more rest."}],recommendedAction:"Review with members.",draftTitle:"Member review: workload",draftDescription:"Discuss rest rules before any proposal.",notice:"Fallback analysis only."},["ISS-1"],["SUG-1"]);
 const history=readPolicyAnalyses(state);
 assert.equal(history.length,1);
 assert.equal(history[0].sourceIssueIds[0],"ISS-1");
 assert.equal(history[0].sourceSuggestionIds[0],"SUG-1");
 assert.equal(JSON.stringify(state.policy),policyBefore);
 assert.equal(JSON.stringify(state.workers),workersBefore);
});
