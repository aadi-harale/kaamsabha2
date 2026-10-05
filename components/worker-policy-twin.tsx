"use client";

import { useMemo, type ReactNode } from "react";
import type { AppState, PolicyProposal, Worker } from "@/lib/domain";
import { memberPolicyTwin } from "@/lib/policy-twin";
import { workerPayExample, workerService, workerText } from "@/lib/worker-copy";
import { BALLOT_REQUIREMENTS } from "@/lib/governance-sim";

export function WorkerPolicyTwin({ state, proposal, worker, children }: { state: AppState; proposal: PolicyProposal; worker: Worker; children?: ReactNode }) {
  const locale = state.locale;
  const twin = useMemo(() => memberPolicyTwin(state, proposal, worker), [state, proposal, worker]);
  const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
  const approved = proposal.status === "active";
  const example = twin.mine.find(row => row.currentPay !== row.proposedPay) ?? twin.mine[0];
  const exampleText = workerPayExample(locale, example, twin.after.floor);
  const increase = twin.after.floor - twin.before.floor;
  return <section className="workerPolicyTwin" aria-labelledby={`twin-${proposal.id}`}>
    <h3 id={`twin-${proposal.id}`}>{workerText(locale, "minPay")}</h3>
    <div className="workerTwinRules" role="group" aria-label={workerText(locale, "minPay")}>
      <div><span>{workerText(locale, approved ? "beforeChange" : "now")}</span><strong>{money(twin.before.floor)}</strong></div>
      <div><span>{workerText(locale, approved ? "approvedRule" : "ifApproved")}</span><strong>{money(twin.after.floor)}</strong></div>
    </div>
    <p className="workerVoteGain">{workerText(locale, increase > 0 ? "simplePayGain" : increase === 0 ? "paySame" : "payDecrease", { amount: Math.abs(increase).toLocaleString("en-IN") })}</p>
    <div className="workerTwinPersonal">
      <p className="workerPersonalExample">{exampleText}</p>
      <p className="workerDemoNote">{workerText(locale, "simplePreviewNote")}</p>
    </div>
    {children}
    <details className="workerMore workerTwinEvidence"><summary>{workerText(locale, "simpleDetails")}</summary>
      <p>{workerText(locale, "twinIntro")}</p>
      {twin.mine.length > 0 && <><h4>{workerText(locale, "simpleYourJobs")}</h4><p>{workerText(locale, "twinOwnJobs", { count: twin.mine.length })}</p>
        <dl className="workerTwinTotals"><div><dt>{workerText(locale, "twinOldPay")}</dt><dd>{money(twin.myCurrent)}</dd></div><div><dt>{workerText(locale, "twinNewPay")}</dt><dd>{money(twin.myProposed)}</dd></div></dl>
        <p>{workerText(locale, "twinDifference", { amount: money(twin.myProposed - twin.myCurrent) })}</p></>}
      <p className="workerDemoNote">{workerText(locale, "twinPayBasis")}</p>
      <h4>{workerText(locale, "simpleCooperativeJobs")}</h4>
      <p>{workerText(locale, "twinCooperativeBasis", { count: twin.cooperative.length, changed: twin.changedJobs })}</p>
      {twin.cooperative.length > 0 && <><dl className="workerTwinTotals"><div><dt>{workerText(locale, "twinOldPay")}</dt><dd>{money(twin.cooperativeCurrent)}</dd></div><div><dt>{workerText(locale, "twinNewPay")}</dt><dd>{money(twin.cooperativeProposed)}</dd></div></dl>
        <ul className="workerTwinJobs">{twin.cooperative.map(row => <li key={row.receiptId}><strong>{row.jobId} / {workerService(locale, row.service)}</strong><span>{money(row.currentPay)} → {money(row.proposedPay)}</span><small>{locale === "en" ? state.workers.find(w => w.id === row.workerId)?.name ?? row.workerId : state.workers.find(w => w.id === row.workerId)?.nameDevanagari ?? row.workerId}</small></li>)}</ul></>}
      {twin.excludedCount > 0 && <p>{workerText(locale, "twinExcluded", { count: twin.excludedCount })}</p>}
      {!twin.cooperative.length && <p>{workerText(locale, "twinEmpty")}</p>}
      <h4>{workerText(locale, "simpleUnchanged")}</h4>
      <p>{workerText(locale, "twinSameOrder")}</p>
      <p>{workerText(locale, "twinSameSafety")}</p>
      <p className="workerDemoNote">{workerText(locale, "olderRecordsUnchanged")}</p>
      <h4>{workerText(locale, "simpleOtherSetting")}</h4>
      <p>{workerText(locale, "twinWait", { before: twin.before.wait, after: twin.after.wait })}</p>
      <p className="workerDemoNote">{workerText(locale, "twinWaitLimit")}</p>
      <h4>{workerText(locale, "simpleHowVoteWorks")}</h4>
      <p>{workerText(locale, "ballotRequirements", BALLOT_REQUIREMENTS)}</p>
      <p>{workerText(locale, "ballotChoiceNote")}</p>
      <p className="workerDemoNote">{workerText(locale, "simpleVoteOnce")}</p>
      <h4>{workerText(locale, "simpleFullProposal")}</h4>
      <p><b>{proposal.title}</b></p><p>{proposal.description}</p><p className="workerDemoNote">{proposal.simulation.note}</p>
    </details>
  </section>;
}
