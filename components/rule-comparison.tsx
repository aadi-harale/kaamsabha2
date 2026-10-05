"use client";

import { useMemo, useState } from "react";
import type { AppState, Locale } from "@/lib/domain";
import { t } from "@/lib/messages";
import { compareRulebooks, JOB_MINUTES, rulebookText, type RuleOutcome } from "@/lib/rule-comparison";

/**
 * The one bold visual: same jobs, same members, one thing changed.
 *
 * Everything on this screen is computed from the register's own member records by
 * `lib/rule-comparison.ts`. Nothing is asserted and no number is illustrative. The alternative
 * is named for what it optimises, not for any company that might optimise that way.
 */

function Bars({ outcome, max, locale }: { outcome: RuleOutcome; max: number; locale: Locale }) {
  return (
    <ol className="ruleBars" aria-label={t(locale, "rule.distribution", { rule: rulebookText(outcome.rulebook, locale).name })}>
      {outcome.shares.map((share) => {
        const pct = max > 0 ? Math.round((share.jobs / max) * 100) : 0;
        return (
          <li key={share.workerId} className={share.jobs === 0 ? "ruleBar none" : "ruleBar"}>
            <span className="ruleBarName">{share.name.split(" ")[0]}</span>
            <span className="ruleBarTrack">
              <i style={{ width: `${Math.max(share.jobs > 0 ? 6 : 0, pct)}%` }} />
            </span>
            <span className="ruleBarCount">
              {share.jobs === 0 ? t(locale, "rule.noWork") : `${share.jobs}`}
              {share.finishedOverLimit && <b aria-hidden="true"> †</b>}
            </span>
            {/* Spoken to a screen reader in the same language the page is being read in. */}
            <span className="srOnly">
              {" "}
              {share.jobs === 0
                ? t(locale, "rule.sr.earnedNothing", { reason: share.shutOutReason })
                : `${t(locale, "rule.sr.took", { jobs: share.jobs, minutes: share.minutesAdded })}${
                    share.finishedOverLimit
                      ? ` ${t(locale, "rule.sr.overLimit", { limit: share.limit })}`
                      : ""
                  }`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Column({ outcome, max, locale }: { outcome: RuleOutcome; max: number; locale: Locale }) {
  const rule = outcome.rulebook;
  const words = rulebookText(rule, locale);
  return (
    <article className={rule.active ? "ruleColumn active" : "ruleColumn"}>
      <header>
        <span className="ruleBadge">{rule.active ? t(locale, "rule.inForce") : t(locale, "rule.counterfactual")}</span>
        <h3>{words.name}</h3>
        <p className="ruleDefinition">{words.rule}</p>
      </header>

      <dl className="ruleStats">
        <div>
          <dt>{t(locale, "rule.stat.earn")}</dt>
          <dd>
            {outcome.membersWithWork}
            <small> {t(locale, "rule.stat.of", { total: outcome.shares.length })}</small>
          </dd>
        </div>
        <div className={outcome.jobsPastSafeLimit > 0 ? "bad" : "good"}>
          <dt>{t(locale, "rule.stat.pastLimit")}</dt>
          <dd>{outcome.jobsPastSafeLimit}</dd>
        </div>
        <div>
          <dt>{t(locale, "rule.stat.busiest")}</dt>
          <dd>
            {outcome.busiestMemberJobs}
            <small> {outcome.busiestMemberName.split(" ")[0]}</small>
          </dd>
        </div>
        <div>
          <dt>{t(locale, "rule.stat.floor")}</dt>
          <dd>{rule.guaranteedFloor ? t(locale, "rule.yes") : <span className="none">{t(locale, "rule.none")}</span>}</dd>
        </div>
      </dl>

      <Bars outcome={outcome} max={max} locale={locale} />

      {outcome.shares.some((share) => share.finishedOverLimit) && (
        <p className="ruleFootnote">
          <b>†</b>{" "}
          {t(locale, rule.respectsDailyLimit ? "rule.footnote.bounded" : "rule.footnote.unbounded")}
        </p>
      )}

      <p className="ruleConsequence">{words.consequence}</p>

      {outcome.unfilled > 0 && (
        <p className="ruleTradeoff">
          <strong>{t(locale, "rule.unfilled", { count: outcome.unfilled })}</strong>{" "}
          {t(locale, "rule.unfilledBody")}
        </p>
      )}
    </article>
  );
}

export function RuleComparison({ state, locale = "en" }: { state: AppState; locale?: Locale }) {
  const [open, setOpen] = useState(false);
  const comparison = useMemo(
    () => compareRulebooks(state, undefined, undefined, locale),
    [state.workers, state.cooperatives, locale],
  );
  const [cooperative, alternative] = comparison.outcomes;
  const max = Math.max(1, ...comparison.outcomes.flatMap((o) => o.shares.map((s) => s.jobs)));

  if (!cooperative || !alternative) return null;

  return (
    <section className="ruleCompareBold" aria-label="Same jobs, same workers, different rule">
      <div className="ruleCompareHead">
        <p className="ruleCompareKicker">
          <span>{t(locale, "rule.kicker.jobs")}</span>
          <span>{t(locale, "rule.kicker.workers")}</span>
          <span className="different">{t(locale, "rule.kicker.rule")}</span>
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
          {t(locale, "rule.sub", { jobs: comparison.demand.length, members: cooperative.shares.length })}
        </p>
      </div>

      <div className="ruleColumns">
        <Column outcome={cooperative} max={max} locale={locale} />
        <Column outcome={alternative} max={max} locale={locale} />
      </div>

      <button
        type="button"
        className="ruleMethodToggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? t(locale, "rule.methodHide") : t(locale, "rule.methodShow")}
      </button>

      {open && (
        <div className="ruleMethod">
          <p>
            <strong>{t(locale, "rule.method.demandTitle")}</strong>{" "}
            {t(locale, "rule.method.demand", { jobs: comparison.demand.length, minutes: JOB_MINUTES })}
          </p>
          <p>
            <strong>{t(locale, "rule.method.checksTitle")}</strong>{" "}
            {t(locale, "rule.method.checks")}
          </p>
          <p>
            <strong>{t(locale, "rule.method.fairTitle")}</strong>{" "}
            {t(locale, "rule.method.fair")}
          </p>
          <p>
            <strong>{t(locale, "rule.method.readOnlyTitle")}</strong>{" "}
            {t(locale, "rule.method.readOnly")}
          </p>
          <details className="ruleShutOut">
            <summary>{t(locale, "rule.shutOutSummary")}</summary>
            {comparison.outcomes.map((outcome) => {
              const idle = outcome.shares.filter((share) => share.jobs === 0);
              if (!idle.length) return null;
              return (
                <div key={outcome.rulebook.id}>
                  <strong>{rulebookText(outcome.rulebook, locale).name}</strong>
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
