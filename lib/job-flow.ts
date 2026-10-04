import type { Job, OtpChallenge } from "./domain.ts";

/**
 * One ordered description of a job, shared by the customer screen, the worker screen
 * and the operations register, so the three never disagree about where a job is or
 * who is holding it up. Nobody should have to guess whose move it is.
 */

export type FlowActor = "customer" | "worker" | "cooperative" | "nobody";
export type FlowViewer = "customer" | "worker" | "admin";

export interface FlowStep {
  id: string;
  /** What a customer calls this step. */
  customerLabel: string;
  /** What a worker calls the same step. */
  workerLabel: string;
  owner: FlowActor;
  state: "done" | "current" | "upcoming" | "stopped";
}

export interface FlowView {
  steps: FlowStep[];
  currentStepId: string;
  /** Who everyone is waiting for right now. */
  waitingOn: FlowActor;
  /** True when the person looking at the screen is the one holding it up. */
  yourMove: boolean;
  /** The single next action for the viewer, or the reason they are waiting. */
  nextStep: string;
  /** What the other side is doing, so waiting never looks like a dead screen. */
  otherSide: string;
  finished: boolean;
  cancelled: boolean;
}

const STEPS: { id: string; customerLabel: string; workerLabel: string; owner: FlowActor }[] = [
  { id: "booked", customerLabel: "Booked", workerLabel: "Job created", owner: "customer" },
  { id: "assigned", customerLabel: "Member assigned", workerLabel: "Offered to you", owner: "cooperative" },
  { id: "accepted", customerLabel: "Member accepted", workerLabel: "You accepted", owner: "worker" },
  { id: "travel", customerLabel: "On the way", workerLabel: "Travel to customer", owner: "worker" },
  { id: "scope", customerLabel: "Scope confirmed", workerLabel: "Scope check on arrival", owner: "customer" },
  { id: "start", customerLabel: "Start confirmed", workerLabel: "Start code verified", owner: "customer" },
  { id: "work", customerLabel: "Work and proof", workerLabel: "Do the work, add proof", owner: "worker" },
  { id: "finish", customerLabel: "Finish confirmed", workerLabel: "Finish code verified", owner: "customer" },
  { id: "paid", customerLabel: "Paid", workerLabel: "Payout posted", owner: "customer" },
];

/** A code that can still be typed in: issued, unexpired, unused, attempts remaining. */
export function otpIsLive(challenge: OtpChallenge | undefined, now = Date.now()): boolean {
  if (!challenge) return false;
  return !challenge.usedAt && challenge.expiresAt > now && challenge.attemptsLeft > 0;
}

/** Issued, but no longer usable — the customer has to issue a fresh one. */
export function otpIsStale(challenge: OtpChallenge | undefined, now = Date.now()): boolean {
  if (!challenge || challenge.usedAt) return false;
  return challenge.expiresAt <= now || challenge.attemptsLeft <= 0;
}

function currentStepId(job: Job, now: number): string {
  switch (job.status) {
    case "requested":
      return "assigned";
    case "assigned":
      return "assigned";
    case "accepted":
      return "travel";
    case "travelling":
      return "travel";
    case "arrived":
      return "scope";
    case "change_pending":
      return "scope";
    case "started":
      return job.evidence.length === 0 || !otpIsLive(job.completionOtp, now) ? "work" : "finish";
    case "completed":
      return "paid";
    case "settled":
      return "paid";
    case "cancelled":
      return "assigned";
    default:
      return "assigned";
  }
}

const ORDER = STEPS.map((step) => step.id);

function stepState(stepId: string, currentId: string, job: Job): FlowStep["state"] {
  if (job.status === "cancelled") {
    const cancelledAt = ORDER.indexOf(currentId);
    const index = ORDER.indexOf(stepId);
    if (index < cancelledAt) return "done";
    return index === cancelledAt ? "stopped" : "upcoming";
  }
  if (job.status === "settled") return "done";
  const index = ORDER.indexOf(stepId);
  const current = ORDER.indexOf(currentId);
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

interface Handoff {
  waitingOn: FlowActor;
  customer: string;
  worker: string;
}

function handoff(job: Job, now: number): Handoff {
  const pendingScope = job.changeOrders.find((change) => change.approved === undefined);
  switch (job.status) {
    case "requested":
      return {
        waitingOn: "cooperative",
        customer: "The cooperative is still finding a certified member who can safely take this job.",
        worker: "This job is back in dispatch and has not been offered to you.",
      };
    case "assigned":
      return {
        waitingOn: "worker",
        customer: "Your assigned member is reviewing the job and the protected payout before accepting.",
        worker: "Accept this job, or safely decline it — declining costs you nothing.",
      };
    case "accepted":
      return {
        waitingOn: "worker",
        customer: "Your member has accepted and will set off shortly.",
        worker: "Start travel when you are on your way.",
      };
    case "travelling":
      return {
        waitingOn: "worker",
        customer: "Your member is on the way. Follow the route on the map.",
        worker: "Mark yourself arrived once you reach the customer.",
      };
    case "change_pending":
      return {
        waitingOn: "customer",
        customer: `Approve or decline the extra work the member has asked for${pendingScope ? ` (+₹${pendingScope.amountDelta})` : ""}. Work stays stopped until you decide.`,
        worker: "The customer is deciding on the extra work. Do not start it yet.",
      };
    case "arrived":
      if (otpIsLive(job.startOtp, now))
        return {
          waitingOn: "worker",
          customer: "Read your start code out to the member so they can begin.",
          worker: "Ask the customer for their start code and enter it to begin work.",
        };
      if (otpIsStale(job.startOtp, now))
        return {
          waitingOn: "customer",
          customer: "That start code is no longer valid. Issue a fresh one when you are ready.",
          worker: "The last start code expired. Ask the customer to issue a new one.",
        };
      return {
        waitingOn: "customer",
        customer: "Your member has arrived. Check the agreed work, then issue the start code.",
        worker: "Confirm the work with the customer, then wait for their start code.",
      };
    case "started":
      if (job.evidence.length === 0)
        return {
          waitingOn: "worker",
          customer: "Work is under way. Your member will add before and after proof.",
          worker: "Do the agreed work, then add your work proof.",
        };
      if (otpIsLive(job.completionOtp, now))
        return {
          waitingOn: "worker",
          customer: "Read your finish code out to the member to close the job.",
          worker: "Ask the customer for their finish code and enter it.",
        };
      if (otpIsStale(job.completionOtp, now))
        return {
          waitingOn: "customer",
          customer: "That finish code is no longer valid. Issue a fresh one.",
          worker: "The last finish code expired. Ask the customer to issue a new one.",
        };
      return {
        waitingOn: "customer",
        customer: "Review the work proof. If you are happy, issue the finish code.",
        worker: "Proof sent. Waiting for the customer to review it and issue the finish code.",
      };
    case "completed":
      return {
        waitingOn: "customer",
        customer: "The work is done. Pay the invoice to close the job.",
        worker: "Work confirmed. The customer is paying; your protected payout posts on settlement.",
      };
    case "settled":
      return {
        waitingOn: "nobody",
        customer: "Paid and closed. Rating this job is optional and never used to punish a member.",
        worker: "Paid. Your protected payout is posted in your earnings.",
      };
    case "cancelled":
      return {
        waitingOn: "nobody",
        customer: "This booking was cancelled. Any protected payout owed to the member was recorded.",
        worker: "This job was cancelled. Any protected payout owed to you was recorded.",
      };
    default:
      return { waitingOn: "nobody", customer: "", worker: "" };
  }
}

export function jobFlow(job: Job, viewer: FlowViewer, now = Date.now()): FlowView {
  const currentId = currentStepId(job, now);
  const moves = handoff(job, now);
  const yourMove =
    (viewer === "customer" && moves.waitingOn === "customer") ||
    (viewer === "worker" && moves.waitingOn === "worker");
  return {
    steps: STEPS.map((step) => ({ ...step, state: stepState(step.id, currentId, job) })),
    currentStepId: currentId,
    waitingOn: moves.waitingOn,
    yourMove,
    nextStep: viewer === "worker" ? moves.worker : moves.customer,
    otherSide: viewer === "worker" ? moves.customer : moves.worker,
    finished: job.status === "settled",
    cancelled: job.status === "cancelled",
  };
}

export function waitingOnLabel(actor: FlowActor): string {
  if (actor === "customer") return "Waiting on the customer";
  if (actor === "worker") return "Waiting on the member";
  if (actor === "cooperative") return "Waiting on the cooperative";
  return "Nothing to do";
}
