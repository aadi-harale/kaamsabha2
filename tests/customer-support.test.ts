import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../lib/domain.ts";
import { signIn } from "../lib/commands.ts";
import { createCustomerHelpCase } from "../lib/customer-support.ts";

test("customer help request becomes a shared admin-visible issue record",()=>{
  let state=signIn(initialState(),"customer01","customer");
  state=createCustomerHelpCase(state,{category:"Scope / extra charge",message:"Worker says an extra switch will cost more",attachmentName:"switch.jpg",assistantReply:"Use Scope Lock before work starts.",aiMode:"manual-fallback"});
  assert.equal(state.issues.length,1);
  assert.equal(state.issues[0].openedBy,"customer01");
  assert.match(state.issues[0].category,/Customer Help/);
  assert.ok(state.issues[0].notes.some(note=>note.includes("switch.jpg")));
  assert.ok(state.issues[0].notes.some(note=>note.includes("Scope Lock")));
});
