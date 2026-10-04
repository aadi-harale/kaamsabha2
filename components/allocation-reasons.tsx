"use client";

import { useState } from "react";
import type { AppState, Job, Worker } from "@/lib/domain";
import {
  allocationLedger, customerMatchSummary, explanationsForWorker, unassignedReason,
  type AllocationExplanation, type AllocationOutcome,
} from "@/lib/allocation-explain";

/** Worded for the member reading about their own job. */
const MEMBER_LABEL: Record<AllocationOutcome, string> = {
  "selected": "You got this job",
  "safely-declined": "You declined — no penalty",
  "passed-over": "Someone was ahead in turn",
  "blocked-by-protection": "A protection stopped it",
  "not-certified": "Certification needed",
  "other-cooperative": "Another cooperative",
  "cooperative-had-no-safe-capacity": "Left your cooperative",
  "not-recorded": "Not fully recorded",
};

/** Worded for the operations register, which is about other people. */
const OPS_LABEL: Record<AllocationOutcome, string> = {
  "selected": "Selected",
  "safely-declined": "Safely declined",
  "passed-over": "Later in turn order",
  "blocked-by-protection": "Held back by a protection",
  "not-certified": "Not certified",
  "other-cooperative": "Other cooperative",
  "cooperative-had-no-safe-capacity": "No safe local capacity",
  "not-recorded": "Not fully recorded",
};

function outcomeTone(outcome: AllocationOutcome) {
  if (outcome === "selected") return "won";
  if (outcome === "safely-declined") return "declined";
  if (outcome === "passed-over") return "turn";
  return "blocked";
}

function ExplanationCard({ explanation, onChallenge }: { explanation: AllocationExplanation; onChallenge?: (jobId: string) => void }) {
  const [open, setOpen] = useState(false);
  const mine = explanation.fairOrder.find((row) => row.isViewer);
  return (
    <article className={`whyCard ${outcomeTone(explanation.outcome)}`}>
      <div className="whyCardTop">
        <div>
          <small>
            {explanation.jobId} · {new Date(explanation.decidedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </small>
          <strong>{explanation.headline}</strong>
        </div>
        <span className={`whyTag ${outcomeTone(explanation.outcome)}`}>{MEMBER_LABEL[explanation.outcome]}</span>
      </div>

      <p className="whyDetail">{explanation.detail}</p>

      {explanation.blockedBy.length > 0 && (
        <ul className="whyBlocked">
          {explanation.blockedBy.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <p className="whyConsequence">{explanation.consequence}</p>

      <button className="whyToggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "Hide the exact figures used" : "Show the exact figures used"}
      </button>

      {open && (
        <div className="whyProof">
          <dl className="whyFacts">
            {explanation.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {explanation.fairOrder.length > 0 && (
            <div className="whyOrder">
              <p className="whyOrderHead">
                Turn order at the moment of the decision — least work booked goes first
              </p>
              <table>
                <caption className="srOnly">Frozen turn order for job {explanation.jobId}</caption>
                <thead>
                  <tr><th scope="col">#</th><th scope="col">Member</th><th scope="col">Booked that day</th><th scope="col">Outcome</th></tr>
                </thead>
                <tbody>
                  {explanation.fairOrder.map((row) => (
                    <tr key={row.workerId} className={row.isViewer ? "isViewer" : undefined}>
                      <td>{row.position}</td>
                      <td>{row.isViewer ? "You" : row.workerName}</td>
                      <td>{row.workloadTodayMinutes} of {row.maxDailyMinutes} min</td>
                      <td>{row.selected ? "Chosen" : "Not this time"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mine && !mine.selected && (
                <p className="whyOrderNote">
                  Your own figures are highlighted. These are the numbers as they were, not as they are today —
                  the cooperative never rewrites a settled decision.
                </p>
              )}
            </div>
          )}

          <p className="whyRouting">{explanation.routing}</p>
        </div>
      )}

      {explanation.challengeable && onChallenge && (
        <button className="secondary compact" type="button" onClick={() => onChallenge(explanation.jobId)}>
          This still looks wrong — send it to Replay Court
        </button>
      )}
    </article>
  );
}

/** Worker view: every decision that involved them, with the reason, newest first. */
export function WorkerDecisionReasons({
  state, worker, onChallenge,
}: {
  state: AppState; worker: Worker; onChallenge?: (jobId: string) => void;
}) {
  const explanations = explanationsForWorker(state, worker);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const missed = explanations.filter((item) => item.outcome !== "selected");
  const shown = filter === "missed" ? missed : explanations;

  return (
    <section className="whySection">
      <div className="whySectionHead">
        <div>
          <p className="eyebrow">WHY YOU DID OR DID NOT GET A JOB</p>
          <h2>Every allocation that involved you, with the reason.</h2>
          <p>
            Each answer is rebuilt from the figures frozen at the moment of the decision, so it does not
            change later. Missing out never lowers your rating and never reduces the offers you get next.
          </p>
        </div>
        <div className="segment" role="group" aria-label="Filter decisions">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            All {explanations.length}
          </button>
          <button type="button" className={filter === "missed" ? "active" : ""} onClick={() => setFilter("missed")}>
            Didn&apos;t get {missed.length}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <span aria-hidden="true">○</span>
          <p>
            No allocation decisions involve you yet. As soon as a job is dispatched in your cooperative for a
            skill you hold, the reason you did or did not get it appears here.
          </p>
        </div>
      ) : (
        <div className="whyList">
          {shown.map((explanation) => (
            <ExplanationCard key={explanation.receiptId} explanation={explanation} onChallenge={onChallenge} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * What dispatch sees when it looks at this member right now, and what they can change.
 * This is the answer to "why am I not getting work?" when there is no job on screen —
 * the question the empty state used to leave unanswered.
 */
export function WorkerStanding({ state, worker }: { state: AppState; worker: Worker }) {
  const limit = worker.maxDailyMinutes ?? 480;
  const checks = [
    {
      label: "Membership verified",
      ok: worker.verified,
      fix: "The cooperative office has to confirm your verification before dispatch can offer you work.",
    },
    {
      label: "Membership active",
      ok: worker.active,
      fix: "Your membership is not active. Raise an issue so the cooperative can look at it.",
    },
    {
      label: "Available for new work",
      ok: worker.available,
      fix: "You switched availability off. Switch it back on below whenever you are ready — nobody is penalised either way.",
    },
    {
      label: `Within your daily limit (${worker.workloadTodayMinutes} of ${limit} min)`,
      ok: worker.workloadTodayMinutes < limit,
      fix: `You have reached the limit you set for today. Dispatch will hold work back until tomorrow, or you can raise your own limit below.`,
    },
    {
      label: `Certified skills on file (${worker.skills.length})`,
      ok: worker.skills.length > 0,
      fix: "No certified skill is on file, so no job category can reach you yet.",
    },
  ];
  const blocking = checks.filter((check) => !check.ok);
  const explanations = explanationsForWorker(state, worker);
  const recentMisses = explanations.filter((item) => item.outcome !== "selected").slice(0, 3);
  // The last job that closed, so finishing one does not end on a blank screen.
  const lastClosed = state.jobs
    .filter((job) => job.workerId === worker.id && job.status === "settled")
    .slice()
    .sort((a, b) => b.id.localeCompare(a.id))[0];
  const lastSettlement = lastClosed
    ? state.settlements.find((item) => item.jobId === lastClosed.id)
    : undefined;

  return (
    <section className="standingPanel">
      <div className="standingHead">
        <div>
          <p className="eyebrow">WHY YOU HAVE NO JOB RIGHT NOW</p>
          <h2>{blocking.length === 0 ? "You are in the queue for new work." : "Something is holding work back from you."}</h2>
          <p>
            {blocking.length === 0
              ? "Every check dispatch runs on you passes. Jobs go to whoever has the least work booked that day, so your turn comes round as others fill up."
              : "These are your own settings and records, not a score. Nothing here is a mark against you."}
          </p>
        </div>
        <span className={blocking.length === 0 ? "standingBadge ok" : "standingBadge hold"}>
          {blocking.length === 0 ? "In the queue" : `${blocking.length} to fix`}
        </span>
      </div>

      <ul className="standingChecks">
        {checks.map((check) => (
          <li key={check.label} className={check.ok ? "pass" : "hold"}>
            <span className="standingMark" aria-hidden="true">{check.ok ? "✓" : "!"}</span>
            <div>
              <strong>{check.label}</strong>
              {!check.ok && <span>{check.fix}</span>}
            </div>
            {/* The word carries the meaning; the colour and the tick only reinforce it. */}
            <span className="standingState">{check.ok ? "Passing" : "Needs attention"}</span>
          </li>
        ))}
      </ul>

      {lastClosed && (
        <div className="standingLastJob">
          <strong>Your last job is closed and paid</strong>
          <span>
            {lastClosed.id} · {lastClosed.service.replaceAll("_", " ")} in {lastClosed.locality}
            {lastSettlement
              ? ` · ₹${lastSettlement.workerPayout} posted to your earnings as invoice ${lastSettlement.invoiceNumber}.`
              : "."}
          </span>
        </div>
      )}

      {recentMisses.length > 0 && (
        <div className="standingMisses">
          <p className="standingMissesHead">The last jobs that went to someone else, and why</p>
          {recentMisses.map((item) => (
            <div key={item.receiptId}>
              <strong>{item.jobId}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
          <small>Open Fair Work for the full record and the figures behind each one.</small>
        </div>
      )}
    </section>
  );
}

/** Customer view: short reassurance about the match, no internal ranking. */
export function CustomerMatchReason({ state, job }: { state: AppState; job: Job }) {
  const lines = customerMatchSummary(state, job);
  if (!job.workerId) {
    const { headline, reasons } = unassignedReason(state, job);
    return (
      <div className="matchReason unassigned">
        <p className="eyebrow">STILL LOOKING</p>
        <strong>{headline}</strong>
        <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <span>Nobody is being pressured to take it. You can cancel at any time before someone accepts.</span>
      </div>
    );
  }
  if (!lines.length) return null;
  const worker = state.workers.find((item) => item.id === job.workerId);
  return (
    <details className="matchReason">
      <summary>Why {worker?.name ?? "this member"} was matched to you</summary>
      <ul>{lines.map((line) => <li key={line}>{line}</li>)}</ul>
    </details>
  );
}

/** Operations view: the full considered set with a reason per member. */
export function AdminAllocationLedger({ state }: { state: AppState }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const decided = state.jobs.filter((job) => job.receiptId);
  const selected = jobId ?? decided[0]?.id ?? null;
  const job = decided.find((item) => item.id === selected);
  const receipt = state.receipts.find((item) => item.id === job?.receiptId);
  const rows = receipt ? allocationLedger(state, receipt) : [];

  if (!decided.length) {
    return (
      <section className="panel">
        <div className="sectionTitle roomy">
          <div>
            <h2>Allocation record</h2>
            <p className="muted">Every dispatch decision, and the reason each member did or did not get it.</p>
          </div>
        </div>
        <div className="empty"><span aria-hidden="true">○</span><p>No dispatch decisions yet. Book a job as a customer and it appears here immediately.</p></div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="sectionTitle roomy">
        <div>
          <h2>Allocation record</h2>
          <p className="muted">
            Every member the decision looked at, in the order the rulebook applied, with the reason. The same
            answer the member sees.
          </p>
        </div>
        <label className="field compactField">
          <span>Job</span>
          <select value={selected ?? ""} onChange={(event) => setJobId(event.target.value)}>
            {decided.map((item) => (
              <option key={item.id} value={item.id}>{item.id} · {item.service.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
      </div>

      {receipt && (
        <p className="ledgerContext">
          Rulebook <b>{receipt.policyVersion}</b> · protected payout <b>₹{receipt.protectedPayout}</b> ·
          floor <b>₹{receipt.protectionFloor ?? receipt.protectedPayout}</b> ·
          decided <b>{new Date(receipt.createdAt).toLocaleString("en-IN")}</b>
        </p>
      )}

      <div className="ledgerTable">
        <div className="ledgerHead">
          <span>Member</span><span>Workload then</span><span>Outcome</span><span>Reason</span>
        </div>
        {rows.map((row) => (
          <div className={`ledgerRow ${outcomeTone(row.outcome)}`} key={row.workerId}>
            <div>
              <strong>{row.workerName}</strong>
              <small>{row.position ? `Turn position ${row.position}` : "Not in turn order"}</small>
            </div>
            <span>{row.workloadTodayMinutes} / {row.maxDailyMinutes} min</span>
            <span className={`whyTag ${outcomeTone(row.outcome)}`}>{OPS_LABEL[row.outcome]}</span>
            <span>{row.summary}</span>
          </div>
        ))}
      </div>

      {receipt && <p className="ledgerRouting">{receipt.federationReason}</p>}
    </section>
  );
}
