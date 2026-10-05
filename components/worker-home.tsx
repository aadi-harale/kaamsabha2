"use client";

import { useState, type ReactNode } from "react";
import type { AppState, Job, Worker } from "@/lib/domain";
import { addEvidence, declineJobSafely, transitionJob, updateWorkability } from "@/lib/commands";
import { proposePreStartScopeChange } from "@/lib/prestart-scope";
import { jobFlow } from "@/lib/job-flow";
import { workerNextAction } from "@/lib/worker-guidance";
import { workerService, workerText } from "@/lib/worker-copy";
import { WorkerStanding } from "@/components/allocation-reasons";
import { JobFlowTrack } from "@/components/job-flow-view";
import { WorkerOtpPanel } from "@/components/otp-panel";
import { ServiceMap } from "@/components/service-map";
import { WorkerRuleChange } from "@/components/worker-rule-change";

type Run = (fn: () => AppState, message?: string) => boolean;
type Props = { state: AppState; worker: Worker; job?: Job; now: number; run: Run;
  verifyOtp: (id: string, purpose: "start" | "completion", code: string) => Promise<void>; onSeeVotes: () => void };

/** Maps mount only when requested; they cannot push the task button down the page. */
function WorkerDetail({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <details className="workerHomeDetail" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{label}</summary>{open && <div className="workerHomeDetailBody">{children}</div>}
  </details>;
}

export function WorkerHome({ state, worker, job, now, run, verifyOtp, onSeeVotes }: Props) {
  const locale = state.locale;
  return <div className="workerHome">
    {job ? <WorkerTask key={job.id} state={state} worker={worker} job={job} now={now} run={run} verifyOtp={verifyOtp} />
      : <section className="workerTask workerQueue"><h2>{workerText(locale, worker.available ? "queueReady" : "queuePaused")}</h2>
        <WorkerDetail label={workerText(locale, "whyWaiting")}><WorkerStanding state={state} worker={worker} locale={locale} /></WorkerDetail>
      </section>}
    <WorkerDetail label={workerText(locale, "workLimits")}><WorkerLimits state={state} worker={worker} run={run} /></WorkerDetail>
    <WorkerRuleChange state={state} worker={worker} onSeeVotes={onSeeVotes} />
  </div>;
}

function WorkerTask({ state, worker, job, now, run, verifyOtp }: Omit<Props, "onSeeVotes"> & { job: Job }) {
  const locale = state.locale;
  const [declineReason, setDeclineReason] = useState("Safety concern");
  const [scopeText, setScopeText] = useState("");
  const [scopeAmount, setScopeAmount] = useState(180);
  const next = jobFlow(job, "worker", now, locale);
  const action = workerNextAction(job, now);
  const pending = job.changeOrders.find(c => c.approved === undefined);
  const receipt = state.receipts.find(r => r.id === job.receiptId);

  return <>
    <section className="workerTask" aria-label={workerText(locale, "currentJob")}>
      <header className="workerTaskHeader">
        <div><h2>{workerService(locale, job.service)}</h2><p>{job.locality}</p></div>
        <div className="workerJobPay"><span>{workerText(locale, "agreedPay")}</span><strong>₹{job.amount.toLocaleString("en-IN")}</strong></div>
      </header>
      {job.intakeNote && <p className="workerBookedWork"><b>{workerText(locale, "bookedWork")}: </b>{job.intakeNote}</p>}
      <div className="workerNextAction">
        <h3>{workerText(locale, "nextAction")}</h3><p>{next.nextStep}</p>
        {action === "accept" && <button className="workerPrimary" onClick={() => run(() => transitionJob(state, job.id, "accepted"), workerText(locale, "acceptedJob"))}>{workerText(locale, "acceptJob")}</button>}
        {action === "travel" && <button className="workerPrimary" onClick={() => run(() => transitionJob(state, job.id, "travelling"))}>{workerText(locale, "startTravel")}</button>}
        {action === "arrive" && <button className="workerPrimary" onClick={() => run(() => transitionJob(state, job.id, "arrived"))}>{workerText(locale, "markArrived")}</button>}
        {action === "proof" && <button className="workerPrimary" onClick={() => run(() => addEvidence(state, job.id, `Work proof ${job.evidence.length + 1}`), workerText(locale, "proofAdded"))}>{workerText(locale, "addProof")}</button>}
        {action === "start-code" && <WorkerOtpPanel job={job} purpose="start" onVerify={verifyOtp} locale={locale} />}
        {action === "finish-code" && <WorkerOtpPanel job={job} purpose="completion" onVerify={verifyOtp} locale={locale} />}
        {pending && <p className="workerPendingScope">{pending.description} (+₹{pending.amountDelta})</p>}
      </div>
      {job.status === "assigned" && <WorkerDetail label={workerText(locale, "safeDeclineTitle")}>
        <p>{workerText(locale, "safeDeclineNote")}</p>
        <label className="field"><span>{workerText(locale, "declineReason")}</span><select aria-label={workerText(locale, "declineReason")} value={declineReason} onChange={e => setDeclineReason(e.target.value)}>
          <option value="Safety concern">{workerText(locale, "safety")}</option>
          <option value="Out of booked scope">{workerText(locale, "scope")}</option>
          <option value="Schedule conflict">{workerText(locale, "workHours")}</option>
          <option value="Service area conflict">{workerText(locale, "travel")}</option>
          <option value="Other workability reason">{workerText(locale, "other")}</option>
        </select></label>
        <button className="secondary" onClick={() => run(() => declineJobSafely(state, job.id, declineReason), workerText(locale, "safeDeclineDone"))}>{workerText(locale, "safeDecline")}</button>
      </WorkerDetail>}
      {job.status === "arrived" && <WorkerDetail label={workerText(locale, "scopeChange")}>
        <p>{workerText(locale, "scopeChangeNote")}</p>
        <form className="workerScopeForm" onSubmit={e => { e.preventDefault(); run(() => proposePreStartScopeChange(state, job.id, scopeText, scopeAmount), workerText(locale, "scopeSent")); }}>
          <label className="field"><span>{workerText(locale, "extraWork")}</span><input value={scopeText} onChange={e => setScopeText(e.target.value)} required maxLength={1200} /></label>
          <label className="field"><span>{workerText(locale, "extraAmount")}</span><input type="number" min={0} step={1} value={scopeAmount} onChange={e => setScopeAmount(Number(e.target.value))} required /></label>
          <button className="secondary" disabled={!scopeText.trim()}>{workerText(locale, "sendAddition")}</button>
        </form>
      </WorkerDetail>}
    </section>
    <WorkerDetail label={workerText(locale, "mapDirections")}><ServiceMap job={job} workerName={worker.name} mode="worker" /></WorkerDetail>
    <WorkerDetail label={workerText(locale, "jobDetails")}>
      <JobFlowTrack job={job} viewer="worker" locale={locale} />
      <dl className="workerFacts"><div><dt>{workerText(locale, "jobRecord")}</dt><dd>{job.id}</dd></div>
        {receipt && <div><dt>{workerText(locale, "workRules")}</dt><dd>{receipt.policyVersion}</dd></div>}
        {job.evidence.map(proof => <div key={proof.id}><dt>{workerText(locale, "addProof")}</dt><dd>{proof.label}</dd></div>)}
        {job.changeOrders.map(change => <div key={change.id}><dt>{workerText(locale, "extraWork")}</dt><dd>{change.description}: {change.approved === true ? workerText(locale, "yes") : change.approved === false ? workerText(locale, "no") : workerText(locale, "checkWaiting")}</dd></div>)}
      </dl>
    </WorkerDetail>
  </>;
}

function WorkerLimits({ state, worker, run }: { state: AppState; worker: Worker; run: Run }) {
  const locale = state.locale;
  const [available, setAvailable] = useState(worker.available);
  const [limit, setLimit] = useState(worker.maxDailyMinutes ?? 480);
  const [rest, setRest] = useState(worker.minRestMinutes ?? 30);
  return <form className="workerLimitsForm" onSubmit={e => { e.preventDefault(); run(() => updateWorkability(state, { available, maxDailyMinutes: limit, minRestMinutes: rest }), workerText(locale, "limitsSaved")); }}>
    <label className="workerAvailable"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} />{workerText(locale, "availableJobs")}</label>
    <label className="field"><span>{workerText(locale, "maxHours")}</span><select aria-label={workerText(locale, "maxHours")} value={limit} onChange={e => setLimit(Number(e.target.value))}>
      {[360, 420, 480, ...(worker.maxDailyMinutes && ![360, 420, 480].includes(worker.maxDailyMinutes) ? [worker.maxDailyMinutes] : [])].map(minutes => <option key={minutes} value={minutes}>{workerText(locale, "hours", { count: minutes / 60 })}</option>)}
    </select></label>
    <label className="field"><span>{workerText(locale, "restGap")}</span><select aria-label={workerText(locale, "restGap")} value={rest} onChange={e => setRest(Number(e.target.value))}>
      {[30, 60, 90, ...(worker.minRestMinutes && ![30, 60, 90].includes(worker.minRestMinutes) ? [worker.minRestMinutes] : [])].map(minutes => <option key={minutes} value={minutes}>{workerText(locale, "minutes", { count: minutes })}</option>)}
    </select></label>
    <button className="secondary">{workerText(locale, "saveLimits")}</button>
  </form>;
}
