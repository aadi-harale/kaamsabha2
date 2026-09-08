import test from "node:test";
import assert from "node:assert/strict";
import { simulateBallot } from "../lib/governance-sim.ts";

test("voting simulation explains quorum and approval without mutating state",()=>{
  const pass=simulateBallot({yes:7,no:2,members:9,quorumThreshold:9,approvalThreshold:7});
  assert.equal(pass.participants,9);
  assert.equal(pass.quorumMet,true);
  assert.equal(pass.approvalMet,true);
  assert.equal(pass.activationEligible,true);

  const quorumFail=simulateBallot({yes:6,no:0,members:9,quorumThreshold:9,approvalThreshold:7});
  assert.equal(quorumFail.quorumMet,false);
  assert.equal(quorumFail.activationEligible,false);

  const approvalFail=simulateBallot({yes:5,no:4,members:9,quorumThreshold:9,approvalThreshold:7});
  assert.equal(approvalFail.quorumMet,true);
  assert.equal(approvalFail.approvalMet,false);
  assert.equal(approvalFail.activationEligible,false);
});
