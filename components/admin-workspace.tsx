"use client";

import { useState } from "react";
import type { AppState } from "@/lib/domain";
import { workerDailyLimit } from "@/lib/domain";
import { reviewIssue, reviewPolicySuggestion } from "@/lib/commands";
import { adminOverview, memberCapacityStatus } from "@/lib/admin-overview";
import { AdminAllocationLedger } from "@/components/allocation-reasons";
import { AdminGovernance } from "@/components/admin-governance";
import { AdminReplayCourt } from "@/components/replay-court";
import { FederationExchange } from "@/components/federation-exchange";
import { RuleComparison } from "@/components/rule-comparison";
import { JobFlowTrack, WaitingOnCell } from "@/components/job-flow-view";

type Run = (fn: () => AppState, message?: string) => boolean;
export const adminSections = [
  { label: "Run services", items: [
    { id: "home", label: "Overview", description: "See the work, then follow the cooperative story." },
    { id: "jobs", label: "Jobs & decisions", description: "Follow each booking and inspect why a member was selected." },
    { id: "workers", label: "Members", description: "Check certified skills, availability and each member’s work limit." },
    { id: "federation", label: "Federation", description: "Move an overflow job to a cooperative with safe capacity." },
    { id: "settlements", label: "Payments", description: "Trace job payouts and cancellation protection to their records." },
  ] },
  { label: "Member decisions", items: [
    { id: "issues", label: "Help requests", description: "Review service problems and ratings without automatic penalties." },
    { id: "replay", label: "Replay Court", description: "Reproduce a decision from its frozen receipt before resolving a challenge." },
    { id: "suggestions", label: "Member ideas", description: "Review suggestions before developing a rule for members to vote on." },
    { id: "governance", label: "Governance", description: "Compare the rule, inspect member votes, then activate an approved change." },
  ] },
  { label: "Planning", items: [
    { id: "demand", label: "Demand planning", description: "Explore the labelled synthetic demand example." },
  ] },
] as const;
export function adminPage(tab: string) {
  return adminSections.flatMap(section => [...section.items]).find(item => item.id === tab) ?? adminSections[0].items[0];
}

function pretty(value: string) { return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase()); }
const jobLabels: Record<string, string> = { requested: "Awaiting capacity", assigned: "Offer sent", accepted: "Accepted", travelling: "On the way", arrived: "Scope check", started: "Working", change_pending: "Scope approval", completed: "Awaiting payment", settled: "Paid", cancelled: "Cancelled" };

export function AdminWorkspace({ state, tab, run, navigate }: { state: AppState; tab: string; run: Run; navigate: (tab: string) => void }) {
  if (tab === "home") return <Overview state={state} navigate={navigate}/>;
  if (tab === "jobs") return <Jobs state={state} navigate={navigate}/>;
  if (tab === "workers") return <Members state={state}/>;
  if (tab === "issues") return <HelpRequests state={state} run={run} navigate={navigate}/>;
  if (tab === "replay") return <AdminReplayCourt state={state} run={run}/>;
  if (tab === "suggestions") return <Ideas state={state} run={run} navigate={navigate}/>;
  if (tab === "settlements") return <Payments state={state}/>;
  if (tab === "governance") return <AdminGovernance state={state} run={run}/>;
  if (tab === "federation") return <FederationExchange state={state} run={run}/>;
  return <Demand/>;
}

function Overview({ state, navigate }: { state: AppState; navigate: (tab: string) => void }) {
  const counts = adminOverview(state);
  const tasks = [
    { tab: "jobs", title: "Follow the work", value: counts.activeJobs, note: `${counts.waitingJobs} waiting for capacity` },
    { tab: "federation", title: "Share safe capacity", value: counts.transfers, note: `${counts.unfilledTransfers} without an eligible receiver` },
    { tab: "replay", title: "Check challenged decisions", value: counts.replays, note: "Replay the original facts" },
    { tab: "governance", title: "Review member rules", value: counts.readyProposals, note: "Approved ballots ready to activate" },
  ];
  return <div className="adminStack">
    <dl className="adminTotals" aria-label="Local application totals">
      <div><dt>Bookings recorded</dt><dd>{counts.bookings}</dd></div><div><dt>Jobs completed</dt><dd>{counts.served}</dd></div>
      <div><dt>Members offered work</dt><dd>{counts.covered}<small> / {state.workers.length}</small></dd></div><div><dt>Job payouts recorded</dt><dd>₹{counts.paid.toLocaleString("en-IN")}</dd></div>
    </dl><p className="adminBasis">This browser’s job register. Synthetic comparison jobs and sample earnings are excluded. Cancelled jobs are excluded from completed jobs.</p>
    <section className="adminTasks" aria-label="Operations next steps">{tasks.map(task => <button key={task.tab} onClick={() => navigate(task.tab)}><span><strong>{task.title}</strong><small>{task.note}</small></span><b>{task.value}</b></button>)}</section>
    <section className="adminStory"><div><h2>Show how the cooperative works</h2><p>Follow a job, preserve its protections, then show who owns the rules.</p></div><ol>{[
      ["jobs", "A booking becomes an explained decision"], ["federation", "A shortage becomes a protected transfer"], ["replay", "A challenge is checked against its receipt"], ["governance", "Member votes change the next job’s rule"],
    ].map(([target, title]) => <li key={target}><button onClick={() => navigate(target)}>{title}</button></li>)}</ol></section>
    <RuleComparison state={state}/>
  </div>;
}

function Jobs({ state, navigate }: { state: AppState; navigate: (tab: string) => void }) {
  const [filter, setFilter] = useState("active"), [query, setQuery] = useState(""), [selectedId, setSelectedId] = useState("");
  const shown = state.jobs.filter(job => (filter === "all" || (filter === "active" ? !["settled", "cancelled"].includes(job.status) : ["settled", "cancelled"].includes(job.status))) && `${job.id} ${job.locality} ${job.service} ${state.workers.find(w => w.id === job.workerId)?.name ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const selected = shown.find(job => job.id === selectedId) ?? shown[0];
  return <div className="adminStack"><section className="panel adminToolbar"><label className="field"><span>Search jobs</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job ID, service, member or area"/></label><label className="field"><span>Show</span><select aria-label="Show" value={filter} onChange={e => setFilter(e.target.value)}><option value="active">Active jobs</option><option value="past">Completed / cancelled</option><option value="all">All jobs</option></select></label><span>{shown.length} job{shown.length === 1 ? "" : "s"}</span></section>
    <div className="adminSplit"><section className="panel adminRecordList" aria-label="Job register">{shown.length ? shown.map(job => <button key={job.id} aria-pressed={selected?.id === job.id} onClick={() => setSelectedId(job.id)}><strong>{job.id}</strong><span>{pretty(job.service)} in {job.locality}</span><small>{state.workers.find(w => w.id === job.workerId)?.name ?? "No member assigned"}</small><b className="statusChip">{jobLabels[job.status]}</b></button>) : <Empty title="No matching jobs" text="Bookings appear here when a customer books. Try All jobs or clear your search."/>}</section>
      {selected ? <section className="panel adminJobDetail"><div className="sectionTitle"><h2>{selected.id}</h2><span className="statusChip">{jobLabels[selected.status]}</span></div><h3>{pretty(selected.service)} in {selected.locality}</h3><p>{selected.intakeNote || "No scope note recorded."}</p><dl className="adminFacts"><div><dt>Assigned member</dt><dd>{state.workers.find(w => w.id === selected.workerId)?.name ?? "Waiting"}</dd></div><div><dt>Approved amount</dt><dd>₹{selected.amount}</dd></div><div><dt>Serving cooperative</dt><dd>{state.cooperatives.find(c => c.id === selected.cooperativeId)?.locality ?? "Unassigned"}</dd></div></dl><JobFlowTrack job={selected} viewer="admin" locale="en"/>{!["settled", "cancelled"].includes(selected.status) && <WaitingOnCell job={selected}/>}<details className="adminDisclosure" open><summary>Dispatch decision and frozen inputs</summary><AdminAllocationLedger key={selected.id} state={{ ...state, jobs: [selected] }}/></details>{selected.federationOpportunityId && <button className="secondary" onClick={() => navigate("federation")}>Open federation transfers</button>}</section> : null}
    </div></div>;
}

function Members({ state }: { state: AppState }) {
  const [query, setQuery] = useState(""), [cooperative, setCooperative] = useState("");
  const shown = state.workers.filter(w => (!cooperative || w.cooperativeId === cooperative) && `${w.name} ${w.id} ${w.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel"><div className="adminToolbar"><label className="field"><span>Find a member</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, member ID or skill"/></label><label className="field"><span>Cooperative</span><select aria-label="Cooperative" value={cooperative} onChange={e => setCooperative(e.target.value)}><option value="">All cooperatives</option>{state.cooperatives.map(c => <option key={c.id} value={c.id}>{c.locality}</option>)}</select></label><span>{shown.length} members</span></div><div className="workerTable"><div className="workerTableHead"><span>Member</span><span>Certified skills</span><span>Booked / own limit</span><span>Availability</span></div>{shown.map(w => <div className="workerRow" key={w.id}><div><strong>{w.name}</strong><small>{w.id} / {state.cooperatives.find(c => c.id === w.cooperativeId)?.locality}</small></div><span>{w.skills.map(pretty).join(", ")}<small>{w.verified ? "Verified" : "Certification pending"}</small></span><span>{w.workloadTodayMinutes} / {workerDailyLimit(w)} min</span><span className="statusChip">{memberCapacityStatus(w)}</span></div>)}</div>{!shown.length && <Empty title="No matching members" text="Clear the search or choose another cooperative."/>}<p className="adminBasis">Safe capacity requires certification, active membership, availability and room below the member’s own daily work limit. A job must also match their skill.</p></section>;
}

function HelpRequests({ state, run, navigate }: { state: AppState; run: Run; navigate: (tab: string) => void }) {
  const [showClosed, setShowClosed] = useState(false);
  const shown = state.issues.filter(issue => showClosed ? issue.status === "closed" : issue.status !== "closed");
  return <section className="panel"><div className="adminToolbar"><label className="field"><span>Request status</span><select aria-label="Request status" value={showClosed ? "closed" : "open"} onChange={e => setShowClosed(e.target.value === "closed")}><option value="open">Needs review</option><option value="closed">Closed requests</option></select></label><button className="secondary" onClick={() => navigate("replay")}>Open Replay Court</button></div>{shown.map(issue => <article className="caseRow" key={issue.id}><div><small>{issue.id} / {issue.jobId ?? "General request"}</small><h2>{issue.category}</h2><span>{state.workers.find(w => w.id === issue.openedBy)?.name ?? issue.openedBy} / {pretty(issue.status)}</span><details className="adminDisclosure" open><summary>Messages and evidence</summary>{issue.notes.map((note, i) => <p key={i}>{note}</p>)}</details></div>{issue.status !== "closed" && <button className="secondary" onClick={() => run(() => reviewIssue(state, issue.id, "closed"), "Request closed after cooperative review.")}>Close after review</button>}</article>)}{!shown.length && <Empty title={showClosed ? "No closed requests" : "No requests waiting"} text="Customer help and worker issues appear here. Allocation challenges have their own Replay Court workspace."/>}</section>;
}

function Ideas({ state, run, navigate }: { state: AppState; run: Run; navigate: (tab: string) => void }) {
  return <section className="panel"><div className="sectionTitle"><h2>{state.suggestions.length} member ideas</h2><button className="secondary" onClick={() => navigate("governance")}>Review rules & votes</button></div><p className="adminBasis">Accepting an idea records it for policy development. It does not create a ballot or change the active rule.</p>{state.suggestions.map(suggestion => <article className="adminIdea" key={suggestion.id}><span className="statusChip">{pretty(suggestion.status)}</span><h3>{suggestion.title}</h3><small>{state.workers.find(w => w.id === suggestion.workerId)?.name ?? suggestion.workerId} / {pretty(suggestion.category)}</small><p>{suggestion.details}</p><div className="actions">{suggestion.status === "submitted" && <button className="secondary" onClick={() => run(() => reviewPolicySuggestion(state, suggestion.id, "under-review"), "Idea moved to review.")}>Start review</button>}{["submitted", "under-review"].includes(suggestion.status) && <button onClick={() => run(() => reviewPolicySuggestion(state, suggestion.id, "accepted"), "Idea accepted for development. Active rules are unchanged.")}>Accept for development</button>}</div></article>)}{!state.suggestions.length && <Empty title="No member ideas yet" text="A worker’s Share an idea submission appears here immediately."/>}</section>;
}

function Payments({ state }: { state: AppState }) {
  const counts = adminOverview(state);
  return <div className="adminStack"><dl className="adminTotals"><div><dt>Paid invoices</dt><dd>{state.settlements.length}</dd></div><div><dt>Job payouts</dt><dd>₹{counts.paid}</dd></div><div><dt>Cancellation protection</dt><dd>₹{counts.cancellationPay}</dd></div><div><dt>Recorded platform fees</dt><dd>₹{counts.fees}</dd></div></dl><p className="adminBasis">Demo payments recorded in this browser. Sample worker earnings and the illustrative federation split are separate.</p><section className="panel"><h2>Job payments</h2>{state.settlements.map(s => <article className="adminMoneyRow" key={s.id}><div><strong>{s.invoiceNumber}</strong><span>{s.jobId} / {new Date(s.settledAt).toLocaleDateString("en-IN")}</span></div><div><strong>₹{s.workerPayout} to member</strong><span>Invoice ₹{s.amount} / fee ₹{s.platformFee}</span></div></article>)}{!state.settlements.length && <Empty title="No paid invoices yet" text="Customer demo checkout posts a real settlement record here."/>}</section><section className="panel"><h2>Cancellation protection</h2>{state.cancellations.map(c => <article className="adminMoneyRow" key={c.id}><div><strong>{c.jobId}</strong><span>{c.reason}</span></div><div><strong>₹{c.workerPayout} to member</strong><span>Customer refund ₹{c.customerRefund}</span></div></article>)}{!state.cancellations.length && <Empty title="No cancellations recorded" text="Protected cancellation records appear here when a booking is cancelled."/>}</section></div>;
}

function Demand() {
  const forecast: [string, number][] = [["Mon", 46], ["Tue", 62], ["Wed", 78], ["Thu", 55], ["Fri", 88], ["Sat", 70], ["Sun", 50]];
  return <section className="panel"><h2>A planning example, not a live forecast</h2><p>These synthetic daily counts illustrate voluntary workforce planning. They do not come from current bookings and never change a member’s availability or pay.</p><div className="adminForecast" role="group" aria-label="Synthetic example demand">{forecast.map(([day, value]) => <div key={day}><span>{day}</span><div><i style={{ width: `${value}%` }}/></div><strong>{value} jobs</strong></div>)}</div></section>;
}
function Empty({ title, text }: { title: string; text: string }) { return <div className="adminEmpty"><strong>{title}</strong><p>{text}</p></div>; }
