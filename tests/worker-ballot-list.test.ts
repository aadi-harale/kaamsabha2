import test from "node:test";
import assert from "node:assert/strict";
import { initialState, type AppState, type PolicyProposal } from "../lib/domain.ts";
import { activatePolicyProposal, castVote, reviewPolicyImpact, signIn } from "../lib/commands.ts";
import { memberBallotList, memberBallotTitle } from "../lib/ballot-outcome.ts";
import { workerSpokenSummary } from "../lib/worker-guidance.ts";

test("a saved vote stays open until actual activation, then moves into decided history", () => {
  let state = initialState();
  const id = state.proposals[0].id;
  const before = JSON.stringify(state);
  let list = memberBallotList(state, "W01");
  assert.equal(list.open.length, 1);
  assert.equal(list.decided.length, 0);
  assert.equal(list.open[0].result.mine?.choice, "yes");
  assert.equal(list.open[0].actionText, "See vote update");
  assert.equal(JSON.stringify(state), before, "browsing is read-only");
  state = reviewPolicyImpact(signIn(state, "W02", "worker"), id, "W02");
  state = castVote(state, id, "W02", "no", "Discuss the setting first");
  list = memberBallotList(state, "W02");
  assert.equal(list.open[0].result.stage, "ready");
  assert.equal(list.decided.length, 0, "meeting thresholds is not activation");
  assert.match(list.open[0].statusText, /not started/);
  assert.equal(state.policy.minimumPayout, 760);
  state = activatePolicyProposal(signIn(state, "admin01", "admin"), id);
  list = memberBallotList(state, "W02");
  assert.equal(list.open.length, 0);
  assert.equal(list.decided[0].result.stage, "active");
  assert.equal(list.decided[0].result.mine?.choice, "no");
  assert.equal(list.decided[0].actionText, "See result");
  const spoken = workerSpokenSummary(state, state.workers.find(w => w.id === "W02")!, "governance", undefined, undefined, id);
  assert.match(spoken, /Now in use/);
  assert.ok(!spoken.includes("not active yet") && !spoken.includes("current minimum is 760"));
  const restored: AppState = JSON.parse(JSON.stringify(state));
  assert.deepEqual(memberBallotList(restored, "W02"), list);
});

function proposal(state: AppState, fields: Partial<PolicyProposal>) {
  return { ...state.proposals[0], ...fields };
}

test("mixed history distinguishes closed, superseded, blocked and not-yet-open proposals without hiding records", () => {
  const state = initialState();
  state.proposals = [
    proposal(state, { id: "closed", status: "rejected", createdAt: "2026-08-01T00:00:00Z" }),
    proposal(state, { id: "later-open", createdAt: "2026-09-03T00:00:00Z" }),
    proposal(state, { id: "earlier-rule", status: "active", activatedAt: "old-activation", createdAt: "2026-08-05T00:00:00Z" }),
    proposal(state, { id: "preparing", status: "simulated", createdAt: "2026-09-04T00:00:00Z" }),
    proposal(state, { id: "unsafe-open", proposedMinimumPayout: 700, createdAt: "2026-09-02T00:00:00Z" }),
  ];
  const before = JSON.stringify(state);
  const list = memberBallotList(state, "W02");
  assert.deepEqual(list.open.map(row => row.proposal.id), ["later-open", "unsafe-open"]);
  assert.equal(list.open[0].actionText, "Read and vote");
  assert.equal(list.open[1].result.stage, "blocked");
  assert.equal(list.open[1].actionText, "See the change");
  assert.deepEqual(list.decided.map(row => row.result.stage), ["superseded", "rejected"]);
  assert.equal(list.upcoming[0].proposal.id, "preparing");
  assert.equal(list.upcoming[0].actionText, "See the change");
  assert.equal(list.open.length + list.decided.length + list.upcoming.length, state.proposals.length);
  assert.equal(JSON.stringify(state), before);
});

test("each listed proposal keeps its own ballot and actual target values", () => {
  const state = initialState();
  const first = state.proposals[0];
  const next = proposal(state, { id: "next-vote", proposedMinimumPayout: 960 });
  state.proposals = [first, next];
  state.votes.push({ proposalId: next.id, memberId: "W02", choice: "no", reason: "Keep discussing" });
  const list = memberBallotList(state, "W02");
  const firstRow = list.open.find(row => row.proposal.id === first.id)!;
  const nextRow = list.open.find(row => row.proposal.id === next.id)!;
  assert.equal(firstRow.result.mine, undefined);
  assert.equal(nextRow.result.mine?.choice, "no");
  assert.match(firstRow.title, /860/);
  assert.match(nextRow.title, /960/);
  const waitOnly = proposal(state, { proposedMinimumPayout: 760, proposedMaxAddedWaitMinutes: 8 });
  assert.match(memberBallotTitle(state, waitOnly), /8 minutes/);
});

test("Listen describes the list or the selected proposal, never an unrelated first ballot", () => {
  const state = initialState();
  const worker = state.workers.find(w => w.id === "W02")!;
  const selected = proposal(state, { id: "selected-vote", proposedMinimumPayout: 960, proposedMaxAddedWaitMinutes: 8 });
  state.proposals.push(selected, proposal(state, { id: "history", status: "rejected" }), proposal(state, { id: "draft", status: "simulated" }));
  for (const locale of ["en", "hi", "mr"] as const) {
    const localized = { ...state, locale };
    const listText = workerSpokenSummary(localized, worker, "governance");
    const detailText = workerSpokenSummary(localized, worker, "governance", undefined, undefined, selected.id);
    assert.match(listText, /2/); assert.match(listText, /1/);
    assert.ok(!listText.includes("860") && !listText.includes("960"));
    assert.match(detailText, /960/); assert.match(detailText, /8/);
    assert.ok(!detailText.includes("860"));
    assert.ok(!/[{}]/.test(listText + detailText));
    if (locale === "en") assert.match(detailText, /does not change who gets jobs or arrival times/);
    else assert.match(listText + detailText, /[ऀ-ॿ]/);
  }
});

test("an empty register has no invented ballots or history", () => {
  const state = initialState(); state.proposals = [];
  assert.deepEqual(memberBallotList(state, "W02"), { open: [], decided: [], upcoming: [] });
});
