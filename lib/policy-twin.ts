import type { AppState, DecisionReceipt, PolicyProposal, Worker } from "./domain.ts";
import { selectWorkerInCooperative } from "./domain.ts";
import { protectedJobPay } from "./protected-pay.ts";

export interface PolicyTwinRow {
  jobId: string; receiptId: string; workerId: string; cooperativeId: string; service: string;
  currentPay: number; proposedPay: number;
}

/** A pay-floor counterfactual on each job's latest frozen dispatch, not an earnings forecast. */
export function comparePolicyProposal(state: AppState, proposal: PolicyProposal) {
  const historical = proposal.status === "active" || proposal.status === "rejected";
  const before = { floor: historical ? proposal.simulation.currentFloor : state.policy.minimumPayout,
    wait: historical ? proposal.simulation.currentMaxWait : state.policy.maxAddedWaitMinutes };
  const after = { floor: proposal.proposedMinimumPayout, wait: proposal.proposedMaxAddedWaitMinutes };
  const rows: PolicyTwinRow[] = [];
  const excluded: { jobId: string; cooperativeId?: string }[] = [];
  for (const job of state.jobs) {
    const receipt = state.receipts.find(r => r.id === job.receiptId && r.jobId === job.id);
    if (!receipt?.candidateSnapshot?.length) {
      excluded.push({ jobId: job.id, cooperativeId: job.cooperativeId }); continue;
    }
    const baseline = frozenSelection(state, receipt, job.service, job.declinedWorkerIds ?? [], before.floor, before.wait);
    const proposed = frozenSelection(state, receipt, job.service, job.declinedWorkerIds ?? [], after.floor, after.wait);
    // Incomplete or inconsistent records are not turned into invented worker outcomes.
    if (!baseline || baseline.id !== receipt.workerId || proposed?.id !== baseline.id) {
      excluded.push({ jobId: job.id, cooperativeId: receipt.cooperativeId }); continue;
    }
    rows.push({ jobId: job.id, receiptId: receipt.id, workerId: baseline.id, cooperativeId: receipt.cooperativeId,
      service: job.service, currentPay: protectedJobPay(receipt.protectedPayout, before.floor),
      proposedPay: protectedJobPay(receipt.protectedPayout, after.floor) });
  }
  return { before, after, rows, excluded };
}

function frozenSelection(state: AppState, receipt: DecisionReceipt, service: string, excluded: string[], floor: number, wait: number) {
  const workers: Worker[] = receipt.candidateSnapshot!.map(candidate => ({
    id: candidate.workerId, name: state.workers.find(w => w.id === candidate.workerId)?.name ?? candidate.workerId,
    cooperativeId: receipt.cooperativeId, skills: candidate.skill ? [service] : [],
    verified: candidate.verified, active: candidate.active, available: candidate.available,
    workloadTodayMinutes: candidate.workloadTodayMinutes, maxDailyMinutes: candidate.maxDailyMinutes,
    radiusKm: 0, rating: 0,
  }));
  // Invoke the application's selector on the identical frozen member facts under both policies.
  // The wait variable is stored but is not an ETA input in this application's selector.
  return selectWorkerInCooperative({ ...state, workers, policy: { ...state.policy, minimumPayout: floor, maxAddedWaitMinutes: wait } }, receipt.cooperativeId, service, excluded);
}

export function memberPolicyTwin(state: AppState, proposal: PolicyProposal, worker: Worker) {
  const comparison = comparePolicyProposal(state, proposal);
  const cooperative = comparison.rows.filter(r => r.cooperativeId === worker.cooperativeId);
  const mine = cooperative.filter(r => r.workerId === worker.id);
  const total = (rows: PolicyTwinRow[], field: "currentPay" | "proposedPay") => rows.reduce((sum, row) => sum + row[field], 0);
  return { ...comparison, cooperative, mine, myCurrent: total(mine, "currentPay"), myProposed: total(mine, "proposedPay"),
    cooperativeCurrent: total(cooperative, "currentPay"), cooperativeProposed: total(cooperative, "proposedPay"),
    changedJobs: cooperative.filter(r => r.currentPay !== r.proposedPay).length,
    excludedCount: comparison.excluded.filter(r => r.cooperativeId === worker.cooperativeId).length };
}
