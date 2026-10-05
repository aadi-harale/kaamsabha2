"use client";

import type { AppState, PolicyProposal, Worker } from "@/lib/domain";
import { memberBallotOutcome, memberBallotResultText } from "@/lib/ballot-outcome";
import { BALLOT_REQUIREMENTS } from "@/lib/governance-sim";
import { workerText } from "@/lib/worker-copy";

export function WorkerVoteOutcome({ state, proposal, worker }: { state: AppState; proposal: PolicyProposal; worker: Worker }) {
  const result = memberBallotOutcome(state, proposal, worker.id);
  const locale = state.locale;
  return <section className="workerVoteOutcome" aria-labelledby={`vote-result-${proposal.id}`}>
    <div role="status" aria-atomic="true">
      <h3 id={`vote-result-${proposal.id}`}>{workerText(locale, "ballotResultHeading")}</h3>
      {result.mine && <p className="workerSavedVote"><strong>{workerText(locale, "voteRecorded")}: {workerText(locale, result.mine.choice)}</strong></p>}
      <p className="workerVoteMeaning">{memberBallotResultText(state, proposal, worker.id)}</p>
    </div>
    <dl className="workerVoteCounts">
      <div><dt>{workerText(locale, "ballotMembers")}</dt><dd>{result.participants}</dd></div>
      <div><dt>{workerText(locale, "ballotYes")}</dt><dd>{result.yes}</dd></div>
      <div><dt>{workerText(locale, "ballotNo")}</dt><dd>{result.no}</dd></div>
    </dl>
    {(result.stage === "waiting" || result.stage === "ready" || result.stage === "blocked") && <>
      <p className="workerDemoNote">{workerText(locale, "ballotRequirements", BALLOT_REQUIREMENTS)}</p>
      {result.stage === "waiting" && <ul className="workerVotesNeeded">
        {result.participantsNeeded > 0 && <li>{workerText(locale, "ballotNeedMembers", { count: result.participantsNeeded })}</li>}
        {result.supportNeeded > 0 && <li>{workerText(locale, "ballotNeedYes", { count: result.supportNeeded })}</li>}
      </ul>}
    </>}
    {result.mine?.reason && <p className="workerNote"><b>{workerText(locale, "ballotYourReason")}: </b>{result.mine.reason}</p>}
    {result.newJob && <p className="workerRuleProof">{workerText(locale, "newJobProof", { job: result.newJob.id, rule: state.policy.version, amount: state.policy.minimumPayout })}</p>}
    {result.stage === "active" && <p className="workerDemoNote">{workerText(locale, "olderRecordsUnchanged")}</p>}
  </section>;
}
