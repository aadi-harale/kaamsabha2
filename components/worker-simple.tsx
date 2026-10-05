"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AppState, ChallengeCategory, DecisionReceipt, Job, Locale, SuggestionCategory, Worker } from "@/lib/domain";
import { addIssueNote, castVote, openChallenge, openIssue, reviewPolicyImpact, submitPolicySuggestion } from "@/lib/commands";
import { summarizeWorkerEarnings, workerEarningEntries } from "@/lib/earnings";
import { t } from "@/lib/messages";
import { workerService, workerStatus, workerText, type WorkerCopyKey } from "@/lib/worker-copy";
import { WorkerDecisionReasons } from "@/components/allocation-reasons";

type Run = (fn: () => AppState, message?: string) => boolean;
type WorkerProps = { state: AppState; worker: Worker; run: Run };
type Choice<T extends string> = { value: T; label: WorkerCopyKey; icon: string };

const helpChoices: Choice<string>[] = [
  { value: "pay", label: "pay", icon: "₹" },
  { value: "safety", label: "safety", icon: "!" },
  { value: "scope", label: "scope", icon: "+" },
  { value: "travel", label: "travel", icon: "↔" },
  { value: "interaction", label: "interaction", icon: "☏" },
  { value: "other", label: "other", icon: "…" },
];
const ideaChoices: Choice<SuggestionCategory>[] = [
  { value: "pay", label: "payIdea", icon: "₹" },
  { value: "dispatch", label: "jobsIdea", icon: "⇄" },
  { value: "safety", label: "safetyIdea", icon: "!" },
  { value: "scope", label: "scopeIdea", icon: "+" },
  { value: "access", label: "accessIdea", icon: "▣" },
  { value: "other", label: "other", icon: "…" },
];
const checkChoices: Choice<ChallengeCategory>[] = [
  { value: "opportunity", label: "jobOrder", icon: "⇄" },
  { value: "workload", label: "workHours", icon: "◷" },
  { value: "eligibility", label: "skills", icon: "✓" },
  { value: "pay", label: "pay", icon: "₹" },
  { value: "federation", label: "coop", icon: "⌂" },
  { value: "other", label: "other", icon: "…" },
];

function helpLabel(category: string) {
  const legacy: Record<string, WorkerCopyKey> = {
    "Safety / workability": "safety", "Payment / payout": "pay", "Booked scope": "scope",
    "Service area / travel": "travel", "Customer interaction": "interaction", "Other": "other",
  };
  return helpChoices.find(c => c.value === category)?.label ?? legacy[category];
}

function Choices<T extends string>({ name, legend, choices, value, onChange, locale, hideLegend = false }: {
  name: string; legend: string; choices: Choice<T>[]; value: T | ""; onChange: (value: T) => void; locale: Locale; hideLegend?: boolean;
}) {
  return <fieldset className="workerChoices">
    <legend className={hideLegend ? "srOnly" : undefined}>{legend}</legend>
    <div className="workerChoiceGrid">{choices.map(choice => <label key={choice.value} className={value === choice.value ? "workerChoice selected" : "workerChoice"}>
      <input type="radio" name={name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} required />
      <span className="workerChoiceIcon" aria-hidden="true">{choice.icon}</span>
      <span>{workerText(locale, choice.label)}</span>
    </label>)}</div>
  </fieldset>;
}

function JobLabel({ job, locale }: { job: Job; locale: Locale }) {
  return <>{workerService(locale, job.service)} — {job.locality} ({job.id})</>;
}

function participates(receipt: DecisionReceipt, workerId: string) {
  return receipt.workerId === workerId || receipt.candidateWorkerIds?.includes(workerId) || receipt.candidateSnapshot?.some(c => c.workerId === workerId);
}

export function WorkerFair({ state, worker, run }: WorkerProps) {
  const [checkJob, setCheckJob] = useState<string | null>(null);
  const checkHeading = useRef<HTMLHeadingElement>(null);
  const locale = state.locale;
  const receipts = state.receipts.filter(r => participates(r, worker.id));
  useEffect(() => { if (checkJob) checkHeading.current?.focus(); }, [checkJob]);

  return <div className="workerSimple">
    <p className="workerIntro">{workerText(locale, "fairIntro")}</p>
    {checkJob ? <section className="workerPaper">
      <button type="button" className="workerBack" onClick={() => setCheckJob(null)}>{workerText(locale, "back")}</button>
      <h2 ref={checkHeading} tabIndex={-1}>{workerText(locale, "checkHeading")}</h2>
      <DecisionCheck key={checkJob} state={state} worker={worker} run={run} initialJob={checkJob} />
    </section> : <WorkerDecisionReasons state={state} worker={worker} locale={locale} simple canChallenge={jobId => receipts.some(r => r.jobId === jobId)} onChallenge={jobId => setCheckJob(jobId)} />}
    <p className="workerAssurance"><span aria-hidden="true">✓</span>{workerText(locale, "noPenalty")}</p>
    <section className="workerRecords" aria-label={workerText(locale, "checks")}>
      <h2>{workerText(locale, "checks")}</h2>
      {!state.challenges.some(c => c.workerId === worker.id) && <p className="workerEmpty">{workerText(locale, "noChecks")}</p>}
      {state.challenges.filter(c => c.workerId === worker.id).map(c => <article className="workerRecord" key={c.id}>
        <span className="workerStatus">{workerStatus(locale, c.status)}</span>
        <strong>{state.jobs.find(j => j.id === c.jobId) ? <JobLabel job={state.jobs.find(j => j.id === c.jobId)!} locale={locale} /> : c.jobId}</strong>
        <p>{c.reason}</p>
        {c.status === "open" && <p>{workerText(locale, "nextCheck")}</p>}
        {c.adminNote && <p><b>{workerText(locale, "response")}: </b>{c.adminNote}</p>}
        {c.remedy && <p>{c.remedy}</p>}
        <details className="workerMore"><summary>{workerText(locale, "savedRecord")}</summary>
          <p>{c.replayResult?.summary ?? c.replaySummary}</p>
          {c.decisionSnapshot && <dl className="workerFacts">
            <div><dt>{t(locale, "replay.constitution")}</dt><dd>{c.decisionSnapshot.policyVersion}</dd></div>
            <div><dt>{t(locale, "fact.payout")}</dt><dd>₹{c.decisionSnapshot.protectedPayout}</dd></div>
            <div><dt>{t(locale, "replay.selectedMember")}</dt><dd>{state.workers.find(w => w.id === c.decisionSnapshot?.selectedWorkerId)?.name ?? c.decisionSnapshot.selectedWorkerId}</dd></div>
          </dl>}
        </details>
      </article>)}
    </section>
  </div>;
}

function DecisionCheck({ state, worker, run, initialJob }: WorkerProps & { initialJob?: string }) {
  const locale = state.locale;
  const receipts = state.receipts.filter(r => participates(r, worker.id));
  const [receiptId, setReceiptId] = useState(receipts.find(r => r.jobId === initialJob)?.id ?? receipts[0]?.id ?? "");
  const [category, setCategory] = useState<ChallengeCategory | "">("");
  const [statement, setStatement] = useState("");
  const receipt = receipts.find(r => r.id === receiptId) ?? receipts[0];
  const existing = state.challenges.find(c => c.workerId === worker.id && c.jobId === receipt?.jobId && c.status !== "closed");
  if (!receipt) return <p>{workerText(locale, "noJobsHelp")}</p>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receipt || !category || existing) return;
    const label = checkChoices.find(c => c.value === category)!.label;
    if (run(() => openChallenge(state, receipt.jobId, {
      receiptId: receipt.id, category,
      statement: statement.trim() || workerText(locale, label),
      desiredOutcome: workerText(locale, "checkIntro"),
    }), workerText(locale, "checkSent"))) setStatement("");
  }

  return <form className="workerForm" onSubmit={submit}>
    <p>{workerText(locale, "checkIntro")}</p>
    <label className="field"><span>{workerText(locale, "job")}</span><select value={receipt.id} onChange={e => { setReceiptId(e.target.value); setCategory(""); }}>
      {receipts.map(r => { const job = state.jobs.find(j => j.id === r.jobId); return <option key={r.id} value={r.id}>{job ? `${workerService(locale, job.service)} — ${job.locality} (${job.id})` : r.jobId}</option>; })}
    </select></label>
    {existing ? <p className="workerFeedback" role="status">{workerStatus(locale, existing.status)}. {workerText(locale, "checks")}: {existing.jobId}</p> : <>
      <Choices name="check-category" legend={workerText(locale, "checkHeading")} choices={checkChoices} value={category} onChange={setCategory} locale={locale} />
      <label className="field"><span>{workerText(locale, "optional")}</span><textarea value={statement} onChange={e => setStatement(e.target.value)} rows={3} maxLength={1200} /></label>
      <button className="workerPrimary" disabled={!category}>{workerText(locale, "send")}</button>
    </>}
    <details className="workerMore"><summary>{workerText(locale, "savedRecord")}</summary>
      <p>{receipt.jobId}: {receipt.policyVersion}</p><p>{receipt.reason}</p><p>{receipt.federationReason}</p>
    </details>
  </form>;
}

export function WorkerIssues({ state, worker, run }: WorkerProps) {
  const locale = state.locale;
  const jobs = state.jobs.filter(j => j.workerId === worker.id);
  const [category, setCategory] = useState("");
  const [jobId, setJobId] = useState(jobs.find(j => !["settled", "cancelled"].includes(j.status))?.id ?? "");
  const [details, setDetails] = useState("");
  const issues = state.issues.filter(i => i.openedBy === worker.id || jobs.some(j => j.id === i.jobId));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return;
    if (run(() => {
      let next = openIssue(state, worker.id, category, jobId || undefined);
      if (details.trim()) next = addIssueNote(next, next.issues[0].id, details);
      return next;
    }, workerText(locale, "helpSent"))) { setCategory(""); setDetails(""); }
  }

  return <div className="workerSimple">
    <section className="workerPaper">
      <h2>{workerText(locale, "helpIntro")}</h2>
      <p>{workerText(locale, "helpNote")}</p>
      <form className="workerForm" onSubmit={submit}>
        <Choices name="help-category" legend={workerText(locale, "helpIntro")} choices={helpChoices} value={category} onChange={setCategory} locale={locale} hideLegend />
        {category === "safety" && <p className="workerFeedback">{workerText(locale, "safetyHelp")}</p>}
        <label className="field"><span>{workerText(locale, "relatedJob")}</span><select value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">{workerText(locale, "general")}</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{workerService(locale, j.service)} — {j.locality} ({j.id})</option>)}
        </select></label>
        <label className="field"><span>{workerText(locale, "optional")}</span><textarea rows={3} maxLength={1200} value={details} onChange={e => setDetails(e.target.value)} placeholder={workerText(locale, "describeHelp")} /></label>
        <button className="workerPrimary" disabled={!category}>{workerText(locale, "send")}</button>
      </form>
    </section>
    <p className="workerAssurance"><span aria-hidden="true">✓</span>{workerText(locale, "noPenalty")}</p>
    <section className="workerRecords"><h2>{workerText(locale, "requests")}</h2>
      {!issues.length && <p className="workerEmpty">{workerText(locale, "noRequests")}</p>}
      {issues.map(issue => <HelpRecord key={issue.id} issue={issue} state={state} run={run} />)}
    </section>
  </div>;
}

function HelpRecord({ issue, state, run }: { issue: AppState["issues"][number]; state: AppState; run: Run }) {
  const [note, setNote] = useState("");
  const locale = state.locale;
  const label = helpLabel(issue.category);
  const job = state.jobs.find(j => j.id === issue.jobId);
  return <article className="workerRecord">
    <span className="workerStatus">{workerStatus(locale, issue.status)}</span>
    <strong>{label ? workerText(locale, label) : issue.category}</strong>
    <p>{job ? <JobLabel job={job} locale={locale} /> : workerText(locale, "general")}</p>
    <p>{issue.status === "open" ? workerText(locale, "helpStatus") : null}</p>
    {issue.notes.map((text, i) => <p className="workerNote" key={i}>{text.startsWith("Cooperative:") && <b>{workerText(locale, "response")}: </b>}{text.replace(/^(?:Worker W\d+|Customer [^:]+|Cooperative):\s*/, "")}</p>)}
    {issue.status !== "closed" && <details className="workerMore"><summary>{workerText(locale, "addInfo")}</summary>
      <form className="workerForm" onSubmit={e => { e.preventDefault(); if (note.trim() && run(() => addIssueNote(state, issue.id, note), workerText(locale, "updated"))) setNote(""); }}>
        <label className="field"><span>{workerText(locale, "addInfo")}</span><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} required maxLength={1200} /></label>
        <button className="secondary" disabled={!note.trim()}>{workerText(locale, "sendInfo")}</button>
      </form>
    </details>}
  </article>;
}

export function WorkerSuggestions({ state, worker, run }: WorkerProps) {
  const locale = state.locale;
  const [category, setCategory] = useState<SuggestionCategory | "">("");
  const [details, setDetails] = useState("");
  const ideas = state.suggestions.filter(s => s.workerId === worker.id);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || details.trim().length < 10) return;
    if (run(() => submitPolicySuggestion(state, { category, title: details.trim().slice(0, 60), details }), workerText(locale, "ideaSent"))) { setDetails(""); setCategory(""); }
  }
  return <div className="workerSimple">
    <section className="workerPaper"><h2>{workerText(locale, "ideasIntro")}</h2><p>{workerText(locale, "ideasNote")}</p>
      <form className="workerForm" onSubmit={submit}>
        <Choices name="idea-category" legend={workerText(locale, "ideaAbout")} choices={ideaChoices} value={category} onChange={setCategory} locale={locale} />
        <div><label className="field"><span>{workerText(locale, "ideaWords")}</span><textarea rows={4} value={details} onChange={e => setDetails(e.target.value)} required minLength={10} maxLength={2400} aria-describedby="idea-hint" placeholder={workerText(locale, "ideaHint")} /></label><small id="idea-hint">{workerText(locale, "ideaLength")}</small></div>
        <button className="workerPrimary" disabled={!category || details.trim().length < 10}>{workerText(locale, "sendIdea")}</button>
      </form>
    </section>
    <p className="workerAssurance">{workerText(locale, "ideaProcess")}</p>
    <section className="workerRecords"><h2>{workerText(locale, "myIdeas")}</h2>
      {!ideas.length && <p className="workerEmpty">{workerText(locale, "noIdeas")}</p>}
      {ideas.map(idea => <article className="workerRecord" key={idea.id}>
        <span className="workerStatus">{workerStatus(locale, idea.status)}</span><p className="workerIdeaText">{idea.details}</p>
        <small>{workerText(locale, ideaChoices.find(c => c.value === idea.category)!.label)}</small>
      </article>)}
    </section>
  </div>;
}

export function WorkerHomeEarnings({ state, worker, onSeePayments }: {
  state: AppState; worker: Worker; onSeePayments: () => void;
}) {
  const locale = state.locale;
  const earnings = summarizeWorkerEarnings(state, worker.id);
  return <section className="workerHomeEarnings" aria-label={workerText(locale, "money")}>
    <div className="workerHomeBalance">
      <h2>{workerText(locale, "moneyTotal")}</h2>
      <strong aria-live="polite" aria-atomic="true">₹{earnings.total.toLocaleString("en-IN")}</strong>
      <span>{workerText(locale, "paidJobs")}: <b>{earnings.completedJobs}</b></span>
    </div>
    <button type="button" className="secondary" onClick={onSeePayments}>{workerText(locale, "seePayments")}</button>
    <p className="workerDemoNote">{workerText(locale, "demoMoney")}</p>
  </section>;
}

export function WorkerEarnings({ state, worker }: { state: AppState; worker: Worker }) {
  const locale = state.locale;
  const summary = summarizeWorkerEarnings(state, worker.id);
  const entries = workerEarningEntries(state, worker.id);
  const unpaid = state.jobs.filter(j => j.workerId === worker.id && j.status === "completed" && !state.settlements.some(s => s.jobId === j.id));
  const [showAll, setShowAll] = useState(false);
  const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  return <div className="workerSimple">
    <p className="workerIntro">{workerText(locale, "moneyIntro")}</p>
    <section className="workerMoney" aria-label={workerText(locale, "money")}>
      <span>{workerText(locale, "moneyTotal")}</span><strong>{money(summary.total)}</strong>
      <div><span>{workerText(locale, "paidJobs")}: <b>{summary.completedJobs}</b></span><span>{workerText(locale, "cancelMoney")}: <b>{money(summary.cancellationProtection)}</b></span></div>
    </section>
    <p className="workerDemoNote">{workerText(locale, "demoMoney")}</p>
    <section className="workerPaper"><h2>{workerText(locale, "payments")}</h2>
      {!entries.length && <p>{workerText(locale, "noPayments")}</p>}
      <ul className="workerPayments">{(showAll ? entries : entries.slice(0, 5)).map(entry => <li key={entry.id}>
        <div><strong>{entry.type === "cancellation" ? workerText(locale, "cancellationPayment") : workerText(locale, "workPayment", { service: workerService(locale, entry.service) })}</strong>
          <span>{new Date(entry.earnedAt).toLocaleDateString(locale === "en" ? "en-IN" : `${locale}-IN`, { day: "numeric", month: "short", year: "numeric" })}</span>
          <small>{workerText(locale, entry.id.startsWith("LIVE-") ? "live" : "sample")}</small>
        </div><b>{money(entry.amount)}</b>
      </li>)}</ul>
      {entries.length > 5 && <button type="button" className="secondary" aria-expanded={showAll} onClick={() => setShowAll(v => !v)}>{workerText(locale, showAll ? "close" : "allPayments")}</button>}
    </section>
    {unpaid.length > 0 && <section className="workerPaper"><h2>{workerText(locale, "unpaid")}</h2><p>{workerText(locale, "unpaidNote")}</p>{unpaid.map(j => <p key={j.id}><JobLabel job={j} locale={locale} /></p>)}</section>}
    <details className="workerMore workerPaper"><summary>{workerText(locale, "breakdown")}</summary><dl className="workerFacts">
      <div><dt>{workerText(locale, "completedWork")}</dt><dd>{money(summary.total - summary.cancellationProtection)}</dd></div>
      <div><dt>{workerText(locale, "cancelMoney")}</dt><dd>{money(summary.cancellationProtection)}</dd></div>
      <div><dt>{workerText(locale, "moneyTotal")}</dt><dd>{money(summary.total)}</dd></div>
    </dl></details>
  </div>;
}

export function WorkerGovernance({ state, worker, run }: WorkerProps) {
  // Keying the ballot to its proposal prevents a previous choice carrying into a new vote.
  const proposal = state.proposals.find(p => p.status === "voting") ?? state.proposals[0];
  return <div className="workerSimple"><p className="workerIntro">{workerText(state.locale, "votesIntro")}</p>
    {proposal ? <WorkerBallot key={proposal.id} state={state} worker={worker} run={run} proposal={proposal} /> : <p className="workerEmpty">{workerText(state.locale, "noVote")}</p>}
  </div>;
}

function WorkerBallot({ state, worker, run, proposal }: WorkerProps & { proposal: AppState["proposals"][number] }) {
  const [choice, setChoice] = useState<"yes" | "no" | "">("");
  const [reason, setReason] = useState("");
  const locale = state.locale;
  const reviewed = state.policyReviews.some(r => r.proposalId === proposal.id && r.memberId === worker.id);
  const votes = state.votes.filter(v => v.proposalId === proposal.id);
  const voted = votes.find(v => v.memberId === worker.id);
  const sim = proposal.simulation;
  const delta = sim.proposedFloor - sim.currentFloor;
  const open = proposal.status === "voting";

  return <section className="workerPaper workerBallot">
    <h2>{workerText(locale, "rulesChange")}</h2>{open && !voted && <p>{workerText(locale, "votesNote")}</p>}
    <div className="workerPayChange" role="group" aria-label={workerText(locale, "minPay")}>
      <div><span>{workerText(locale, proposal.status === "active" ? "beforeChange" : "now")}</span><strong>₹{sim.currentFloor}</strong></div>
      <div><span>{workerText(locale, proposal.status === "active" ? "approvedRule" : "ifApproved")}</span><strong>₹{sim.proposedFloor}</strong></div>
    </div>
    <p><b>{workerText(locale, "minPay")}</b></p>
    {proposal.status !== "active" && <><p>{workerText(locale, delta > 0 ? "payIncrease" : delta < 0 ? "payDecrease" : "paySame", { amount: Math.abs(delta) })}</p>
      <p>{workerText(locale, "waitChange", { before: sim.currentMaxWait, after: sim.proposedMaxWait })}</p>
      <p className="workerDemoNote">{workerText(locale, "pastUnchanged")}</p></>}
    {proposal.status === "active" && <p className="workerFeedback">{workerText(locale, "ruleActive")}</p>}
    {voted ? <div className="workerFeedback" role="status"><strong>{workerText(locale, "voteRecorded")}: {workerText(locale, voted.choice)}</strong><p>{workerText(locale, "voteOnce")}</p>{voted.reason && <p>{voted.reason}</p>}</div>
      : !open ? proposal.status !== "active" && <p className="workerFeedback">{workerText(locale, proposal.status === "rejected" ? "voteClosed" : "noVote")}</p>
      : !reviewed ? <button type="button" className="workerPrimary" onClick={() => run(() => reviewPolicyImpact(state, proposal.id, worker.id), workerText(locale, "readyVote"))}>{workerText(locale, "understood")}</button>
      : <form className="workerForm" onSubmit={e => { e.preventDefault(); if (choice) run(() => castVote(state, proposal.id, worker.id, choice, reason), workerText(locale, "voteSent")); }}>
        <Choices name="ballot" legend={workerText(locale, "choice")} choices={[{ value: "yes", label: "yes", icon: "✓" }, { value: "no", label: "no", icon: "×" }]} value={choice} onChange={setChoice} locale={locale} />
        {choice === "no" && <label className="field"><span>{workerText(locale, "whyNo")}</span><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} required maxLength={1200} placeholder={workerText(locale, "whyNoHint")} /></label>}
        <button className="workerPrimary" disabled={!choice || (choice === "no" && !reason.trim())}>{workerText(locale, choice === "no" ? "confirmNo" : "confirmYes")}</button>
      </form>}
    <p className="workerParticipation">{workerText(locale, open ? "participation" : "voteResult", { count: votes.length, yes: votes.filter(v => v.choice === "yes").length, no: votes.filter(v => v.choice === "no").length })}</p>
    <details className="workerMore"><summary>{workerText(locale, "moreVote")}</summary>
      <p><b>{proposal.title}</b></p><p>{proposal.description}</p><p>{sim.note}</p>
      <dl className="workerFacts"><div><dt>{workerText(locale, "yes")}</dt><dd>{votes.filter(v => v.choice === "yes").length}</dd></div><div><dt>{workerText(locale, "no")}</dt><dd>{votes.filter(v => v.choice === "no").length}</dd></div></dl>
    </details>
  </section>;
}
