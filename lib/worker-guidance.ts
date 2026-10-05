import type { AppState, Challenge, Job, Worker } from "./domain.ts";
import { summarizeWorkerEarnings } from "./earnings.ts";
import { jobFlow, otpIsLive } from "./job-flow.ts";
import { workerService, workerText } from "./worker-copy.ts";
import { memberPolicyTwin } from "./policy-twin.ts";
import { memberBallotOutcome, memberBallotResultText } from "./ballot-outcome.ts";

export type WorkerAction = "accept" | "travel" | "arrive" | "start-code" | "proof" | "finish-code" | "wait";

export function workerChallengeProgress(challenge: Challenge) {
  // Opening a case stores a capture summary; that is not evidence of a replay.
  const checked = !!(challenge.replayedAt || challenge.replayResult
    || (challenge.status !== "open" && challenge.replaySummary));
  const answered = ["confirmed", "violation", "remedied", "closed", "upheld", "dismissed"].includes(challenge.status);
  return { checked, answered };
}

/** Presentation of the existing lifecycle; issuing a code remains the customer's action. */
export function workerNextAction(job: Job, now = Date.now()): WorkerAction {
  if (job.status === "assigned") return "accept";
  if (job.status === "accepted") return "travel";
  if (job.status === "travelling") return "arrive";
  if (job.status === "arrived" && !job.changeOrders.some(c => c.approved === undefined) && otpIsLive(job.startOtp, now)) return "start-code";
  if (job.status === "started") {
    if (!job.evidence.length) return "proof";
    if (otpIsLive(job.completionOtp, now)) return "finish-code";
  }
  return "wait";
}

export function chooseWorkerVoice<T extends { lang: string; localService: boolean }>(voices: T[], locale: string): T | undefined {
  const matches = voices.filter(v => v.lang.toLowerCase().split(/[-_]/)[0] === locale);
  return matches.find(v => v.localService) || matches[0];
}

export function activeMemberChange(state: AppState, workerId: string) {
  const proposal = state.proposals.find(p => p.status === "active" && p.activatedAt === state.policy.activeFrom
    && p.proposedMinimumPayout === state.policy.minimumPayout
    && p.proposedMaxAddedWaitMinutes === state.policy.maxAddedWaitMinutes);
  if (!proposal) return null;
  const votes = state.votes.filter(v => v.proposalId === proposal.id);
  const newJob = state.jobs.find(job => job.workerId === workerId && state.receipts.some(receipt =>
    receipt.id === job.receiptId && receipt.policyVersion === state.policy.version
    && receipt.protectionFloor === state.policy.minimumPayout));
  return { proposal, participants: votes.length, support: votes.filter(v => v.choice === "yes").length,
    mine: votes.find(v => v.memberId === workerId), newJob };
}

/** Authored summaries use the same register as the screen. Codes and other members' notes are never read. */
export function workerSpokenSummary(state: AppState, worker: Worker, tab: string, job?: Job, now = Date.now()) {
  const locale = state.locale;
  const earnings = summarizeWorkerEarnings(state, worker.id);
  const name = locale === "en" ? worker.name : worker.nameDevanagari || worker.name;
  const money = workerText(locale, "spokenMoney", { name, amount: earnings.total.toLocaleString("en-IN") });
  if (tab === "home") {
    const next = job ? `${workerText(locale, "spokenJob", { service: workerService(locale, job.service), amount: job.amount })} ${jobFlow(job, "worker", now, locale).nextStep}`
      : workerText(locale, worker.available ? "queueReady" : "queuePaused");
    return `${money} ${next}`;
  }
  if (tab === "earnings") {
    const pending = state.jobs.filter(j => j.workerId === worker.id && j.status === "completed"
      && !state.settlements.some(s => s.jobId === j.id));
    return `${money} ${workerText(locale, "spokenPayments", { count: earnings.completedJobs, protection: earnings.cancellationProtection, pending: pending.reduce((sum, j) => sum + j.amount, 0) })}`;
  }
  if (tab === "governance") {
    const proposal = state.proposals.find(p => p.status === "voting") ?? state.proposals[0];
    if (proposal) {
      const result = memberBallotOutcome(state, proposal, worker.id);
      const ownVote = result.mine ? `${workerText(locale, "voteRecorded")}: ${workerText(locale, result.mine.choice)}.` : "";
      const count = workerText(locale, "voteResult", { count: result.participants, yes: result.yes, no: result.no });
      const outcome = `${ownVote} ${count} ${memberBallotResultText(state, proposal, worker.id)}`.trim();
      if (proposal.status !== "voting") return outcome;
      const twin = memberPolicyTwin(state, proposal, worker);
      const impact = twin.mine.length ? workerText(locale, "twinSpokenImpact", { count: twin.mine.length, before: twin.myCurrent, after: twin.myProposed }) : workerText(locale, "twinNoOwnJobs");
      return `${workerText(locale, "spokenProposal", { before: twin.before.floor, after: twin.after.floor })} ${impact} ${outcome} ${workerText(locale, "twinSameOrder")}`;
    }
    return workerText(locale, "noVote");
  }
  if (tab === "fair") {
    const checks = state.challenges.filter(c => c.workerId === worker.id);
    return `${workerText(locale, "fairIntro")} ${workerText(locale, "spokenChecks", { count: checks.length })} ${checks[0]?.adminNote || ""}`.trim();
  }
  if (tab === "issues") return `${workerText(locale, "helpIntro")} ${workerText(locale, "spokenRequests", { count: state.issues.filter(i => i.openedBy === worker.id && i.status !== "closed").length })}`;
  return `${workerText(locale, "ideasIntro")} ${workerText(locale, "ideaProcess")}`;
}
