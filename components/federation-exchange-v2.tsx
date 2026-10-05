"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppState, FederationOpportunity } from "@/lib/domain";
import { replayFederationDecision } from "@/lib/commands";
import { federationCapacityMatrix, federationServiceCatalog, federationShortages, openFederationTransferRequest, routeFederationTransfer } from "@/lib/federation-operations";
import { simulateFederationTwin } from "@/lib/federation";
import { FederationMap } from "@/components/service-map";
import { AdminAllocationLedger } from "@/components/allocation-reasons";

type Run = (fn: () => AppState, message?: string) => boolean;
type View = "transfers" | "capacity" | "receipts";
function pretty(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }

function TransferReceipt({ state, opportunity, run }: { state: AppState; opportunity: FederationOpportunity; run: Run }) {
  const home = state.cooperatives.find(c => c.id === opportunity.homeCooperativeId);
  const receiving = state.cooperatives.find(c => c.id === opportunity.selectedCooperativeId);
  const worker = state.workers.find(w => w.id === opportunity.workerId);
  const snapshot = state.federation.snapshots.find(s => s.opportunityId === opportunity.id && s.selectedCooperativeId);
  const replay = state.federation.replays.find(r => r.opportunityId === opportunity.id);
  const settlement = state.federation.settlements.find(s => s.opportunityId === opportunity.id);
  const receipt = state.receipts.find(r => r.id === opportunity.workerReceiptId);
  const job = state.jobs.find(j => j.id === opportunity.jobId);
  const twin = simulateFederationTwin();
  const candidate = opportunity.candidates.find(c => c.cooperativeId === opportunity.selectedCooperativeId);
  return <div className="adminStack">
    <section className="fedOutcome" aria-label="Transfer outcome"><span className="statusChip">{job ? "Transfer recorded" : "Seeded example"}</span><h2>{home?.locality} shared the job with {receiving?.locality}.</h2><p>{receiving?.locality} selected <strong>{worker?.name ?? opportunity.workerId}</strong> under its own constitution. Protected pay: <strong>₹{opportunity.workerPayout}</strong>.</p><ol className="fedStorySteps"><li><span>Local capacity</span><strong>{home?.locality}</strong><small>No safely available member for this service at the decision</small></li><li><span>Cooperative decision</span><strong>{receiving?.locality}</strong><small>{candidate?.availableWorkers ?? 0} safe members / {candidate?.eta ?? "—"} min planning arrival</small></li><li><span>Member decision</span><strong>{worker?.name ?? opportunity.workerId}</strong><small>{receipt?.policyVersion ?? "Seeded narrative; member receipt unavailable"}</small></li></ol>{job && <p className="adminBasis">Linked job {job.id} is now {pretty(job.status)}. The assigned member can continue it in Today.</p>}</section>
    <section className="panel fedReceiptEvidence"><div className="sectionTitle"><div><h2>Receipt 1: why this cooperative?</h2><p className="adminBasis">{opportunity.federationReceiptId} / {new Date(opportunity.createdAt).toLocaleString("en-IN")}</p></div><span className="statusChip">Frozen decision</span></div><p>{candidate?.availableWorkers ?? 0} safe members, arrival within the {opportunity.slaMinutes}-minute customer promise, and the ₹{opportunity.workerPayout} worker payout preserved.</p><ul className="fedReasonList">{opportunity.candidates.map(c => <li key={c.cooperativeId}><strong>{state.cooperatives.find(x => x.id === c.cooperativeId)?.locality}</strong><span>{c.cooperativeId === opportunity.selectedCooperativeId ? "Chosen" : c.eligible ? "Eligible alternative" : "Blocked"}</span><p>{c.exclusionReason ?? `${c.availableWorkers} safe members / ${c.eta} min planning arrival / protection checks pass`}</p></li>)}</ul>{snapshot ? <><button className="secondary" onClick={() => run(() => replayFederationDecision(state, snapshot.id), "Federation replay saved using the frozen capacity, protection and arrival inputs.")}>Replay frozen federation receipt</button><p className="adminBasis">Replays the engine’s cooperative selection. A different eligible cooperative chosen manually may need human review.</p></> : <p className="adminBasis">No decision snapshot is stored for this record; replay is unavailable.</p>}{replay && <div className={`adminFinding ${replay.status}`} role="status"><strong>{replay.status === "confirmed" ? "Decision reproduced" : "Decision needs review"}</strong><p>{replay.summary}</p></div>}</section>
    <section className="panel"><h2>Receipt 2: why this member?</h2>{receipt && job ? <><p>{receipt.reason}</p><p className="adminBasis">{receipt.id} / {receipt.policyVersion} / ₹{receipt.protectedPayout} protected pay</p><details className="adminDisclosure"><summary>Inspect the frozen member candidates</summary><AdminAllocationLedger state={{ ...state, jobs: [job] }}/></details></> : <p className="adminBasis">This seeded example names {worker?.name ?? opportunity.workerId}, but its member receipt is not in the application job register. Create a live transfer to inspect both decisions.</p>}</section>
    {settlement && <details className="panel adminDisclosure"><summary>Illustrative settlement split</summary><p>₹{settlement.customerTotal} = ₹{settlement.workerAmount} to worker + ₹{settlement.welfareAmount} to welfare + ₹{settlement.fulfillingCooperativeAmount} to fulfilling cooperative.</p><p className="adminBasis">Seeded illustration. This is separate from demo job payments in the Payments tab.</p></details>}
    <details className="panel adminDisclosure"><summary>Federation Policy Twin: local only versus shared capacity</summary><p className="adminBasis">Twelve fixed synthetic scenarios, identical in both runs. This comparison is independent of this transfer and today’s live capacity.</p><dl className="adminTotals"><div><dt>Local only, served</dt><dd>{twin.localOnly.served}<small> / 12</small></dd></div><div><dt>Mesh, served</dt><dd>{twin.mesh.served}<small> / 12</small></dd></div><div><dt>Mesh, unfilled</dt><dd>{twin.mesh.unfilled}</dd></div><div><dt>Protection violations</dt><dd>{twin.mesh.protectionViolations}</dd></div></dl></details>
  </div>;
}

export function FederationExchangeV2({ state, run }: { state: AppState; run: Run }) {
  const journey = useRef<HTMLDivElement>(null);
  const matrix = useMemo(() => federationCapacityMatrix(state), [state]);
  const services = useMemo(() => federationServiceCatalog(state), [state]);
  const shortages = useMemo(() => federationShortages(state), [state]);
  const [view, setView] = useState<View>("transfers");
  const [building, setBuilding] = useState(false);
  const [homeId, setHomeId] = useState(shortages[0]?.cooperative.id ?? state.cooperatives[0]?.id ?? "");
  const [service, setService] = useState(shortages[0]?.service ?? services[0] ?? "");
  const [sla, setSla] = useState(35), [sourceJobId, setSourceJobId] = useState("");
  const [requestId, setRequestId] = useState(""), [targetId, setTargetId] = useState("");
  const queue = state.federation.opportunities.filter(o => o.status !== "accepted");
  const history = state.federation.opportunities.filter(o => o.status === "accepted");
  const request = view === "receipts" ? history.find(o => o.id === requestId) ?? history[0]
    : queue.find(o => o.id === requestId) ?? queue[0];
  useEffect(() => {
    journey.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, request?.id, building]);
  const targetCandidate = request?.candidates.find(c => c.cooperativeId === targetId && c.eligible)
    ?? request?.candidates.find(c => c.eligible);
  const selectedTargetId = targetCandidate?.cooperativeId;
  const target = state.cooperatives.find(c => c.id === selectedTargetId);
  const home = state.cooperatives.find(c => c.id === request?.homeCooperativeId);
  const waitingJobs = state.jobs.filter(j => j.status === "requested" && j.homeCooperativeId === homeId && j.service === service && !j.federationOpportunityId);
  const selectedCell = matrix.find(row => row.cooperative.id === homeId)?.services.find(cell => cell.service === service);
  function chooseShortage(cooperativeId: string, nextService: string) { setHomeId(cooperativeId); setService(nextService); setSourceJobId(""); setBuilding(true); setView("transfers"); }
  function createRequest() {
    let createdId = "";
    const succeeded = run(() => { const next = openFederationTransferRequest(state, { homeCooperativeId: homeId, service, slaMinutes: sla, sourceJobId: waitingJobs.some(j => j.id === sourceJobId) ? sourceJobId : undefined }); createdId = next.federation.opportunities[0].id; return next; }, "Capacity request recorded. Review the receiving cooperatives.");
    if (succeeded) { setRequestId(createdId); setTargetId(""); setBuilding(false); setView("transfers"); }
  }
  function transfer() {
    if (!request || !selectedTargetId) return;
    if (run(() => routeFederationTransfer(state, request.id, selectedTargetId), `Job shared with ${target?.locality}. Its constitution selected the member; both receipts are ready.`)) setView("receipts");
  }
  function requestBuilder() {
    return <section className="panel fedBuilder"><h2>Prepare a capacity request</h2><p className="adminBasis">Link a waiting booking, or explicitly create a demo overflow job.</p><label className="field"><span>Home cooperative</span><select aria-label="Home cooperative" value={homeId} onChange={e => { setHomeId(e.target.value); setSourceJobId(""); }}>{state.cooperatives.filter(c => c.active).map(c => <option value={c.id} key={c.id}>{c.locality}</option>)}</select></label><label className="field"><span>Service</span><select aria-label="Service" value={service} onChange={e => { setService(e.target.value); setSourceJobId(""); }}>{services.map(s => <option value={s} key={s}>{pretty(s)}</option>)}</select></label><label className="field"><span>Customer arrival promise</span><select aria-label="Customer arrival promise" value={sla} onChange={e => setSla(Number(e.target.value))}>{[25, 35, 45, 60].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></label><label className="field"><span>Booking source</span><select aria-label="Booking source" value={waitingJobs.some(j => j.id === sourceJobId) ? sourceJobId : ""} onChange={e => setSourceJobId(e.target.value)}><option value="">Create a demo overflow job</option>{waitingJobs.map(j => <option value={j.id} key={j.id}>{j.id} / {j.locality}</option>)}</select></label><p className="adminBasis">{selectedCell?.available ? `${selectedCell.available} safe local member(s): use local dispatch, not federation.` : "No safe local capacity for this service. Receiving cooperatives will be checked."}</p><button disabled={!!selectedCell?.available || !service || !homeId} onClick={createRequest}>Check receiving cooperatives</button></section>;
  }
  return <div ref={journey} tabIndex={-1} className="adminStack fedJourney">
    <div className="fedIntro"><h2>Share the job. Keep the local rules.</h2><p>Start with a local shortage. Federation checks cooperatives for safe capacity, protection and arrival time. The receiving cooperative chooses its own member.</p></div>
    <nav className="adminSubnav" aria-label="Federation workspace">{[
      ["transfers", `Transfers (${queue.length})`], ["capacity", "Live capacity"], ["receipts", `Receipts (${history.length})`],
    ].map(([id, label]) => <button key={id} aria-current={view === id ? "page" : undefined} className={view === id ? "active" : ""} onClick={() => setView(id as View)}>{label}</button>)}</nav>
    {view === "transfers" && <>
      <ol className="fedJourneyTrack" aria-label="Federation transfer steps"><li className={!request || building ? "current" : "done"}><span>1</span><strong>Find a shortage</strong></li><li className={request && !building ? "current" : ""}><span>2</span><strong>Choose a cooperative</strong></li><li><span>3</span><strong>Inspect both receipts</strong></li></ol>
      {queue.length > 0 && <section className="panel fedQueue"><h2>Requests awaiting a transfer</h2><div>{queue.map(o => <button key={o.id} aria-pressed={request?.id === o.id} onClick={() => { setRequestId(o.id); setTargetId(""); setBuilding(false); }}><strong>{o.jobId ?? o.id}</strong><span>{state.cooperatives.find(c => c.id === o.homeCooperativeId)?.locality} / {pretty(o.service)}</span><small>{o.status === "unfilled" ? "No eligible receiver" : "Choose receiver"}</small></button>)}</div></section>}
      {request && !building ? <section className="fedReviewLayout">
        <div className="adminStack"><section className="panel"><div className="sectionTitle"><div><h2>{pretty(request.service)} from {home?.locality}</h2><p className="adminBasis">Job {request.jobId ?? "not linked"} / {request.slaMinutes}-minute customer promise</p></div></div><p>Local safe capacity failed when this request was recorded. Choose among the cooperatives that passed the checks below.</p><div className="fedReceiverList">{request.candidates.map(c => <article className={c.cooperativeId === selectedTargetId ? "chosen" : ""} key={c.cooperativeId}><div><span className="statusChip">{c.eligible ? "Eligible" : "Blocked"}</span><h3>{state.cooperatives.find(x => x.id === c.cooperativeId)?.locality}</h3><p>{c.availableWorkers} safe members / {c.eta} min planning arrival</p><p className="adminBasis">{c.exclusionReason ?? "Worker protection and customer promise pass."}</p></div>{request.status === "open" && <button className="secondary" disabled={!c.eligible} aria-pressed={c.cooperativeId === selectedTargetId} onClick={() => setTargetId(c.cooperativeId)}>{c.cooperativeId === selectedTargetId ? "Selected" : "Choose cooperative"}</button>}</article>)}</div></section><FederationMap state={state} opportunity={request} selectedCooperativeId={selectedTargetId} onSelectCooperative={setTargetId}/><p className="adminBasis">Locality anchors, not worker locations. Arrival estimates use geography and workload; they are planning estimates, not live travel times.</p></div>
        <aside className="panel fedConfirm"><h2>Review the transfer</h2><p className="fedRouteLabel">{home?.locality} <span aria-hidden="true">→</span> {target?.locality ?? "No eligible receiver"}</p><dl className="adminFacts"><div><dt>Safe members at snapshot</dt><dd>{targetCandidate?.availableWorkers ?? 0}</dd></div><div><dt>Planning arrival</dt><dd>{targetCandidate ? `${targetCandidate.eta} min` : "Unavailable"}</dd></div><div><dt>Worker payout protection</dt><dd>₹{Math.max(request.workerPayout, state.policy.minimumPayout)}</dd></div></dl><p>The receiving cooperative will select its worker after transfer. Capacity is checked again when you confirm.</p>{request.status === "open" ? <button disabled={!targetCandidate?.eligible} onClick={transfer}>Confirm job transfer</button> : <div className="adminFinding"><strong>Transfer cannot proceed</strong><p>No cooperative passed this request’s checks. Review Live capacity and start a new request when capacity or the customer promise changes.</p></div>}<button className="secondary" onClick={() => setView("capacity")}>Review live capacity</button></aside>
      </section> : <section className="fedStartLayout"><section className="panel"><h2>Where is safe capacity missing?</h2><p className="adminBasis">Current member skills, availability and work limits. A capacity gap is not proof that a customer is waiting.</p><div className="fedShortages">{shortages.map(s => <button key={`${s.cooperative.id}-${s.service}`} aria-pressed={homeId === s.cooperative.id && service === s.service} onClick={() => chooseShortage(s.cooperative.id, s.service)}><strong>{s.cooperative.locality}: {pretty(s.service)}</strong><span>{s.available} safe / {s.blocked} at work limit / {s.waiting} waiting jobs</span></button>)}{!shortages.length && <p>No shortage among cooperatives with certified members. Use the capacity table to inspect every service.</p>}</div>{history.length > 0 && <button className="secondary" onClick={() => setView("receipts")}>Inspect a completed transfer</button>}</section>{requestBuilder()}</section>}
      {request && !building && <details className="panel adminDisclosure"><summary>Start another capacity request</summary>{requestBuilder()}</details>}
    </>}
    {view === "capacity" && <section className="panel"><h2>Safe capacity by service</h2><p className="adminBasis">Live member state. Choose a cell to prepare a request; a cooperative with safe local capacity cannot send an overflow request.</p><div className="fedCapacityMatrix"><table><caption className="srOnly">Live safe members by cooperative and service</caption><thead><tr><th scope="col">Cooperative</th>{services.map(s => <th scope="col" key={s}>{pretty(s)}</th>)}</tr></thead><tbody>{matrix.map(row => <tr key={row.cooperative.id}><th scope="row">{row.cooperative.locality}</th>{row.services.map(cell => <td key={cell.service}><button className="fedCapacityButton" onClick={() => chooseShortage(row.cooperative.id, cell.service)}><strong>{cell.available} safe</strong><span>{cell.blocked} at limit</span><small>{cell.waiting} waiting</small><span className="srOnly">{row.cooperative.locality} {cell.service}</span></button></td>)}</tr>)}</tbody></table></div></section>}
    {view === "receipts" && <><section className="panel fedQueue"><h2>Recorded transfers</h2><div>{history.map(o => <button key={o.id} aria-pressed={request?.id === o.id} onClick={() => setRequestId(o.id)}><strong>{state.cooperatives.find(c => c.id === o.homeCooperativeId)?.locality} to {state.cooperatives.find(c => c.id === o.selectedCooperativeId)?.locality}</strong><span>{pretty(o.service)} / {state.workers.find(w => w.id === o.workerId)?.name}</span><small>{o.jobId ?? "Seeded example"}</small></button>)}</div>{!history.length && <p>No completed transfers. Confirm a request to create both decision records.</p>}</section>{request && <TransferReceipt key={request.id} state={state} opportunity={request} run={run}/>}</>}
  </div>;
}
