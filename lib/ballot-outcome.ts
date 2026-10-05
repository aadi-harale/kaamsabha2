import type { AppState, PolicyProposal } from "./domain.ts";
import { validatePolicyChange } from "./commands.ts";
import { BALLOT_REQUIREMENTS } from "./governance-sim.ts";
import { workerText, type WorkerCopyKey } from "./worker-copy.ts";

export type BallotStage = "waiting" | "ready" | "blocked" | "active" | "superseded" | "rejected" | "simulated";

/** The saved ballot result, kept distinct from activation and from a worker's earnings. */
export function memberBallotOutcome(state: AppState, proposal: PolicyProposal, workerId: string) {
  const votes = state.votes.filter(v => v.proposalId === proposal.id);
  const yes = votes.filter(v => v.choice === "yes").length;
  const no = votes.filter(v => v.choice === "no").length;
  const participantsNeeded = Math.max(0, BALLOT_REQUIREMENTS.participants - votes.length);
  const supportNeeded = Math.max(0, BALLOT_REQUIREMENTS.support - yes);
  const inUse = proposal.status === "active" && !!proposal.activatedAt
    && proposal.activatedAt === state.policy.activeFrom
    && proposal.proposedMinimumPayout === state.policy.minimumPayout
    && proposal.proposedMaxAddedWaitMinutes === state.policy.maxAddedWaitMinutes;
  const valid = validatePolicyChange(state, {
    minimumPayout: proposal.proposedMinimumPayout, maxAddedWaitMinutes: proposal.proposedMaxAddedWaitMinutes,
  }).valid;
  const stage: BallotStage = proposal.status === "active" ? inUse ? "active" : "superseded"
    : proposal.status === "rejected" ? "rejected" : proposal.status === "simulated" ? "simulated"
    : !valid ? "blocked" : participantsNeeded || supportNeeded ? "waiting" : "ready";
  const newJob = inUse ? state.jobs.find(job => job.workerId === workerId && state.receipts.some(receipt =>
    receipt.id === job.receiptId && receipt.jobId === job.id && receipt.workerId === workerId
    && receipt.policyVersion === state.policy.version && receipt.protectionFloor === state.policy.minimumPayout)) : undefined;
  return { stage, participants: votes.length, yes, no, participantsNeeded, supportNeeded,
    mine: votes.find(v => v.memberId === workerId), newJob };
}

const stageKeys: Record<BallotStage, WorkerCopyKey> = {
  waiting: "ballotWaiting", ready: "ballotReady", blocked: "ballotBlocked", active: "ballotActive",
  superseded: "ballotSuperseded", rejected: "ballotRejected", simulated: "ballotSimulated",
};

export function memberBallotResultText(state: AppState, proposal: PolicyProposal, workerId: string) {
  const result = memberBallotOutcome(state, proposal, workerId);
  return workerText(state.locale, stageKeys[result.stage], { amount: state.policy.minimumPayout,
    before: proposal.simulation.currentFloor, after: proposal.proposedMinimumPayout });
}

export function memberBallotTitle(state: AppState, proposal: PolicyProposal) {
  if (proposal.proposedMinimumPayout !== proposal.simulation.currentFloor) {
    return workerText(state.locale, "voteListPayTitle", { amount: proposal.proposedMinimumPayout.toLocaleString("en-IN") });
  }
  if (proposal.proposedMaxAddedWaitMinutes !== proposal.simulation.currentMaxWait) {
    return workerText(state.locale, "voteListWaitTitle", { minutes: proposal.proposedMaxAddedWaitMinutes });
  }
  return proposal.title;
}

const listStageKeys: Record<BallotStage, WorkerCopyKey> = {
  waiting: "voteListWaiting", ready: "voteListReady", blocked: "voteListBlocked", active: "voteListActive",
  superseded: "voteListEarlier", rejected: "voteListRejected", simulated: "voteListUpcoming",
};

/** A saved member vote or a met threshold never moves a still-open proposal into history. */
export function memberBallotList(state: AppState, workerId: string) {
  const rows = [...state.proposals].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).map(proposal => {
    const result = memberBallotOutcome(state, proposal, workerId);
    const group = proposal.status === "voting" ? "open" as const
      : proposal.status === "simulated" ? "upcoming" as const : "decided" as const;
    const actionKey = group === "decided" ? "voteListResult" : group === "upcoming" || result.stage === "blocked" ? "voteListChange"
      : result.mine ? "voteListUpdate" : "voteListRead";
    return { proposal, result, group, title: memberBallotTitle(state, proposal),
      statusText: workerText(state.locale, listStageKeys[result.stage]), actionText: workerText(state.locale, actionKey) };
  });
  return { open: rows.filter(row => row.group === "open"), decided: rows.filter(row => row.group === "decided"),
    upcoming: rows.filter(row => row.group === "upcoming") };
}
