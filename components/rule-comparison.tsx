"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/domain";
import { compareRulebooks, JOB_MINUTES, type RuleOutcome } from "@/lib/rule-comparison";

/**
 * The one bold visual: same jobs, same members, one thing changed.
 *
 * Everything on this screen is computed from the register's own member records by
 * `lib/rule-comparison.ts`. Nothing is asserted and no number is illustrative. The alternative
 * is named for what it optimises, not for any company that might optimise that way.
 */

function Bars({ outcome, max }: { outcome: RuleOutcome; max: number }) {
  return (
    <ol className="ruleBars" aria-label={`Work distribution under ${outcome.rulebook.name}`}>
      {outcome.shares.map((share) => {
        const pct = max > 0 ? Math.round((share.jobs / max) * 100) : 0;
        return (
          <li key={share.workerId} className={share.jobs === 0 ? "ruleBar none" : "ruleBar"}>
            <span className="ruleBarName">{share.name.split(" ")[0]}</span>
            <span className="ruleBarTrack">
              <i style={{ width: `${Math.max(share.jobs > 0 ? 6 : 0, pct)}%` }} />
            </span>
            <span className="ruleBarCount">
              {share.jobs === 0 ? "none" : `${share.jobs}`}
              {share.finishedOverLimit && <b aria-hidden="true"> †</b>}
            </span>
            <span className="srOnly">
              {share.jobs === 0
                ? ` earned nothing. ${share.shutOutReason}`
                : ` took ${share.jobs} jobs, ${share.minutesAdded} minutes.${
                    share.finishedOverLimit
                      ? ` Finished the day over their own ${share.limit} minute limit.`
                      : ""
                  }`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Column({ outcome, max }: { outcome: RuleOutcome; max: number }) {
  const rule = outcome.rulebook;
  return (
    <article className={rule.active ? "ruleColumn active" : "ruleColumn"}>
      <header>
        <span className="ruleBadge">{rule.active ? "IN FORCE HERE" : "COUNTERFACTUAL"}</span>
        <h3>{rule.name}</h3>
        <p className="ruleDefinition">{rule.rule}</p>
      </header>

      <dl className="ruleStats">
        <div>
          <dt>Members who earn</dt>
          <dd>
            {outcome.membersWithWork}
            <small> of {outcome.shares.length}</small>
          </dd>
        </div>
        <div className={outcome.jobsPastSafeLimit > 0 ? "bad" : "good"}>
          <dt>Jobs given to someone already at their limit</dt>
          <dd>{outcome.jobsPastSafeLimit}</dd>
        </div>
        <div>
          <dt>Most work taken by one member</dt>
          <dd>
            {outcome.busiestMemberJobs}
            <small> {outcome.busiestMemberName.split(" ")[0]}</small>
          </dd>
        </div>
        <div>
          <dt>Guaranteed payout floor</dt>
          <dd>{rule.guaranteedFloor ? "Yes" : <span className="none">None</span>}</dd>
        </div>
      </dl>

      <Bars outcome={outcome} max={max} />

      {outcome.shares.some((share) => share.finishedOverLimit) && (
        <p className="ruleFootnote">
          <b>†</b>{" "}
          {rule.respectsDailyLimit
            ? "Finished the day over their own limit because a job they had already started ran past it. This rule stops new work at the limit; it does not stop a member mid-job."
            : "Finished the day over their own limit. This rule has no limit to stop at, so the over-run is not bounded by one job."}
        </p>
      )}

      <p className="ruleConsequence">{rule.consequence}</p>

      {outcome.unfilled > 0 && (
        <p className="ruleTradeoff">
          <strong>
            {outcome.unfilled} job{outcome.unfilled === 1 ? "" : "s"} went unfilled.
          </strong>{" "}
          This rule refuses rather than overworking a member. Federation is how the customer still
          gets served — a nearby cooperative with safe capacity takes the job.
        </p>
      )}
    </article>
  );
}

export function RuleComparison({ state }: { state: AppState }) {
  const [open, setOpen] = useState(false);
  const comparison = useMemo(() => compareRulebooks(state), [state.workers, state.cooperatives]);
  const [cooperative, alternative] = comparison.outcomes;
  const max = Math.max(1, ...comparison.outcomes.flatMap((o) => o.shares.map((s) => s.jobs)));

  if (!cooperative || !alternative) return null;

  return (
    <section className="ruleCompareBold" aria-label="Same jobs, same workers, different rule">
      <div className="ruleCompareHead">
        <p className="ruleCompareKicker">
          <span>SAME JOBS</span>
          <span>SAME WORKERS</span>
          <span className="different">DIFFERENT RULE</span>
        </p>
        <h2>{comparison.lead}</h2>
        {comparison.proof.length > 0 && (
          <ul className="ruleProof">
            {comparison.proof.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <p className="ruleCompareSub">
          Both columns run the same {comparison.demand.length} jobs through the same{" "}
          {cooperative.shares.length} certified members, starting from the same workloads. Only the
          rule changes.
        </p>
      </div>

      <div className="ruleColumns">
        <Column outcome={cooperative} max={max} />
        <Column outcome={alternative} max={max} />
      </div>

      <button
        type="button"
        className="ruleMethodToggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide how this is calculated" : "How is this calculated?"}
      </button>

      {open && (
        <div className="ruleMethod">
          <p>
            <strong>Synthetic demand, real members.</strong> The {comparison.demand.length} jobs are
            generated from deterministic seed 26089, so this comparison is identical on every
            machine and every run. The members, their certifications, their ratings and their
            starting workloads are the register&apos;s own records. Each job adds {JOB_MINUTES}{" "}
            minutes, equally under both rules.
          </p>
          <p>
            <strong>Both rules check certification first.</strong> Neither rule dispatches an
            unverified or uncertified member. The contrast is only in what happens next: this
            cooperative orders by who has least work booked and stops at each member&apos;s own
            daily limit; the other orders by rating and has no limit to stop at.
          </p>
          <p>
            <strong>This is a counterfactual, not an accusation.</strong> &ldquo;Rating-ranked
            dispatch&rdquo; is a rule definition, stated above in full so you can judge it
            yourself. It is not a claim about how any particular company allocates work.
          </p>
          <p>
            <strong>It changes nothing.</strong> The comparison is read-only. It cannot dispatch a
            job, alter a member, or influence a real allocation, and the test suite pins that.
          </p>
          <details className="ruleShutOut">
            <summary>Why each member earned nothing, rule by rule</summary>
            {comparison.outcomes.map((outcome) => {
              const idle = outcome.shares.filter((share) => share.jobs === 0);
              if (!idle.length) return null;
              return (
                <div key={outcome.rulebook.id}>
                  <strong>{outcome.rulebook.name}</strong>
                  <ul>
                    {idle.map((share) => (
                      <li key={share.workerId}>
                        <b>{share.name}</b> — {share.shutOutReason}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </details>
        </div>
      )}
    </section>
  );
}
