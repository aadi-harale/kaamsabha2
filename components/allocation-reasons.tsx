"use client";

import { useState } from "react";
import type { AppState, Job, Locale, Worker } from "@/lib/domain";
import { t } from "@/lib/messages";
import {
  allocationLedger, customerMatchSummary, explanationsForWorker, unassignedReason,
  type AllocationExplanation, type AllocationOutcome,
} from "@/lib/allocation-explain";

/** Worded for the member reading about their own job, in their own language. */
const MEMBER_LABEL_KEY: Record<AllocationOutcome, string> = {
  "selected": "outcome.selected",
  "safely-declined": "outcome.declined",
  "passed-over": "outcome.passedOver",
  "blocked-by-protection": "outcome.blocked",
  "not-certified": "outcome.notCertified",
  "other-cooperative": "outcome.otherCoop",
  "cooperative-had-no-safe-capacity": "outcome.federated",
  "not-recorded": "outcome.unrecorded",
};
const memberLabel = (outcome: AllocationOutcome, locale: Locale) =>
  t(locale, MEMBER_LABEL_KEY[outcome] as never);

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

function ExplanationCard({ explanation, onChallenge, locale }: { explanation: AllocationExplanation; onChallenge?: (jobId: string) => void; locale: Locale }) {
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
        <span className={`whyTag ${outcomeTone(explanation.outcome)}`}>{memberLabel(explanation.outcome, locale)}</span>
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
        {open ? t(locale, "why.hideFigures") : t(locale, "why.showFigures")}
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
                {t(locale, "why.turnOrder")}
              </p>
              <table>
                <caption className="srOnly">Frozen turn order for job {explanation.jobId}</caption>
                <thead>
                  <tr><th scope="col">#</th><th scope="col">{t(locale, "why.colMember")}</th><th scope="col">{t(locale, "why.colBooked")}</th><th scope="col">{t(locale, "why.colOutcome")}</th></tr>
                </thead>
                <tbody>
                  {explanation.fairOrder.map((row) => (
                    <tr key={row.workerId} className={row.isViewer ? "isViewer" : undefined}>
                      <td>{row.position}</td>
                      <td>{row.isViewer ? t(locale, "why.you") : row.workerName}</td>
                      <td>{row.workloadTodayMinutes} of {row.maxDailyMinutes} min</td>
                      <td>{row.selected ? t(locale, "why.chosen") : t(locale, "why.notThisTime")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mine && !mine.selected && (
                <p className="whyOrderNote">
                  {t(locale, "why.frozenNote")}
                </p>
              )}
            </div>
          )}

          <p className="whyRouting">{explanation.routing}</p>
        </div>
      )}

      {explanation.challengeable && onChallenge && (
        <button className="secondary compact" type="button" onClick={() => onChallenge(explanation.jobId)}>
          {t(locale, "why.challenge")}
        </button>
      )}
    </article>
  );
}

/** Worker view: every decision that involved them, with the reason, newest first. */
export function WorkerDecisionReasons({
  state, worker, onChallenge, locale = "en",
}: {
  state: AppState; worker: Worker; onChallenge?: (jobId: string) => void; locale?: Locale;
}) {
  const explanations = explanationsForWorker(state, worker, locale);
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const missed = explanations.filter((item) => item.outcome !== "selected");
  const shown = filter === "missed" ? missed : explanations;

  return (
    <section className="whySection">
      <div className="whySectionHead">
        <div>
          <p className="eyebrow">{t(locale, "why.sectionTitle")}</p>
          <h2>{t(locale, "why.sectionHeading")}</h2>
          <p>
            {t(locale, "why.sectionBody")}
          </p>
        </div>
        <div className="segment" role="group" aria-label="Filter decisions">
          <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            {t(locale, "why.filterAll", { count: explanations.length })}
          </button>
          <button type="button" className={filter === "missed" ? "active" : ""} onClick={() => setFilter("missed")}>
            {t(locale, "why.filterMissed", { count: missed.length })}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <span aria-hidden="true">○</span>
          <p>
            {t(locale, "why.empty")}
          </p>
        </div>
      ) : (
        <div className="whyList">
          {shown.map((explanation) => (
            <ExplanationCard key={explanation.receiptId} explanation={explanation} onChallenge={onChallenge} locale={locale} />
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
export function WorkerStanding({ state, worker, locale = "en" }: { state: AppState; worker: Worker; locale?: Locale }) {
  const limit = worker.maxDailyMinutes ?? 480;
  const checks = [
    { label: t(locale, "standing.check.verified"), ok: worker.verified, fix: t(locale, "standing.fix.verified") },
    { label: t(locale, "standing.check.active"), ok: worker.active, fix: t(locale, "standing.fix.active") },
    { label: t(locale, "standing.check.available"), ok: worker.available, fix: t(locale, "standing.fix.available") },
    {
      label: t(locale, "standing.check.limit", { used: worker.workloadTodayMinutes, limit }),
      ok: worker.workloadTodayMinutes < limit,
      fix: t(locale, "standing.fix.limit"),
    },
    {
      label: t(locale, "standing.check.skills", { count: worker.skills.length }),
      ok: worker.skills.length > 0,
      fix: t(locale, "standing.fix.skills"),
    },
  ];
  const blocking = checks.filter((check) => !check.ok);
  const explanations = explanationsForWorker(state, worker, locale);
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
          <p className="eyebrow">{t(locale, "standing.title")}</p>
          <h2>{blocking.length === 0 ? t(locale, "standing.clear") : t(locale, "standing.held")}</h2>
          <p>
            {blocking.length === 0 ? t(locale, "standing.clearDetail") : t(locale, "standing.heldDetail")}
          </p>
        </div>
        <span className={blocking.length === 0 ? "standingBadge ok" : "standingBadge hold"}>
          {blocking.length === 0 ? t(locale, "standing.inQueue") : t(locale, "standing.toFix", { count: blocking.length })}
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
            <span className="standingState">{check.ok ? t(locale, "standing.passing") : t(locale, "standing.needsAttention")}</span>
          </li>
        ))}
      </ul>

      {lastClosed && (
        <div className="standingLastJob">
          <strong>{t(locale, "standing.lastJob")}</strong>
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
          <p className="standingMissesHead">{t(locale, "standing.misses")}</p>
          {recentMisses.map((item) => (
            <div key={item.receiptId}>
              <strong>{item.jobId}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
          <small>{t(locale, "standing.missesHint")}</small>
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
