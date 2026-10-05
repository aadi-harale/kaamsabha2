"use client";

import type { AppState, PolicyProposal, Worker } from "@/lib/domain";
import { memberBallotOutcome, memberBallotResultText } from "@/lib/ballot-outcome";
import { workerText } from "@/lib/worker-copy";

export function WorkerVoteOutcome({ state, proposal, worker }: { state: AppState; proposal: PolicyProposal; worker: Worker }) {
  const result = memberBallotOutcome(state, proposal, worker.id);
  const locale = state.locale;
  return <section className="workerVoteOutcome" aria-labelledby={`vote-result-${proposal.id}`}>
    <div role="status" aria-atomic="true">
      <h3 id={`vote-result-${proposal.id}`}>{workerText(locale, "ballotResultHeading")}</h3>
      {result.mine && <p className="workerSavedVote"><strong>{workerText(locale, result.mine.choice === "yes" ? "simpleMyYes" : "simpleMyNo")}</strong></p>}
      <p className="workerVoteMeaning">{memberBallotResultText(state, proposal, worker.id)}</p>
    </div>
    <p className="workerVoteMembers">{workerText(locale, "simpleVotedCount", { count: result.participants })}</p>
    <dl className="workerVoteCounts">
      <div><dt>{workerText(locale, "ballotYes")}</dt><dd>{result.yes}</dd></div>
      <div><dt>{workerText(locale, "ballotNo")}</dt><dd>{result.no}</dd></div>
    </dl>
    {result.stage === "waiting" && <div className="workerVotesNeeded">
      {result.participantsNeeded > 0 && <p>{workerText(locale, result.participantsNeeded === 1 ? "simpleOneMemberNeeded" : "simpleMembersNeeded", { count: result.participantsNeeded })}</p>}
      {result.supportNeeded > 0 && <p>{workerText(locale, result.supportNeeded === 1 ? "simpleOneYesNeeded" : "simpleYesNeeded", { count: result.supportNeeded })}</p>}
    </div>}
    {result.mine?.reason && <p className="workerNote"><b>{workerText(locale, "ballotYourReason")}: </b>{result.mine.reason}</p>}
    {result.newJob && <p className="workerRuleProof">{workerText(locale, "simpleNewJobPay", { amount: result.newJob.amount })}<small>{result.newJob.id}</small></p>}
  </section>;
}
