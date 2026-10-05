"use client";

import { useMemo } from "react";
import type { AppState, PolicyProposal, Worker } from "@/lib/domain";
import { memberPolicyTwin } from "@/lib/policy-twin";
import { workerService, workerText } from "@/lib/worker-copy";

export function WorkerPolicyTwin({ state, proposal, worker }: { state: AppState; proposal: PolicyProposal; worker: Worker }) {
  const locale = state.locale;
  const twin = useMemo(() => memberPolicyTwin(state, proposal, worker), [state, proposal, worker]);
  const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
  const name = locale === "en" ? worker.name : worker.nameDevanagari || worker.name;
  const approved = proposal.status === "active";
  return <section className="workerPolicyTwin" aria-labelledby={`twin-${proposal.id}`}>
    <h3 id={`twin-${proposal.id}`}>{workerText(locale, "twinHeading")}</h3>
    <p>{workerText(locale, "twinIntro")}</p>
    <div className="workerTwinRules" role="group" aria-label={workerText(locale, "minPay")}>
      <div><span>{workerText(locale, approved ? "beforeChange" : "now")}</span><strong>{money(twin.before.floor)}</strong></div>
      <div><span>{workerText(locale, approved ? "approvedRule" : "ifApproved")}</span><strong>{money(twin.after.floor)}</strong></div>
    </div>
    <p>{workerText(locale, "twinFloorEffect", { before: twin.before.floor, after: twin.after.floor })}</p>
    <div className="workerTwinPersonal">
      <h4>{workerText(locale, "twinForYou", { name })}</h4>
      {twin.mine.length ? <><p>{workerText(locale, "twinOwnJobs", { count: twin.mine.length })}</p>
        <dl className="workerTwinTotals"><div><dt>{workerText(locale, "twinOldPay")}</dt><dd>{money(twin.myCurrent)}</dd></div><div><dt>{workerText(locale, "twinNewPay")}</dt><dd>{money(twin.myProposed)}</dd></div></dl>
        <p>{workerText(locale, "twinDifference", { amount: money(twin.myProposed - twin.myCurrent) })}</p></>
        : <p>{workerText(locale, "twinNoOwnJobs")}</p>}
      <p className="workerDemoNote">{workerText(locale, "twinPayBasis")}</p>
    </div>
    <p>{workerText(locale, "twinSameOrder")}</p>
    <p>{workerText(locale, "twinSameSafety")}</p>
    <p>{workerText(locale, "twinWait", { before: twin.before.wait, after: twin.after.wait })}</p>
    <p className="workerDemoNote">{workerText(locale, "twinWaitLimit")}</p>
    <details className="workerMore workerTwinEvidence"><summary>{workerText(locale, "twinEvidence")}</summary>
      <p>{workerText(locale, "twinCooperativeBasis", { count: twin.cooperative.length, changed: twin.changedJobs })}</p>
      {twin.cooperative.length > 0 && <><dl className="workerTwinTotals"><div><dt>{workerText(locale, "twinOldPay")}</dt><dd>{money(twin.cooperativeCurrent)}</dd></div><div><dt>{workerText(locale, "twinNewPay")}</dt><dd>{money(twin.cooperativeProposed)}</dd></div></dl>
        <ul className="workerTwinJobs">{twin.cooperative.map(row => <li key={row.receiptId}><strong>{row.jobId} / {workerService(locale, row.service)}</strong><span>{money(row.currentPay)} → {money(row.proposedPay)}</span><small>{locale === "en" ? state.workers.find(w => w.id === row.workerId)?.name ?? row.workerId : state.workers.find(w => w.id === row.workerId)?.nameDevanagari ?? row.workerId}</small></li>)}</ul></>}
      {twin.excludedCount > 0 && <p>{workerText(locale, "twinExcluded", { count: twin.excludedCount })}</p>}
      {!twin.cooperative.length && <p>{workerText(locale, "twinEmpty")}</p>}
      <p className="workerDemoNote">{workerText(locale, "olderRecordsUnchanged")}</p>
    </details>
  </section>;
}
