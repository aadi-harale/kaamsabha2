import type { Job, Locale, OtpChallenge } from "./domain.ts";
import { t } from "./messages.ts";

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

const STEP_IDS = ["booked", "assigned", "accepted", "travel", "scope", "start", "work", "finish", "paid"] as const;
const STEP_OWNERS: Record<(typeof STEP_IDS)[number], FlowActor> = {
  booked: "customer", assigned: "cooperative", accepted: "worker", travel: "worker",
  scope: "customer", start: "customer", work: "worker", finish: "customer", paid: "customer",
};

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

const ORDER: readonly string[] = STEP_IDS;

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
  /** Message key stem; `.customer` and `.worker` are appended. */
  key: string;
  params?: Record<string, string | number>;
}

function handoff(job: Job, now: number): Handoff {
  const pendingScope = job.changeOrders.find((change) => change.approved === undefined);
  switch (job.status) {
    case "requested":
      return { waitingOn: "cooperative", key: "flow.requested" };
    case "assigned":
      return { waitingOn: "worker", key: "flow.assigned" };
    case "accepted":
      return { waitingOn: "worker", key: "flow.accepted" };
    case "travelling":
      return { waitingOn: "worker", key: "flow.travelling" };
    case "change_pending":
      return {
        waitingOn: "customer",
        key: "flow.change",
        params: { amount: pendingScope?.amountDelta ?? 0 },
      };
    case "arrived":
      if (otpIsLive(job.startOtp, now)) return { waitingOn: "worker", key: "flow.startLive" };
      if (otpIsStale(job.startOtp, now)) return { waitingOn: "customer", key: "flow.startStale" };
      return { waitingOn: "customer", key: "flow.arrived" };
    case "started":
      if (job.evidence.length === 0) return { waitingOn: "worker", key: "flow.working" };
      if (otpIsLive(job.completionOtp, now)) return { waitingOn: "worker", key: "flow.finishLive" };
      if (otpIsStale(job.completionOtp, now)) return { waitingOn: "customer", key: "flow.finishStale" };
      return { waitingOn: "customer", key: "flow.proofed" };
    case "completed":
      return { waitingOn: "customer", key: "flow.completed" };
    case "settled":
      return { waitingOn: "nobody", key: "flow.settled" };
    case "cancelled":
      return { waitingOn: "nobody", key: "flow.cancelled" };
    default:
      return { waitingOn: "nobody", key: "flow.requested" };
  }
}

export function jobFlow(
  job: Job,
  viewer: FlowViewer,
  now = Date.now(),
  locale: Locale = "en",
): FlowView {
  const currentId = currentStepId(job, now);
  const moves = handoff(job, now);
  const yourMove =
    (viewer === "customer" && moves.waitingOn === "customer") ||
    (viewer === "worker" && moves.waitingOn === "worker");
  // Each side reads the same step in its own vocabulary and its own language.
  const say = (side: "customer" | "worker") =>
    t(locale, `${moves.key}.${side}` as never, moves.params ?? {});
  return {
    steps: STEP_IDS.map((id) => ({
      id,
      customerLabel: t(locale, `step.${id}.customer` as never),
      workerLabel: t(locale, `step.${id}.worker` as never),
      owner: STEP_OWNERS[id],
      state: stepState(id, currentId, job),
    })),
    currentStepId: currentId,
    waitingOn: moves.waitingOn,
    yourMove,
    nextStep: viewer === "worker" ? say("worker") : say("customer"),
    otherSide: viewer === "worker" ? say("customer") : say("worker"),
    finished: job.status === "settled",
    cancelled: job.status === "cancelled",
  };
}

export function waitingOnLabel(actor: FlowActor, locale: Locale = "en"): string {
  return t(locale, `waiting.${actor}` as never);
}
