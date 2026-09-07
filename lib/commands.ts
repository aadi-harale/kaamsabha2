import { AppState, DecisionReceipt, Job, Role, selectWorker } from "./domain";

function nextRevision(state: AppState): AppState { return { ...state, revision: state.revision + 1 }; }
function id(prefix: string, revision: number) { return `${prefix}-${String(revision + 1).padStart(5, "0")}`; }

export function signIn(state: AppState, userId: string, role: Role): AppState {
  if (!userId.trim()) throw new Error("User ID is required");
  if (role === "worker" && !state.workers.some((w) => w.id === userId || w.name.toLowerCase().includes(userId.toLowerCase()))) throw new Error("Worker account is not linked to a verified member");
  return nextRevision({ ...state, session: { userId: userId.trim(), role } });
}

export function signOut(state: AppState): AppState { return nextRevision({ ...state, session: null }); }

export function createBooking(state: AppState, input: { customerId: string; service: string; locality: string; scheduledAt: string; emergency?: boolean; amount?: number }): AppState {
  if (state.session?.role !== "customer") throw new Error("Customer session required");
  const worker = selectWorker(state, input.service);
  const jobId = id("KMS", state.revision);
  const receiptId = `${jobId}-receipt`;
  const amount = Math.max(input.amount ?? state.policy.minimumPayout, state.policy.minimumPayout);
  const job: Job = {
    id: jobId, customerId: input.customerId, service: input.service, locality: input.locality, scheduledAt: input.scheduledAt,
    emergency: Boolean(input.emergency), status: worker ? "assigned" : "requested", workerId: worker?.id, cooperativeId: worker?.cooperativeId,
    receiptId: worker ? receiptId : undefined, amount, evidence: [], changeOrders: []
  };
  const receipt: DecisionReceipt | undefined = worker ? {
    id: receiptId, jobId, policyVersion: state.policy.version, workerId: worker.id, cooperativeId: worker.cooperativeId,
    hardChecks: { verified: worker.verified, active: worker.active, available: worker.available, skill: worker.skills.includes(input.service), workloadSafe: worker.workloadTodayMinutes < 480 },
    protectedPayout: amount, estimatedCost: 87, estimatedNet: amount - 87,
    reason: "Hard eligibility passed; lower safe workload wins; worker ID is the stable final tie-break.", createdAt: new Date().toISOString()
  } : undefined;
  return nextRevision({ ...state, jobs: [job, ...state.jobs], receipts: receipt ? [receipt, ...state.receipts] : state.receipts });
}

export function transitionJob(state: AppState, jobId: string, next: Job["status"]): AppState {
  const allowed: Record<Job["status"], Job["status"][]> = {
    requested: ["assigned", "cancelled"], assigned: ["accepted", "cancelled"], accepted: ["travelling", "cancelled"], travelling: ["arrived"], arrived: ["started"],
    started: ["change_pending", "completed"], change_pending: ["started", "completed"], completed: ["settled"], settled: [], cancelled: []
  };
  const job = state.jobs.find((j) => j.id === jobId);
  if (!job) throw new Error("Job not found");
  if (!allowed[job.status].includes(next)) throw new Error(`Invalid transition ${job.status} → ${next}`);
  return nextRevision({ ...state, jobs: state.jobs.map((j) => j.id === jobId ? { ...j, status: next } : j) });
}

export function openIssue(state: AppState, openedBy: string, category: string, jobId?: string): AppState {
  const issue = { id: id("ISS", state.revision), jobId, openedBy, category, status: "open" as const, notes: [] as string[] };
  return nextRevision({ ...state, issues: [issue, ...state.issues] });
}

export function castVote(state: AppState, proposalId: string, memberId: string, choice: "yes" | "no"): AppState {
  if (state.votes.some((v) => v.proposalId === proposalId && v.memberId === memberId)) throw new Error("One member can vote only once on a proposal");
  return nextRevision({ ...state, votes: [...state.votes, { proposalId, memberId, choice }] });
}
