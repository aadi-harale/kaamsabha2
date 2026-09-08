import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { activatePolicyProposal, castVote, createFederationDemo, reviewPolicyImpact, signIn, signOut } from "../lib/commands.ts";

test("federation demo settlement follows a newly activated protection floor",()=>{
 let state=signIn(initialState(),"W02","worker");
 state=reviewPolicyImpact(state,"proposal-floor-860","W02");
 state=castVote(state,"proposal-floor-860","W02","yes");
 state=signOut(state);
 state=signIn(state,"admin01","admin");
 state=activatePolicyProposal(state,"proposal-floor-860");
 state=createFederationDemo(state);
 const opportunity=state.federation.opportunities[0];
 const settlement=state.federation.settlements[0];
 assert.equal(opportunity.workerPayout,860);
 assert.equal(settlement.workerAmount,860);
 assert.equal(settlement.customerTotal,1000);
 assert.equal(settlement.reconciles,true);
});
