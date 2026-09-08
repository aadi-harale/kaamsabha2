import type { AppState } from "./domain.ts";

function nextRevision(state: AppState): AppState {
  return { ...state, revision: state.revision + 1 };
}

function jobById(state: AppState, jobId: string) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) throw new Error("Job not found");
  return job;
}

function replaceJob(state: AppState, nextJob: AppState["jobs"][number]) {
  return state.jobs.map((job) => (job.id === nextJob.id ? nextJob : job));
}

function changeId(state: AppState) {
  return `CHG-${String(state.revision + 1).padStart(5, "0")}`;
}

export function proposePreStartScopeChange(
  state: AppState,
  jobId: string,
  description: string,
  amountDelta: number,
): AppState {
  if (state.session?.role !== "worker") throw new Error("Worker session required");
  const job = jobById(state, jobId);
  if (job.workerId !== state.session.userId) throw new Error("Only the assigned worker can propose a scope addition");
  if (job.status !== "arrived") throw new Error("Additional scope must be agreed after arrival and before work starts");
  if (job.changeOrders.some((change) => change.approved === undefined)) throw new Error("Resolve the current scope addition first");

  const clean = description.trim();
  if (clean.length < 5) throw new Error("Describe the additional work clearly");
  if (!Number.isFinite(amountDelta) || amountDelta < 0) throw new Error("Additional amount must be zero or positive");

  const change = {
    id: changeId(state),
    description: clean,
    amountDelta: Math.round(amountDelta),
    requestedBy: state.session.userId,
  };

  return nextRevision({
    ...state,
    jobs: replaceJob(state, {
      ...job,
      status: "change_pending",
      startOtp: undefined,
      changeOrders: [...job.changeOrders, change],
    }),
  });
}

export function decidePreStartScopeChange(
  state: AppState,
  jobId: string,
  changeIdValue: string,
  approved: boolean,
): AppState {
  if (state.session?.role !== "customer") throw new Error("Customer session required");
  const job = jobById(state, jobId);
  if (job.customerId !== state.session.userId) throw new Error("Only the booking customer can approve scope changes");
  if (job.status !== "change_pending") throw new Error("No pre-start scope addition is waiting for approval");

  const pending = job.changeOrders.find((change) => change.id === changeIdValue && change.approved === undefined);
  if (!pending) throw new Error("Pending scope addition not found");

  const changeOrders = job.changeOrders.map((change) =>
    change.id === changeIdValue
      ? { ...change, approved, decidedAt: new Date().toISOString() }
      : change,
  );
  const amount = approved
    ? Math.max(state.policy.minimumPayout, job.amount + pending.amountDelta)
    : job.amount;

  return nextRevision({
    ...state,
    jobs: replaceJob(state, {
      ...job,
      status: "arrived",
      startOtp: undefined,
      changeOrders,
      amount,
    }),
  });
}
