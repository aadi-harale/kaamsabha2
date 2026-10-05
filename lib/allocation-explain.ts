import type { AppState, DecisionCandidateSnapshot, DecisionReceipt, Job, Locale, Worker } from "./domain.ts";
import { t } from "./messages.ts";

/**
 * Why a member did or did not get a job.
 *
 * Every answer is reconstructed from the FROZEN decision receipt, never from today's
 * register. A member who asks "why not me?" next week must get the same answer the
 * dispatcher gave at the moment of the decision, which is also what Replay Court
 * reproduces. Nothing here ranks, scores or penalises anybody.
 */

export type AllocationOutcome =
  | "selected"
  | "safely-declined"
  | "passed-over"
  | "blocked-by-protection"
  | "not-certified"
  | "other-cooperative"
  | "cooperative-had-no-safe-capacity"
  | "not-recorded";

export interface FairOrderRow {
  workerId: string;
  /** The member's name. Nobody should be shown an internal code about their own livelihood. */
  workerName: string;
  workloadTodayMinutes: number;
  maxDailyMinutes: number;
  position: number;
  selected: boolean;
  isViewer: boolean;
}

export interface AllocationFact {
  label: string;
  value: string;
}

export interface AllocationExplanation {
  jobId: string;
  receiptId: string;
  workerId: string;
  service: string;
  policyVersion: string;
  decidedAt: string;
  outcome: AllocationOutcome;
  /** One plain sentence a member can read without training. */
  headline: string;
  /** The comparison that produced the outcome, stated with the frozen numbers. */
  detail: string;
  /** Named protection/eligibility checks that stopped this member, in the order applied. */
  blockedBy: string[];
  /** The frozen inputs the decision used. */
  facts: AllocationFact[];
  /** What this outcome does to rating and future offers. Always stated. */
  consequence: string;
  /** Local dispatch vs federation routing, taken from the receipt. */
  routing: string;
  selectedWorkerId: string;
  fairOrder: FairOrderRow[];
  /** True when the viewer can take this decision to Replay Court. */
  challengeable: boolean;
}

/**
 * The hard checks, in the exact order `eligible()` applies them. Each has a wording for the
 * member it is about and a wording for the operations register, which is about other people;
 * the two must always describe the same check.
 */
type Voice = "member" | "operations";
const HARD_CHECKS: { key: keyof DecisionCandidateSnapshot; message: MessageStem }[] = [
  { key: "verified", message: "check.verified" },
  { key: "active", message: "check.active" },
  { key: "available", message: "check.available" },
  { key: "skill", message: "check.skill" },
];
type MessageStem = "check.verified" | "check.active" | "check.available" | "check.skill";

/**
 * Operations wording stays English: the register is a record-first tool for an administrator,
 * and a half-translated audit trail is worse than an untranslated one. Only the member's own
 * copy is localised.
 */
const OPERATIONS_CHECK: Record<MessageStem, (service: string) => string> = {
  "check.verified": () => "Membership verification was not active in the register at that moment.",
  "check.active": () => "Membership was not active at that moment.",
  "check.available": () => "Had 'available for new work' switched off.",
  "check.skill": (service) => `Not recorded as certified for ${readableService(service)} work.`,
};

export function readableService(service: string) {
  return service.replaceAll("_", " ").replaceAll("-", " ");
}

function minutes(value: number) {
  return `${value} min`;
}

/** A member's name in the script the reader is using, falling back to the Latin form. */
function workerLabel(state: AppState, workerId: string, locale: Locale = "en") {
  const worker = state.workers.find((item) => item.id === workerId);
  if (!worker) return workerId;
  return locale === "en" ? worker.name : worker.nameDevanagari || worker.name;
}

function workerNames(state: AppState, locale: Locale = "en") {
  return new Map(
    state.workers.map((worker) => [
      worker.id,
      locale === "en" ? worker.name : worker.nameDevanagari || worker.name,
    ]),
  );
}

function cooperativeLabel(state: AppState, cooperativeId?: string) {
  if (!cooperativeId) return "an unrecorded cooperative";
  return state.cooperatives.find((coop) => coop.id === cooperativeId)?.name ?? cooperativeId;
}

/**
 * The members actually in the running: present in the frozen snapshot AND not
 * excluded before the decision (a member who had already safely declined is
 * excluded from `candidateWorkerIds` but still appears in the raw snapshot).
 * Ordered exactly as the dispatcher orders them: lowest safe workload first,
 * member ID as the fixed final tie-break.
 */
export function frozenFairOrder(
  receipt: DecisionReceipt,
  viewerId?: string,
  names?: Map<string, string>,
): FairOrderRow[] {
  const snapshot = receipt.candidateSnapshot ?? [];
  const consideredIds = receipt.candidateWorkerIds?.length
    ? new Set(receipt.candidateWorkerIds)
    : null;
  return snapshot
    .filter((row) => row.eligible && (consideredIds ? consideredIds.has(row.workerId) : true))
    .sort(
      (a, b) =>
        a.workloadTodayMinutes - b.workloadTodayMinutes || a.workerId.localeCompare(b.workerId),
    )
    .map((row, index) => ({
      workerId: row.workerId,
      workerName: names?.get(row.workerId) ?? row.workerId,
      workloadTodayMinutes: row.workloadTodayMinutes,
      maxDailyMinutes: row.maxDailyMinutes,
      position: index + 1,
      selected: row.workerId === receipt.workerId,
      isViewer: row.workerId === viewerId,
    }));
}

function blockedReasons(
  row: DecisionCandidateSnapshot,
  service: string,
  voice: Voice = "member",
  locale: Locale = "en",
): string[] {
  const reasons = HARD_CHECKS.filter((check) => row[check.key] === false).map((check) =>
    voice === "member"
      ? t(locale, `${check.message}.member` as never, { service: readableService(service) })
      : OPERATIONS_CHECK[check.message](service),
  );
  if (row.workloadTodayMinutes >= row.maxDailyMinutes) {
    reasons.push(
      voice === "member"
        ? t(locale, "check.workload.member", {
            used: row.workloadTodayMinutes,
            limit: row.maxDailyMinutes,
          })
        : `Workload safety guard: already at ${minutes(row.workloadTodayMinutes)} of a ${minutes(row.maxDailyMinutes)} limit for that day, so the job was held back.`,
    );
  }
  return reasons;
}

function baseFacts(
  state: AppState,
  receipt: DecisionReceipt,
  row?: DecisionCandidateSnapshot,
  locale: Locale = "en",
): AllocationFact[] {
  const facts: AllocationFact[] = [
    { label: t(locale, "fact.policy"), value: receipt.policyVersion },
    { label: t(locale, "fact.payout"), value: `₹${receipt.protectedPayout}` },
    { label: t(locale, "fact.floor"), value: `₹${receipt.protectionFloor ?? receipt.protectedPayout}` },
    { label: t(locale, "fact.cooperative"), value: cooperativeLabel(state, receipt.cooperativeId) },
  ];
  if (row) {
    facts.push({
      label: t(locale, "fact.workload"),
      value: t(locale, "fact.workloadValue", {
        used: row.workloadTodayMinutes,
        limit: row.maxDailyMinutes,
      }),
    });
  }
  return facts;
}

/**
 * Explain one frozen decision to one member.
 * `state` supplies names and the member's own cooperative only — never the numbers
 * the decision was made on. Those come from the receipt.
 */
export function explainAllocation(
  state: AppState,
  receipt: DecisionReceipt,
  worker: Worker,
  locale: Locale = "en",
): AllocationExplanation {
  const job = state.jobs.find((item) => item.id === receipt.jobId);
  const service = job?.service ?? "";
  const snapshot = receipt.candidateSnapshot ?? [];
  const homeSnapshot = receipt.homeCandidateSnapshot ?? [];
  const row = snapshot.find((item) => item.workerId === worker.id);
  const homeRow = homeSnapshot.find((item) => item.workerId === worker.id);
  const fairOrder = frozenFairOrder(receipt, worker.id, workerNames(state, locale));
  const declined = state.safeDeclines.find(
    (record) => record.jobId === receipt.jobId && record.workerId === worker.id,
  );

  const common = {
    jobId: receipt.jobId,
    receiptId: receipt.id,
    workerId: worker.id,
    service,
    policyVersion: receipt.policyVersion,
    decidedAt: receipt.createdAt,
    routing: receipt.federationReason,
    selectedWorkerId: receipt.workerId,
    fairOrder,
  };

  // 1. The member was offered it and safely declined. Checked first, because the member who
  //    declined is also the member named on the receipt until dispatch runs again.
  if (declined) {
    return {
      ...common,
      outcome: "safely-declined",
      headline: t(locale, "why.declined.headline"),
      detail: t(locale, "why.declined.detail", {
        reason: declined.reason,
        other: workerLabel(state, receipt.workerId, locale),
      }),
      blockedBy: [],
      facts: baseFacts(state, receipt, row, locale),
      consequence: t(locale, "why.declined.consequence"),
      challengeable: true,
    };
  }

  // 2. The member was chosen and did not decline.
  if (receipt.workerId === worker.id) {
    const runnerUp = fairOrder.find((item) => !item.selected);
    const mine = fairOrder.find((item) => item.selected);
    return {
      ...common,
      outcome: "selected",
      headline: t(locale, "why.selected.headline", { service: readableService(service) || "service" }),
      detail: runnerUp && mine
        ? t(locale, "why.selected.detail", {
            count: fairOrder.length,
            mine: mine.workloadTodayMinutes,
            theirs: runnerUp.workloadTodayMinutes,
            other: workerLabel(state, runnerUp.workerId, locale),
          })
        : t(locale, "why.selected.detailAlone"),
      blockedBy: [],
      facts: baseFacts(state, receipt, row, locale),
      consequence: t(locale, "why.selected.consequence", { payout: receipt.protectedPayout }),
      challengeable: true,
    };
  }

  // 3. The member was in the considered cooperative but a hard check stopped them.
  if (row && !row.eligible) {
    const reasons = blockedReasons(row, service, "member", locale);
    const certificationOnly = reasons.length === 1 && row.skill === false;
    return {
      ...common,
      outcome: certificationOnly ? "not-certified" : "blocked-by-protection",
      headline: certificationOnly
        ? t(locale, "why.notCertified.headline", { service: readableService(service) })
        : t(locale, "why.blocked.headline"),
      detail: t(locale, "why.blocked.detail", { other: workerLabel(state, receipt.workerId, locale) }),
      blockedBy: reasons.length ? reasons : [t(locale, "check.unknown.member")],
      facts: baseFacts(state, receipt, row, locale),
      consequence: t(locale, "why.noPenalty"),
      challengeable: true,
    };
  }

  // 4. The member passed every check but another member was ahead in turn order.
  if (row && row.eligible) {
    const mine = fairOrder.find((item) => item.isViewer);
    const chosen = fairOrder.find((item) => item.selected);
    let detail: string;
    if (!mine || !chosen) {
      detail = t(locale, "why.passedOver.unknown", { other: workerLabel(state, receipt.workerId, locale) });
    } else if (chosen.workloadTodayMinutes === mine.workloadTodayMinutes) {
      detail = t(locale, "why.passedOver.tie", {
        other: workerLabel(state, chosen.workerId, locale),
        mine: mine.workloadTodayMinutes,
        theirId: chosen.workerId,
        myId: mine.workerId,
      });
    } else {
      detail = t(locale, "why.passedOver.detail", {
        position: mine.position,
        total: fairOrder.length,
        other: workerLabel(state, chosen.workerId, locale),
        theirs: chosen.workloadTodayMinutes,
        mine: mine.workloadTodayMinutes,
        gap: mine.workloadTodayMinutes - chosen.workloadTodayMinutes,
      });
    }
    return {
      ...common,
      outcome: "passed-over",
      headline: t(locale, "why.passedOver.headline"),
      detail,
      blockedBy: [],
      facts: baseFacts(state, receipt, row, locale),
      consequence: t(locale, "why.noPenalty"),
      challengeable: true,
    };
  }

  // 5. The member's own cooperative was the home cooperative, but the job left it.
  if (homeRow) {
    const reasons = blockedReasons(homeRow, service, "member", locale);
    const safeAtHome = homeSnapshot.filter((item) => item.eligible);
    return {
      ...common,
      outcome: "cooperative-had-no-safe-capacity",
      headline: t(locale, "why.federated.headline", {
        cooperative: cooperativeLabel(state, receipt.cooperativeId),
      }),
      detail: safeAtHome.length
        ? t(locale, "why.federated.detailSome", { count: safeAtHome.length })
        : t(locale, "why.federated.detailNone"),
      blockedBy: reasons,
      facts: baseFacts(state, receipt, homeRow, locale),
      consequence: t(locale, "why.noPenalty"),
      challengeable: true,
    };
  }

  // 6. The receipt predates candidate recording.
  if (!snapshot.length) {
    return {
      ...common,
      outcome: "not-recorded",
      headline: t(locale, "why.unrecorded.headline"),
      detail: t(locale, "why.unrecorded.detail"),
      blockedBy: [],
      facts: baseFacts(state, receipt, undefined, locale),
      consequence: t(locale, "why.noPenalty"),
      challengeable: true,
    };
  }

  // 7. The job was never routed to this member's cooperative.
  return {
    ...common,
    outcome: "other-cooperative",
    headline: t(locale, "why.otherCoop.headline", {
      cooperative: cooperativeLabel(state, receipt.cooperativeId),
    }),
    detail: t(locale, "why.otherCoop.detail"),
    blockedBy: [],
    facts: baseFacts(state, receipt, undefined, locale),
    consequence: t(locale, "why.noPenalty"),
    challengeable: false,
  };
}

/**
 * Every frozen decision a member has standing to ask about: the ones they won,
 * the ones they were considered for, and the ones their own cooperative lost.
 * Newest first.
 */
export function decisionsForWorker(state: AppState, worker: Worker): DecisionReceipt[] {
  return state.receipts
    .filter(
      (receipt) =>
        receipt.workerId === worker.id ||
        receipt.candidateWorkerIds?.includes(worker.id) ||
        receipt.candidateSnapshot?.some((row) => row.workerId === worker.id) ||
        receipt.homeCandidateSnapshot?.some((row) => row.workerId === worker.id),
    )
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function explanationsForWorker(
  state: AppState,
  worker: Worker,
  locale: Locale = "en",
): AllocationExplanation[] {
  return decisionsForWorker(state, worker).map((receipt) =>
    explainAllocation(state, receipt, worker, locale),
  );
}

export interface AllocationLedgerRow {
  workerId: string;
  workerName: string;
  outcome: AllocationOutcome;
  summary: string;
  workloadTodayMinutes: number;
  maxDailyMinutes: number;
  position?: number;
}

/**
 * The operations view: every member the decision looked at, with the reason, in the
 * order the rulebook applied. Used by admins and by the customer-facing summary.
 */
export function allocationLedger(state: AppState, receipt: DecisionReceipt): AllocationLedgerRow[] {
  const snapshot = receipt.candidateSnapshot ?? [];
  const job = state.jobs.find((item) => item.id === receipt.jobId);
  const service = job?.service ?? "";
  const fairOrder = frozenFairOrder(receipt, undefined, workerNames(state));
  const declinedIds = new Set(
    state.safeDeclines
      .filter((record) => record.jobId === receipt.jobId)
      .map((record) => record.workerId),
  );

  return snapshot
    .map((row): AllocationLedgerRow => {
      const name = workerLabel(state, row.workerId);
      const place = fairOrder.find((item) => item.workerId === row.workerId);
      if (row.workerId === receipt.workerId) {
        return {
          workerId: row.workerId,
          workerName: name,
          outcome: "selected",
          summary: `Selected — first in turn order at ${minutes(row.workloadTodayMinutes)} booked that day.`,
          workloadTodayMinutes: row.workloadTodayMinutes,
          maxDailyMinutes: row.maxDailyMinutes,
          position: place?.position,
        };
      }
      if (declinedIds.has(row.workerId)) {
        return {
          workerId: row.workerId,
          workerName: name,
          outcome: "safely-declined",
          summary: "Offered and safely declined — zero rating and opportunity penalty.",
          workloadTodayMinutes: row.workloadTodayMinutes,
          maxDailyMinutes: row.maxDailyMinutes,
        };
      }
      if (!row.eligible) {
        const reasons = blockedReasons(row, service, "operations");
        return {
          workerId: row.workerId,
          workerName: name,
          outcome: row.skill === false ? "not-certified" : "blocked-by-protection",
          summary: reasons[0] ?? "Recorded as not eligible; the failing check was not named.",
          workloadTodayMinutes: row.workloadTodayMinutes,
          maxDailyMinutes: row.maxDailyMinutes,
        };
      }
      return {
        workerId: row.workerId,
        workerName: name,
        outcome: "passed-over",
        summary: place
          ? `Eligible, position ${place.position} in turn order at ${minutes(row.workloadTodayMinutes)} booked.`
          : `Eligible but excluded from this run of dispatch.`,
        workloadTodayMinutes: row.workloadTodayMinutes,
        maxDailyMinutes: row.maxDailyMinutes,
        position: place?.position,
      };
    })
    .sort((a, b) => {
      const rank = (value: AllocationOutcome) =>
        value === "selected" ? 0 : value === "passed-over" ? 1 : value === "safely-declined" ? 2 : 3;
      return (
        rank(a.outcome) - rank(b.outcome) ||
        a.workloadTodayMinutes - b.workloadTodayMinutes ||
        a.workerId.localeCompare(b.workerId)
      );
    });
}

/**
 * The customer-facing answer to "why this person?". Deliberately short: a customer
 * needs to trust the match, not audit it.
 */
export function customerMatchSummary(state: AppState, job: Job): string[] {
  const receipt = state.receipts.find((item) => item.id === job.receiptId);
  const worker = state.workers.find((item) => item.id === job.workerId);
  if (!receipt || !worker) return [];
  const fairOrder = frozenFairOrder(receipt, undefined, workerNames(state));
  const lines = [
    `${worker.name} is a verified member of ${cooperativeLabel(state, receipt.cooperativeId)}, certified for ${readableService(job.service)} work.`,
    fairOrder.length > 1
      ? `${fairOrder.length} certified members were free and safe to take this job. It went to whoever had the least work booked today, not to whoever would accept the least money.`
      : `They were the certified member available and within safe working hours for your slot.`,
    `Your price of ₹${job.amount} was set before the match, so no member had to underbid another to get it.`,
  ];
  if (job.federationOpportunityId) {
    lines.push(
      `Your own neighbourhood cooperative had no member who could safely reach you in time, so a nearby cooperative took the job and chose its own member. Your price and their protections did not change.`,
    );
  }
  return lines;
}

/**
 * Why nobody is assigned yet, in plain words, for a job still in `requested`.
 * Reads today's register because no decision has been frozen yet.
 */
export function unassignedReason(state: AppState, job: Job): { headline: string; reasons: string[] } {
  const certified = state.workers.filter((worker) => worker.skills.includes(job.service));
  const declined = new Set(job.declinedWorkerIds ?? []);
  const reasons: string[] = [];
  const unavailable = certified.filter((worker) => !worker.available && !declined.has(worker.id));
  const atLimit = certified.filter(
    (worker) =>
      worker.available &&
      !declined.has(worker.id) &&
      worker.workloadTodayMinutes >= (worker.maxDailyMinutes ?? 480),
  );
  const unverified = certified.filter(
    (worker) => (!worker.verified || !worker.active) && !declined.has(worker.id),
  );
  if (declined.size)
    reasons.push(
      `${declined.size} member${declined.size === 1 ? "" : "s"} safely declined, which carries no penalty for them. Dispatch moved on.`,
    );
  if (atLimit.length)
    reasons.push(
      `${atLimit.length} certified member${atLimit.length === 1 ? " has" : "s have"} reached their safe daily working limit.`,
    );
  if (unavailable.length)
    reasons.push(`${unavailable.length} certified member${unavailable.length === 1 ? " is" : "s are"} off duty right now.`);
  if (unverified.length)
    reasons.push(`${unverified.length} certified member${unverified.length === 1 ? "'s" : "s'"} membership is not currently active.`);
  if (!certified.length)
    reasons.push(`No member in the network is certified for ${readableService(job.service)} work yet.`);
  return {
    // A job only stays unassigned after local dispatch AND federation have both failed, so
    // these counts deliberately span every cooperative in the network, not just the local one.
    headline: "No member has been assigned yet, and here is why.",
    reasons: (reasons.length
      ? reasons
      : ["Every certified member is currently on another job. The cooperative is still looking."]
    ).concat("These counts cover every cooperative in the network, because the job was already offered beyond your own neighbourhood."),
  };
}
