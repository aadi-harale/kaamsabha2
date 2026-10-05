"use client";

import type { AppState, Worker } from "@/lib/domain";
import { activeMemberChange } from "@/lib/worker-guidance";
import { workerText } from "@/lib/worker-copy";

export function WorkerRuleChange({ state, worker, onSeeVotes }: { state: AppState; worker: Worker; onSeeVotes?: () => void }) {
  const change = activeMemberChange(state, worker.id);
  if (!change) return null;
  const { proposal, mine, newJob } = change;
  const locale = state.locale;
  return <section className="workerRuleChange">
    <h2>{workerText(locale, mine?.choice === "yes" ? "yourVoteChanged" : "membersChanged")}</h2>
    <p>{workerText(locale, "approvedPayChange", { before: proposal.simulation.currentFloor, after: state.policy.minimumPayout })}</p>
    <p>{workerText(locale, "ruleSupport", { count: change.participants, yes: change.support })}</p>
    {mine && <p>{workerText(locale, "voteRecorded")}: <b>{workerText(locale, mine.choice)}</b></p>}
    <p className="workerDemoNote">{workerText(locale, "olderRecordsUnchanged")}</p>
    {newJob ? <p className="workerRuleProof">{workerText(locale, "newJobProof", { job: newJob.id, rule: state.policy.version, amount: state.policy.minimumPayout })}</p>
      : <p className="workerRuleProof">{workerText(locale, "nextJobRule", { amount: state.policy.minimumPayout })}</p>}
    {onSeeVotes && <button type="button" className="secondary" onClick={onSeeVotes}>{workerText(locale, "seeVote")}</button>}
  </section>;
}
