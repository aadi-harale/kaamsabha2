import type { AppState, Worker } from "./domain.ts";
import { workerDailyLimit } from "./domain.ts";
import { memberBallotOutcome } from "./ballot-outcome.ts";

export function memberCapacityStatus(worker: Worker) {
  if (!worker.verified) return "Certification needed";
  if (!worker.active) return "Inactive";
  if (!worker.available) return "Unavailable";
  if (worker.workloadTodayMinutes >= workerDailyLimit(worker)) return "At work limit";
  return "Safe capacity";
}

/** Counts refer to the local job register, never synthetic demand or sample earnings. */
export function adminOverview(state: AppState) {
  const activeJobs = state.jobs.filter(job => !["settled", "cancelled"].includes(job.status));
  return {
    bookings: state.jobs.length, activeJobs: activeJobs.length,
    waitingJobs: activeJobs.filter(job => job.status === "requested" && job.handoverHistory?.at(-1)?.status !== "awaiting-customer").length,
    replacementApprovals: activeJobs.filter(job => job.status === "requested" && job.handoverHistory?.at(-1)?.status === "awaiting-customer").length,
    served: state.jobs.filter(job => ["completed", "settled"].includes(job.status)).length,
    verified: state.workers.filter(worker => worker.verified).length,
    safe: state.workers.filter(worker => memberCapacityStatus(worker) === "Safe capacity").length,
    covered: new Set(state.receipts.filter(receipt => state.jobs.some(job => job.id === receipt.jobId)).map(receipt => receipt.workerId)).size,
    cases: state.issues.filter(issue => issue.status !== "closed").length,
    replays: state.challenges.filter(challenge => challenge.status !== "closed").length,
    suggestions: state.suggestions.filter(suggestion => ["submitted", "under-review"].includes(suggestion.status)).length,
    readyProposals: state.proposals.filter(proposal => memberBallotOutcome(state, proposal, "").stage === "ready").length,
    transfers: state.federation.opportunities.filter(opportunity => opportunity.status === "open").length,
    unfilledTransfers: state.federation.opportunities.filter(opportunity => opportunity.status === "unfilled").length,
    paid: state.settlements.reduce((sum, settlement) => sum + settlement.workerPayout, 0),
    cancellationPay: state.cancellations.reduce((sum, cancellation) => sum + cancellation.workerPayout, 0),
    fees: state.settlements.reduce((sum, settlement) => sum + settlement.platformFee, 0),
  };
}
