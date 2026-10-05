import type { AppState, Locale, Worker } from "./domain.ts";
import { t } from "./messages.ts";
import { workerDailyLimit } from "./domain.ts";

/**
 * Runs the same demand, over the same members, under different dispatch rulebooks.
 *
 * The product's whole claim is that the rulebook — not the technology, not the workers — decides
 * who eats. That claim was only ever asserted. This computes it: identical jobs, identical
 * people, identical starting workloads, one variable changed.
 *
 * Honesty constraints this module holds to:
 *  - The alternative rulebooks are named for what they optimise. They are not claims about what
 *    any particular company does, and nothing here should be presented as one.
 *  - Nothing is invented. Every number out of here is a count of what the stated rule did with
 *    the register's own member records. No payout is fabricated, because no payout data exists
 *    for a rule that has no floor — the absence of a guarantee is reported as an absence.
 *  - It is a read-only counterfactual. It cannot dispatch, change a member, or touch the
 *    register, and the tests pin that.
 */

/** Deterministic demand so every run of the demo produces the same comparison. */
export const DEMAND_SEED = 26089;
/** Minutes one job adds to a member's day. One figure, applied to every rule equally. */
export const JOB_MINUTES = 60;

export interface SimulatedJob {
  index: number;
  service: string;
  locality: string;
}

export interface Rulebook {
  id: string;
  /** Message keys, so each language writes the rule in its own words. */
  nameKey: string;
  /** What it optimises, in one line a reader can take in at a glance. */
  ruleKey: string;
  /** The member-facing consequence of that rule. */
  consequenceKey: string;
  guaranteedFloor: boolean;
  respectsDailyLimit: boolean;
  refusalIsFree: boolean;
  /** True for the rulebook this cooperative actually runs. */
  active: boolean;
}

export const RULEBOOKS: Rulebook[] = [
  {
    id: "cooperative",
    nameKey: "rule.coop.name",
    ruleKey: "rule.coop.rule",
    consequenceKey: "rule.coop.consequence",
    guaranteedFloor: true,
    respectsDailyLimit: true,
    refusalIsFree: true,
    active: true,
  },
  {
    id: "rating-ranked",
    nameKey: "rule.ranked.name",
    ruleKey: "rule.ranked.rule",
    consequenceKey: "rule.ranked.consequence",
    guaranteedFloor: false,
    respectsDailyLimit: false,
    refusalIsFree: false,
    active: false,
  },
];

/** The rulebook's visible wording, in the reader's language. */
export function rulebookText(rule: Rulebook, locale: Locale = "en") {
  return {
    name: t(locale, rule.nameKey as never),
    rule: t(locale, rule.ruleKey as never),
    consequence: t(locale, rule.consequenceKey as never),
  };
}

/** A small deterministic generator. Seeded, so the comparison is identical on every machine. */
function sequence(seed: number) {
  let value = seed >>> 0;
  return () => {
    // Numerical Recipes LCG. Chosen for being short and reproducible, not for randomness quality.
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * Synthetic demand, clearly labelled as such wherever it is shown. It exists so the
 * concentration effect is visible on a fresh register instead of needing twenty manual bookings.
 */
export function simulateDemand(state: AppState, count: number, seed = DEMAND_SEED): SimulatedJob[] {
  const next = sequence(seed);
  const services = [...new Set(state.workers.flatMap((worker) => worker.skills))].sort();
  const localities = state.cooperatives.map((coop) => coop.locality).sort();
  if (!services.length || !localities.length) return [];
  return Array.from({ length: count }, (_, index) => ({
    index,
    service: services[Math.floor(next() * services.length) % services.length],
    locality: localities[Math.floor(next() * localities.length) % localities.length],
  }));
}

interface SimWorker {
  id: string;
  name: string;
  skills: string[];
  rating: number;
  verified: boolean;
  active: boolean;
  available: boolean;
  workload: number;
  limit: number;
}

function snapshotWorkers(state: AppState, locale: Locale = "en"): SimWorker[] {
  return state.workers
    .map((worker: Worker) => ({
      id: worker.id,
      name: locale === "en" ? worker.name : worker.nameDevanagari || worker.name,
      skills: worker.skills,
      rating: worker.rating,
      verified: worker.verified,
      active: worker.active,
      available: worker.available,
      workload: worker.workloadTodayMinutes,
      limit: workerDailyLimit(worker),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Certification and standing. Shared by every rulebook, because no rule should skip these. */
function certified(worker: SimWorker, service: string) {
  return worker.verified && worker.active && worker.available && worker.skills.includes(service);
}

function choose(rule: Rulebook, workers: SimWorker[], service: string): SimWorker | undefined {
  const pool = workers.filter((worker) => certified(worker, service));
  if (rule.id === "cooperative") {
    return pool
      .filter((worker) => worker.workload < worker.limit)
      .sort((a, b) => a.workload - b.workload || a.id.localeCompare(b.id))[0];
  }
  // Rating-ranked: the daily limit is not a constraint, so a member already past it still gets
  // handed the next job.
  return pool.sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[0];
}

export interface RuleAssignment {
  jobIndex: number;
  service: string;
  workerId: string;
  workerName: string;
  /** The member was already at or past their own daily limit when this job was handed to them. */
  pastSafeLimit: boolean;
}

export interface WorkerShare {
  workerId: string;
  name: string;
  jobs: number;
  minutesAdded: number;
  startedAt: number;
  endedAt: number;
  limit: number;
  /**
   * Ended the day over their own limit having been given work.
   *
   * This is deliberately NOT the headline metric. The cooperative guard refuses to *start* a
   * member on new work once they are at their limit; it does not stop a job they lawfully
   * took from running past the line. So a member can finish slightly over under a rule that
   * never broke its promise, and reporting that as a breach would overstate the case. The
   * metric that distinguishes the rules is `jobsPastSafeLimit`: work handed to someone who was
   * *already* at or over the limit.
   */
  finishedOverLimit: boolean;
  /** Why this member got nothing, when they got nothing. Empty when they earned. */
  shutOutReason: string;
}

export interface RuleOutcome {
  rulebook: Rulebook;
  assignments: RuleAssignment[];
  shares: WorkerShare[];
  /** Members certified for at least one service in the demand who received no job at all. */
  membersWithNoWork: number;
  membersWithWork: number;
  /** The largest number of jobs any one member took. */
  busiestMemberJobs: number;
  busiestMemberName: string;
  /**
   * Jobs handed to a member who was ALREADY at or over their own limit when the job was
   * assigned. This is the breach that distinguishes the rulebooks.
   */
  jobsPastSafeLimit: number;
  /** Jobs nobody could lawfully take under this rule. */
  unfilled: number;
  /** Share of the work taken by the busiest quarter of members, 0-1. A crude concentration read. */
  concentration: number;
}

/**
 * Says why a member earned nothing. Under this cooperative's rules that is usually a protection
 * doing its job, which is a different thing from being passed over, and the two must not be
 * shown as if they were the same.
 */
function shutOutReason(
  rule: Rulebook,
  worker: SimWorker,
  startedAt: number,
  locale: Locale = "en",
): string {
  if (!worker.verified || !worker.active) return t(locale, "rule.out.inactive");
  if (!worker.available) return t(locale, "rule.out.unavailable");
  if (rule.respectsDailyLimit && startedAt >= worker.limit) {
    return t(locale, "rule.out.atLimit", { limit: worker.limit });
  }
  if (rule.respectsDailyLimit) return t(locale, "rule.out.rotation");
  return t(locale, "rule.out.outranked", { rating: worker.rating.toFixed(1) });
}

export function runRulebook(
  state: AppState,
  demand: SimulatedJob[],
  rule: Rulebook,
  locale: Locale = "en",
): RuleOutcome {
  const workers = snapshotWorkers(state, locale);
  const starting = new Map(workers.map((worker) => [worker.id, worker.workload]));
  const assignments: RuleAssignment[] = [];
  let unfilled = 0;

  for (const job of demand) {
    const picked = choose(rule, workers, job.service);
    if (!picked) {
      unfilled += 1;
      continue;
    }
    assignments.push({
      jobIndex: job.index,
      service: job.service,
      workerId: picked.id,
      workerName: picked.name,
      pastSafeLimit: picked.workload >= picked.limit,
    });
    picked.workload += JOB_MINUTES;
  }

  const counted = new Map<string, number>();
  assignments.forEach((item) => counted.set(item.workerId, (counted.get(item.workerId) ?? 0) + 1));

  const servicesInDemand = new Set(demand.map((job) => job.service));
  const relevant = workers.filter((worker) => worker.skills.some((skill) => servicesInDemand.has(skill)));

  const shares: WorkerShare[] = relevant
    .map((worker) => {
      const jobs = counted.get(worker.id) ?? 0;
      const startedAt = starting.get(worker.id) ?? 0;
      return {
        workerId: worker.id,
        name: worker.name,
        jobs,
        minutesAdded: jobs * JOB_MINUTES,
        startedAt,
        endedAt: worker.workload,
        limit: worker.limit,
        finishedOverLimit: jobs > 0 && worker.workload > worker.limit,
        shutOutReason: jobs > 0 ? "" : shutOutReason(rule, worker, startedAt, locale),
      };
    })
    .sort((a, b) => b.jobs - a.jobs || a.workerId.localeCompare(b.workerId));

  const withWork = shares.filter((share) => share.jobs > 0);
  const topQuarter = Math.max(1, Math.round(shares.length / 4));
  const takenByTop = shares.slice(0, topQuarter).reduce((total, share) => total + share.jobs, 0);

  return {
    rulebook: rule,
    assignments,
    shares,
    membersWithWork: withWork.length,
    membersWithNoWork: shares.length - withWork.length,
    busiestMemberJobs: shares[0]?.jobs ?? 0,
    busiestMemberName: shares[0]?.name ?? "—",
    jobsPastSafeLimit: assignments.filter((item) => item.pastSafeLimit).length,
    unfilled,
    concentration: assignments.length ? takenByTop / assignments.length : 0,
  };
}

export interface RuleComparison {
  demand: SimulatedJob[];
  outcomes: RuleOutcome[];
  /** The claim, in one line. Read in about three seconds. */
  lead: string;
  /** The numbers that back the claim. Read in the next ten. */
  proof: string[];
  /** Lead and proof as one string, for contexts that cannot show them separately. */
  headline: string;
}

export function compareRulebooks(
  state: AppState,
  jobCount = 32,
  seed = DEMAND_SEED,
  locale: Locale = "en",
): RuleComparison {
  const demand = simulateDemand(state, jobCount, seed);
  const outcomes = RULEBOOKS.map((rule) => runRulebook(state, demand, rule, locale));
  const cooperative = outcomes.find((outcome) => outcome.rulebook.id === "cooperative");
  const alternative = outcomes.find((outcome) => outcome.rulebook.id !== "cooperative");

  const lead = cooperative
    ? t(locale, "rule.lead", { jobs: demand.length, members: cooperative.shares.length })
    : t(locale, "rule.leadFallback");
  const proof: string[] = [];
  if (cooperative && alternative) {
    if (alternative.membersWithWork < cooperative.membersWithWork) {
      proof.push(
        t(locale, "rule.proof.earn", {
          coop: cooperative.membersWithWork,
          alt: alternative.membersWithWork,
        }),
      );
    }
    if (alternative.jobsPastSafeLimit > cooperative.jobsPastSafeLimit) {
      proof.push(t(locale, "rule.proof.limit", { count: alternative.jobsPastSafeLimit }));
    }
  }
  return { demand, outcomes, lead, proof, headline: [lead, ...proof].join(" ") };
}

