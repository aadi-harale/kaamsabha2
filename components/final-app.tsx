"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addEvidence,
  addFeedback,
  addIssueNote,
  cancelBookingProtected,
  castVote,
  createBooking,
  decideChangeOrder,
  declineJobSafely,
  openChallenge,
  openIssue,
  recordOtpFailure,
  recordOtpIssued,
  recordOtpVerified,
  requestChangeOrder,
  reviewIssue,
  reviewPolicyImpact,
  reviewPolicySuggestion,
  settleJob,
  signIn,
  signOut,
  simulatePolicy,
  submitPolicySuggestion,
  transitionJob,
  updateWorkability,
} from "@/lib/commands";
import type { AppState, Locale, OtpChallenge, Role, SuggestionCategory } from "@/lib/domain";
import { initialState } from "@/lib/domain";
import { copy } from "@/lib/i18n";
import { stateRepository } from "@/lib/repository";
import { FederationMap, ServiceMap } from "@/components/service-map";

type Run = (fn: () => AppState, message?: string) => void;

type DemoOtp = { jobId: string; purpose: "start" | "completion"; code: string } | null;

const roles: { id: Role; title: string; note: string; demo: string }[] = [
  { id: "customer", title: "Customer", note: "Book, track and approve trusted local services", demo: "customer01" },
  { id: "worker", title: "Worker member", note: "Do work, raise concerns and govern the rules", demo: "W02" },
  { id: "admin", title: "Cooperative admin", note: "Operate jobs, member voice, settlements and federation", demo: "admin01" },
];

const services = [
  { id: "electrician", name: "Electrical", icon: "⚡", note: "Repairs, fittings & safety checks", price: 760 },
  { id: "cleaning", name: "Home cleaning", icon: "✦", note: "Rooms, kitchen & deep clean", price: 760 },
  { id: "appliance", name: "Appliance repair", icon: "⌁", note: "Diagnosis & repair visit", price: 760 },
  { id: "plumbing", name: "Plumbing", icon: "◒", note: "Leaks, taps, fittings & water issues", price: 760 },
  { id: "carpentry", name: "Carpentry", icon: "◇", note: "Furniture, doors, shelves & repairs", price: 760 },
] as const;

const labels: Record<string, string> = {
  requested: "Finding a member",
  assigned: "Worker assigned",
  accepted: "Accepted",
  travelling: "On the way",
  arrived: "Arrived",
  started: "Work in progress",
  change_pending: "Change approval",
  completed: "Work completed",
  settled: "Paid & settled",
  cancelled: "Cancelled",
};

const localeNames: Record<Locale, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };

export function FinalApp() {
  const [state, setState] = useState<AppState>(initialState());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("home");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [demoOtp, setDemoOtp] = useState<DemoOtp>(null);

  useEffect(() => {
    const local = stateRepository.load();
    setState(local);
    setReady(true);
    void stateRepository.loadRemote().then((remote) => {
      if (remote && remote.revision > local.revision) setState({ ...remote, session: local.session });
    });
  }, []);

  useEffect(() => {
    if (ready) stateRepository.save(state);
  }, [state, ready]);

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const role = state.session?.role;
  const t = copy[state.locale];
  const worker = role === "worker" ? state.workers.find((w) => w.id === state.session?.userId) : undefined;
  const visibleJobs = useMemo(() => {
    if (role === "customer") return state.jobs.filter((j) => j.customerId === state.session?.userId);
    if (role === "worker") {
      return state.jobs.filter(
        (j) => j.workerId === worker?.id || state.receipts.some((r) => r.jobId === j.id && r.workerId === worker?.id),
      );
    }
    return state.jobs;
  }, [role, state.jobs, state.receipts, state.session?.userId, worker?.id]);

  const activeJob = visibleJobs.find((j) => !["settled", "cancelled"].includes(j.status));
  const latestJob = visibleJobs[0];
  const fairJob = activeJob ?? latestJob;
  const receipt = fairJob
    ? state.receipts.find((r) => r.jobId === fairJob.id && (!worker || r.workerId === worker.id)) ??
      state.receipts.find((r) => r.jobId === fairJob.id)
    : undefined;

  const run: Run = (fn, message) => {
    try {
      setError("");
      setState(fn());
      if (message) setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  };

  async function issueOtp(jobId: string, purpose: "start" | "completion") {
    setError("");
    try {
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "issue", jobId, purpose }),
      });
      const data = (await response.json()) as {
        token?: string;
        expiresAt?: number;
        attemptsLeft?: number;
        demoCode?: string;
        error?: string;
      };
      if (!response.ok || !data.token || !data.expiresAt) throw new Error(data.error || "OTP could not be issued");
      const challenge: OtpChallenge = {
        purpose,
        token: data.token,
        expiresAt: data.expiresAt,
        attemptsLeft: data.attemptsLeft ?? 5,
      };
      setState((s) => recordOtpIssued(s, jobId, challenge));
      setDemoOtp(data.demoCode ? { jobId, purpose, code: data.demoCode } : null);
      setNotice(data.demoCode ? `Demo OTP: ${data.demoCode}` : "OTP issued securely.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP could not be issued");
    }
  }

  async function verifyOtp(jobId: string, purpose: "start" | "completion", code: string) {
    setError("");
    try {
      const job = state.jobs.find((j) => j.id === jobId);
      const challenge = purpose === "start" ? job?.startOtp : job?.completionOtp;
      if (!challenge) throw new Error("Customer has not issued this OTP");
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", jobId, purpose, token: challenge.token, code }),
      });
      const data = (await response.json()) as { ok?: boolean; reason?: string };
      if (!response.ok || !data.ok) {
        setState((s) => recordOtpFailure(s, jobId, purpose));
        throw new Error(data.reason === "expired" ? "OTP expired" : "OTP incorrect or invalid");
      }
      setState((s) => recordOtpVerified(s, jobId, purpose));
      setNotice(purpose === "start" ? "Work started with customer confirmation." : "Completion confirmed. Customer can settle the invoice.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP verification failed");
    }
  }

  if (!ready) return <main className="shell loading">Loading KaamSabha…</main>;
  if (!state.session) return <Auth state={state} run={run} error={error} />;

  const nav =
    role === "customer"
      ? [
          { id: "home", label: t.home, icon: "⌂" },
          { id: "orders", label: t.orders, icon: "▤" },
          { id: "support", label: t.help, icon: "?" },
        ]
      : role === "worker"
        ? [
            { id: "home", label: t.current, icon: "▣" },
            { id: "fair", label: t.fair, icon: "◎" },
            { id: "issues", label: t.issues, icon: "!" },
            { id: "suggestions", label: t.suggestions, icon: "✎" },
            { id: "earnings", label: t.earnings, icon: "₹" },
            { id: "governance", label: t.governance, icon: "◫" },
          ]
        : [
            { id: "home", label: t.operations, icon: "▦" },
            { id: "workers", label: t.workers, icon: "◉" },
            { id: "issues", label: t.cases, icon: "!" },
            { id: "suggestions", label: t.suggestions, icon: "✎" },
            { id: "settlements", label: t.money, icon: "₹" },
            { id: "governance", label: t.governance, icon: "◫" },
            { id: "demand", label: t.demand, icon: "↗" },
            { id: "federation", label: t.federation, icon: "⌘" },
          ];

  const title =
    role === "customer"
      ? "Services for your home"
      : role === "worker"
        ? `${worker?.name ?? "Member"}, your cooperative workspace`
        : "Cooperative operations";

  return (
    <main className="shell">
      <a className="skipLink" href="#workspace">Skip to main content</a>
      <header className="topbar">
        <button className="brand brandButton" onClick={() => setTab("home")} aria-label="KaamSabha home">
          <span className="brandMark small">K</span>
          <span><strong>KaamSabha</strong><small>Worker-owned local services</small></span>
        </button>
        <div className="topContext"><span className="locationPill">⌖ Pune cooperative network</span><span className="rolePill">{roles.find((r) => r.id === role)?.title}</span></div>
        <div className="topActions">
          <label className="locale"><span className="srOnly">{t.language}</span><select value={state.locale} onChange={(e) => setState((s) => ({ ...s, locale: e.target.value as Locale, revision: s.revision + 1 }))}>{Object.entries(localeNames).map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
          <button className="ghost compact" onClick={() => run(() => signOut(state))}>{t.logout}</button>
        </div>
      </header>
      <div className="appGrid">
        <aside className="sideNav">
          <div className="identity"><span className={`roleDot ${role}`} /><div><strong>{role === "worker" ? worker?.name : state.session.userId}</strong><small>{roles.find((r) => r.id === role)?.title}</small></div></div>
          <nav aria-label="Primary navigation">{nav.map((item) => <button key={item.id} className={tab === item.id ? "navItem active" : "navItem"} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}><span className="navIcon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>
          <div className="constitution"><small>ACTIVE CONSTITUTION</small><strong>{state.policy.version}</strong><span>₹{state.policy.minimumPayout} protection floor</span></div>
        </aside>
        <section id="workspace" className="workspace" tabIndex={-1}>
          <div className="pageHead"><div><p className="eyebrow">{role === "customer" ? "TRUSTED LOCAL SERVICES" : role === "worker" ? "MEMBER-OWNED WORKSPACE" : "SHARED COOPERATIVE REGISTER"}</p><h1>{title}</h1></div>{role !== "customer" && <span className="statusChip"><span className="statusDot" />Shared register · rev {state.revision}</span>}</div>
          {notice && <p className="notice" role="status">{notice}</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {role === "customer" && tab === "home" && <CustomerHome state={state} run={run} openOrders={() => setTab("orders")} />}
          {role === "customer" && tab === "orders" && <CustomerOrders state={state} jobs={visibleJobs} run={run} issueOtp={issueOtp} demoOtp={demoOtp} />}
          {role === "customer" && tab === "support" && <CustomerSupport state={state} job={activeJob ?? latestJob} run={run} />}
          {role === "worker" && tab === "home" && <WorkerToday state={state} job={activeJob} worker={worker} run={run} verifyOtp={verifyOtp} />}
          {role === "worker" && tab === "fair" && <FairWork state={state} job={fairJob} receipt={receipt} worker={worker} run={run} />}
          {role === "worker" && tab === "issues" && <WorkerIssues state={state} job={activeJob ?? latestJob} worker={worker} run={run} />}
          {role === "worker" && tab === "suggestions" && <WorkerSuggestions state={state} worker={worker} run={run} />}
          {role === "worker" && tab === "earnings" && <WorkerEarnings state={state} jobs={visibleJobs} worker={worker} />}
          {role === "worker" && tab === "governance" && <WorkerGovernance state={state} worker={worker} run={run} />}
          {role === "admin" && <Admin state={state} tab={tab} run={run} />}
          {role !== "customer" && <RuleCompare state={state} />}
        </section>
      </div>
    </main>
  );
}

function Auth({ state, run, error }: { state: AppState; run: Run; error: string }) {
  return (
    <main className="authShell"><section className="authCard">
      <div className="authIntro"><span className="brandMark">K</span><p className="eyebrow light">SIH26089 · Cooperative services</p><h1>Reliable local help.<br />Fair work behind it.</h1><p>Customers get a familiar service marketplace. Worker-members get understandable protections, a voice in policy, and auditable decisions.</p><div className="trustRow"><span>✓ Verified skills</span><span>✓ Real in-browser maps</span><span>✓ Worker-owned rules</span></div><div className="authProof"><div><strong>5</strong><span>service categories</span></div><div><strong>₹{state.policy.minimumPayout}</strong><span>protected worker floor</span></div><div><strong>3</strong><span>languages</span></div></div></div>
      <form className="rolePicker" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); run(() => signIn(state, String(d.get("userId")), String(d.get("role")) as Role)); }}><div><p className="eyebrow">JUDGE DEMO</p><h2>Choose a workspace</h2><p>All roles use one persisted work register.</p></div>{roles.map((r, i) => <label className="roleChoice" key={r.id}><input type="radio" name="role" value={r.id} defaultChecked={i === 0} onChange={(e) => { const input = e.currentTarget.form?.elements.namedItem("userId") as HTMLInputElement; if (input) input.value = r.demo; }} /><span><strong>{r.title}</strong><small>{r.note}</small></span></label>)}<label className="field"><span>Demo ID</span><input name="userId" defaultValue="customer01" /></label><button>Open workspace →</button>{error && <p className="error">{error}</p>}<p className="formFoot">Deterministic seed 26089 · local-first fallback</p></form>
    </section></main>
  );
}

function CustomerHome({ state, run, openOrders }: { state: AppState; run: Run; openOrders: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<{ summary: string; urgency: string; safetyNote: string; notice: string } | null>(null);
  const active = state.jobs.find((j) => j.customerId === state.session?.userId && !["settled", "cancelled"].includes(j.status));
  const chosen = services.find((s) => s.id === selected);
  const filtered = services.filter((s) => `${s.name} ${s.note}`.toLowerCase().includes(query.toLowerCase()));

  async function assist() {
    if (!chosen || !problem.trim()) return;
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service: chosen.id, text: problem }) });
      const data = (await response.json()) as { summary: string; urgency: string; safetyNote: string; notice: string };
      if (response.ok) { setAi(data); setProblem(data.summary); }
    } finally { setAiBusy(false); }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen) return;
    const d = new FormData(e.currentTarget);
    const when = new Date();
    const schedule = String(d.get("schedule"));
    if (schedule === "2h") when.setHours(when.getHours() + 2);
    if (schedule === "tomorrow") when.setDate(when.getDate() + 1);
    const file = d.get("reference") as File | null;
    run(() => createBooking(state, { customerId: state.session!.userId, service: chosen.id, locality: String(d.get("location")), scheduledAt: when.toISOString(), emergency: d.get("emergency") === "on", amount: chosen.price, intakeNote: problem, referenceName: file?.name ?? "" }), "Booking confirmed and dispatched under the cooperative constitution.");
    setSelected(null); setProblem(""); setAi(null);
  }

  return <>{active && <section className="activeOrderCard"><div className="activeOrderIcon">⌁</div><div><p className="eyebrow">ACTIVE BOOKING</p><strong>{pretty(active.service)} · {labels[active.status]}</strong><span>{active.workerId ? `Member ${active.workerId} assigned` : "Finding a certified member"} · {active.locality}</span></div><button className="secondary" onClick={openOrders}>Track order</button></section>}<section className="customerHero"><div><p className="eyebrow">HOUSEHOLD & COMMUNITY SERVICES</p><h2>What can we help with?</h2><p>Verified local worker-members, clear scope and worker-protected pricing.</p></div><label className="searchBox"><span>⌕</span><span className="srOnly">Search services</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search electrical, plumbing, cleaning…" /></label></section><div className="sectionTitle roomy"><div><h2>Popular services</h2><p className="muted">Five core service categories from the original KaamSabha flow.</p></div><span className="availability">● Certified members available</span></div><section className="serviceGrid">{filtered.map((s) => <button key={s.id} className={selected === s.id ? "serviceCard selected" : "serviceCard"} onClick={() => setSelected(s.id)}><span className="serviceIcon">{s.icon}</span><span className="serviceCopy"><strong>{s.name}</strong><span>{s.note}</span></span><span className="serviceMeta"><span>From ₹{s.price}</span><span>Protected floor</span></span></button>)}</section>{chosen && <section className="bookingConfigurator"><div><p className="eyebrow">BOOK {chosen.name.toUpperCase()}</p><h2>Confirm service details</h2><p className="muted">Describe the problem once. That scope follows the job.</p></div><form className="bookingForm" onSubmit={submit}><label className="field"><span>Service location</span><input name="location" defaultValue="Kharadi, Pune" required /></label><label className="field"><span>When?</span><select name="schedule" defaultValue="now"><option value="now">Now / on-demand</option><option value="2h">In about 2 hours</option><option value="tomorrow">Tomorrow</option></select></label><div className="intakeCard"><div><label className="field"><span>What is the problem?</span><textarea value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Example: switch sparks when turned on…" required /></label><button type="button" className="secondary" disabled={aiBusy || !problem.trim()} onClick={() => void assist()}>{aiBusy ? "Structuring…" : "Help me structure this"}</button>{ai && <div className="aiAssistResult"><span className="microTag">{ai.urgency}</span><strong>Safety note</strong><span>{ai.safetyNote}</span><small>{ai.notice}</small></div>}</div><label className="fileField"><span>Reference photo (optional)</span><input type="file" name="reference" accept="image/*" /><small>Metadata stays in the demo register; remote evidence storage can be connected separately.</small></label></div><label className="checkField"><input type="checkbox" name="emergency" /><span><strong>Emergency priority</strong><small>Use for urgent household/community needs.</small></span></label><div className="bookingTotal"><span>Protected service amount</span><strong>₹{chosen.price}</strong><small>No reverse bidding. Federation cannot lower worker protection.</small></div><div className="actions"><button>Confirm booking</button><button type="button" className="secondary" onClick={() => setSelected(null)}>Cancel</button></div></form></section>}<section className="assuranceGrid"><article><span className="assuranceIcon">✓</span><div><strong>Scope Lock</strong><span>Extra scope or cost requires approval.</span></div></article><article><span className="assuranceIcon">₹</span><div><strong>Protected payout</strong><span>No worker bidding war.</span></div></article><article><span className="assuranceIcon">◎</span><div><strong>Explainable dispatch</strong><span>Cooperative first, worker second.</span></div></article><article><span className="assuranceIcon">!</span><div><strong>Rating firewall</strong><span>Review before worker penalty.</span></div></article></section></>;
}

function CustomerOrders({ state, jobs, run, issueOtp, demoOtp }: { state: AppState; jobs: AppState["jobs"]; run: Run; issueOtp: (id: string, p: "start" | "completion") => Promise<void>; demoOtp: DemoOtp }) {
  const [view, setView] = useState<"active" | "past">("active");
  const shown = jobs.filter((j) => view === "active" ? !["settled", "cancelled"].includes(j.status) : ["settled", "cancelled"].includes(j.status));
  return <section className="ordersPage"><div className="sectionTitle roomy"><div><h2>Bookings</h2><p className="muted">One clear path from assignment to invoice.</p></div><div className="segment"><button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>Active</button><button className={view === "past" ? "active" : ""} onClick={() => setView("past")}>Past orders</button></div></div>{shown.length === 0 ? <Empty text={view === "active" ? "No active bookings." : "No past orders yet."} /> : <div className="orderList">{shown.map((j) => { const pending = j.changeOrders.find((c) => c.approved === undefined); const settlement = state.settlements.find((s) => s.jobId === j.id); const cancellation = state.cancellations.find((c) => c.jobId === j.id); const worker = state.workers.find((w) => w.id === j.workerId); return <article className="orderCard" key={j.id}><div className="orderTop"><div><small>{j.id} · {new Date(j.scheduledAt).toLocaleString()}</small><h3>{pretty(j.service)}</h3><p>{j.locality} · {j.cooperativeId ?? "Routing pending"}</p></div><span className="statusChip">{labels[j.status]}</span></div>{j.workerId && !["settled", "cancelled"].includes(j.status) && <ServiceMap job={j} workerName={worker?.name} />}<div className="orderFacts"><div><span>Worker</span><strong>{worker?.name ?? j.workerId ?? "Pending"}</strong></div><div><span>Protected amount</span><strong>₹{j.amount}</strong></div><div><span>Proof</span><strong>{j.evidence.length}</strong></div></div>{(j.intakeNote || j.referenceName) && <div className="intakeSummary"><strong>Booked scope</strong>{j.intakeNote && <span>{j.intakeNote}</span>}{j.referenceName && <span>Reference: {j.referenceName}</span>}</div>}{["requested", "assigned", "accepted", "travelling"].includes(j.status) && <button className="dangerGhost" onClick={() => run(() => cancelBookingProtected(state, j.id, "Customer no longer needs service"), "Cancellation recorded with worker protection rules.")}>Cancel booking</button>}{j.status === "arrived" && <button onClick={() => void issueOtp(j.id, "start")}>Issue start OTP</button>}{demoOtp?.jobId === j.id && demoOtp.purpose === "start" && <p className="otpCallout">Start OTP <strong>{demoOtp.code}</strong><span>Share only with the assigned worker.</span></p>}{pending && <div className="changeOrder"><div><small>SCOPE LOCK · APPROVAL REQUIRED</small><strong>{pending.description} · +₹{pending.amountDelta}</strong></div><div className="actions"><button onClick={() => run(() => decideChangeOrder(state, j.id, pending.id, true))}>Approve</button><button className="secondary" onClick={() => run(() => decideChangeOrder(state, j.id, pending.id, false))}>Decline</button></div></div>}{j.status === "started" && j.evidence.length > 0 && <button onClick={() => void issueOtp(j.id, "completion")}>Approve proof & issue completion OTP</button>}{demoOtp?.jobId === j.id && demoOtp.purpose === "completion" && <p className="otpCallout">Completion OTP <strong>{demoOtp.code}</strong><span>Confirms customer-reviewed work.</span></p>}{j.evidence.length > 0 && <details className="proofDetails"><summary>View work proof ({j.evidence.length})</summary>{j.evidence.map((e) => <p key={e.id}>{e.label}</p>)}</details>}{j.status === "completed" && <button onClick={() => run(() => settleJob(state, j.id), "Invoice settled; protected worker payout posted.")}>Settle ₹{j.amount} & generate invoice</button>}{settlement && <div className="invoiceStrip"><strong>{settlement.invoiceNumber}</strong><span>Worker ₹{settlement.workerPayout}</span><span>Fee ₹{settlement.platformFee}</span></div>}{cancellation && <div className="cancelProtection"><div><small>CANCELLATION PROTECTION</small><strong>Worker protection ₹{cancellation.workerPayout}</strong><span>Customer refund ₹{cancellation.customerRefund}</span></div></div>}{j.status === "settled" && !state.feedback.some((f) => f.jobId === j.id) && <button className="secondary" onClick={() => run(() => addFeedback(state, j.id, 5, "Service completed as agreed"))}>Rate 5★ & submit feedback</button>}</article>; })}</div>}</section>;
}

function CustomerSupport({ state, job, run }: { state: AppState; job?: AppState["jobs"][number]; run: Run }) {
  return <><section className="supportHero"><div><p className="eyebrow">CUSTOMER SUPPORT</p><h2>Report a problem without automatically punishing a worker.</h2><p>Issues enter cooperative review. Ratings and complaints never auto-deactivate a member.</p></div><span className="supportBadge">Rating firewall active</span></section><section className="supportGrid">{["Scope / extra charge", "Safety", "Payment / invoice", "Service quality"].map((category) => <button className="supportCard" key={category} onClick={() => run(() => openIssue(state, state.session!.userId, category, job?.id), "Issue added to the shared cooperative case register.")}><strong>{category}</strong><span>Create a reviewable record.</span><small>{job ? `Links to ${job.id}` : "General support"} →</small></button>)}</section></>;
}

function WorkerToday({ state, job, worker, run, verifyOtp }: { state: AppState; job?: AppState["jobs"][number]; worker?: AppState["workers"][number]; run: Run; verifyOtp: (id: string, p: "start" | "completion", code: string) => Promise<void> }) {
  const [declineReason, setDeclineReason] = useState("Safety concern");
  if (!worker) return <Empty text="Worker profile not found." />;
  if (!job) return <><Empty text="No active task. Safe declines and unavailable time never reduce your rating or opportunity access." /><Workability state={state} worker={worker} run={run} /></>;
  const submitOtp = (purpose: "start" | "completion") => (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); void verifyOtp(job.id, purpose, String(new FormData(e.currentTarget).get("code"))); };
  return <><section className="jobHero"><div><p className="eyebrow light">CURRENT JOB · {job.id}</p><h2>{pretty(job.service)} in {job.locality}</h2><div className="jobMeta"><span>{job.cooperativeId}</span><span>{job.emergency ? "Emergency" : "Scheduled"}</span><span>Scope locked</span></div></div><div className="payout"><small>PROTECTED PAYOUT</small><strong>₹{job.amount}</strong><span>₹87 estimated costs · ₹{Math.max(0, job.amount - 87)} estimated net</span></div></section><div className="workerMapWrap"><ServiceMap job={job} workerName={worker.name} mode="worker" /></div><section className="workerGrid"><article className="panel taskPanel"><div className="sectionTitle"><div><p className="eyebrow">TASK STATUS</p><h2>{labels[job.status]}</h2></div><span className="statusChip">{job.emergency ? "Emergency" : "Standard"}</span></div>{job.intakeNote && <div className="scopeBox"><small>BOOKED SCOPE</small><strong>{job.intakeNote}</strong>{job.referenceName && <span>Reference: {job.referenceName}</span>}</div>}{job.status === "assigned" && <><button onClick={() => run(() => transitionJob(state, job.id, "accepted"), "Job accepted. Customer now sees your travel status.")}>Accept job</button><div className="safeDecline"><div><strong>Can’t safely take this job?</strong><span>Declining before acceptance has zero rating or opportunity penalty.</span></div><label className="field"><span>Reason</span><select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}><option>Safety concern</option><option>Out of booked scope</option><option>Schedule conflict</option><option>Service area conflict</option><option>Other workability reason</option></select></label><button className="secondary" onClick={() => run(() => declineJobSafely(state, job.id, declineReason), "Safe decline recorded with zero penalty; dispatch reran without this member.")}>Safely decline</button></div></>}{job.status === "accepted" && <button onClick={() => run(() => transitionJob(state, job.id, "travelling"))}>Start travel</button>}{job.status === "travelling" && <button onClick={() => run(() => transitionJob(state, job.id, "arrived"))}>Mark arrived</button>}{job.status === "arrived" && <form className="otpForm" onSubmit={submitOtp("start")}><label className="field"><span>Start OTP</span><input name="code" inputMode="numeric" maxLength={6} required placeholder="6-digit code" /></label><button>Verify & start</button><small>{job.startOtp ? `${job.startOtp.attemptsLeft} attempts left` : "Ask customer to issue OTP"}</small></form>}{["started", "change_pending"].includes(job.status) && <><div className="actions taskActions"><button onClick={() => run(() => addEvidence(state, job.id, "Before/after work proof"))}>Add work proof</button>{job.status === "started" && <button className="secondary" onClick={() => run(() => requestChangeOrder(state, job.id, "Additional material / labour outside locked scope", 180))}>Request +₹180 change</button>}</div><form className="otpForm" onSubmit={submitOtp("completion")}><label className="field"><span>Completion OTP</span><input name="code" inputMode="numeric" maxLength={6} required placeholder="6-digit code" /></label><button>Verify completion</button><small>{job.completionOtp ? `${job.completionOtp.attemptsLeft} attempts left` : "Customer issues after proof review"}</small></form></>}</article><article className="panel fairSummary"><p className="eyebrow">YOUR PROTECTIONS</p><h2>Before you commit</h2><ul className="checkList"><li><span>✓</span> Certified skill required before ranking</li><li><span>✓</span> ₹{state.policy.minimumPayout} minimum protected floor</li><li><span>✓</span> Safe decline = zero penalty</li><li><span>✓</span> Extra scope needs customer approval</li><li><span>✓</span> Complaints require human review</li></ul><div className="receiptRef"><span>Workload</span><strong>{worker.workloadTodayMinutes} / {worker.maxDailyMinutes ?? 480} min</strong><small>Safety guard runs before dispatch.</small></div></article></section><Workability state={state} worker={worker} run={run} /></>;
}

function Workability({ state, worker, run }: { state: AppState; worker: AppState["workers"][number]; run: Run }) {
  const [available, setAvailable] = useState(worker.available);
  const [limit, setLimit] = useState(worker.maxDailyMinutes ?? 480);
  const [rest, setRest] = useState(worker.minRestMinutes ?? 30);
  return <section className="panel workability"><div><p className="eyebrow">WORKABILITY & SAFETY</p><h2>Set limits before dispatch sees you as available.</h2><p className="muted">These are hard safety inputs, not refusal signals.</p></div><div className="workabilityForm"><label className="checkField"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span><strong>Available for new work</strong><small>Turn off without rating penalty.</small></span></label><label className="field"><span>Maximum work today</span><select value={limit} onChange={(e) => setLimit(Number(e.target.value))}><option value={360}>6 hours</option><option value={420}>7 hours</option><option value={480}>8 hours</option></select></label><label className="field"><span>Minimum rest gap</span><select value={rest} onChange={(e) => setRest(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option></select></label><button onClick={() => run(() => updateWorkability(state, { available, maxDailyMinutes: limit, minRestMinutes: rest }), "Workability limits saved. Future eligibility checks use them before ranking.")}>Save safety limits</button></div></section>;
}

function FairWork({ state, job, receipt, worker, run }: { state: AppState; job?: AppState["jobs"][number]; receipt?: AppState["receipts"][number]; worker?: AppState["workers"][number]; run: Run }) {
  if (!worker) return <Empty text="Worker not found." />;
  return <><section className="fairHero"><div><p className="eyebrow">FAIR WORK</p><h2>Understand the decision in plain language.</h2><p>{receipt?.federationReason ?? "The federation first chooses a cooperative with safe certified capacity."} {receipt?.reason ?? "Then that cooperative applies its own constitution."}</p></div><div className="fairSeal"><span>Decision Receipt</span><strong>{receipt?.id ?? "No receipt yet"}</strong><small>Frozen at dispatch</small></div></section><section className="receiptGrid large"><div><small>Policy</small><strong>{receipt?.policyVersion ?? state.policy.version}</strong><span>Frozen for this decision</span></div><div><small>Protected payout</small><strong>₹{receipt?.protectedPayout ?? state.policy.minimumPayout}</strong><span>No reverse bidding</span></div><div><small>Workload</small><strong>{worker.workloadTodayMinutes} / {worker.maxDailyMinutes ?? 480}</strong><span>Hard safety check</span></div><div><small>Opportunity access</small><strong>Normalized</strong><span>Safe refusal = 0 penalty</span></div></section><section className="panel replayPanel"><div><div><p className="eyebrow">REPLAY COURT</p><h2>Think this allocation was wrong?</h2><p className="muted">A challenge replays the frozen receipt. It is different from a service issue or a future policy suggestion.</p></div>{job && receipt && <button className="secondary" onClick={() => run(() => openChallenge(state, job.id, "Please replay this allocation using the frozen receipt"), "Replay Court challenge opened.")}>Challenge this decision</button>}</div>{state.challenges.filter((c) => c.workerId === worker.id).map((c) => <div className="challengeRow" key={c.id}><div><strong>{c.id}</strong><span>{c.reason}</span></div><span className="statusChip">{c.status}</span><p>{c.replaySummary}</p></div>)}</section></>;
}

function WorkerIssues({ state, job, worker, run }: { state: AppState; job?: AppState["jobs"][number]; worker?: AppState["workers"][number]; run: Run }) {
  const [category, setCategory] = useState("Safety / workability");
  if (!worker) return <Empty text="Worker not found." />;
  const jobIds = new Set(state.receipts.filter((r) => r.workerId === worker.id).map((r) => r.jobId));
  const relevant = state.issues.filter((i) => i.openedBy === worker.id || Boolean(i.jobId && jobIds.has(i.jobId)));
  return <><section className="workerVoiceGuide"><div><p className="eyebrow">WHEN SOMETHING FEELS WRONG</p><h2>Choose the right path in one tap.</h2></div><div className="voiceGuideGrid"><article><strong>Current job problem</strong><span>Raise an Issue</span><small>Safety, payment, scope or customer-service concern.</small></article><article><strong>Past allocation felt unfair</strong><span>Use Replay Court</span><small>Challenge the frozen dispatch decision in Fair Work.</small></article><article><strong>Rule should change</strong><span>Use Speak up</span><small>Suggest a future policy change for cooperative review.</small></article><article><strong>Proposal is on ballot</strong><span>Review & vote</span><small>See your impact first, then one member / one vote.</small></article></div></section><section className="panel issueComposer"><div><p className="eyebrow">RAISE AN ISSUE</p><h2>Tell the cooperative what needs attention.</h2><p className="muted">This creates a review record. It does not automatically punish a customer or worker.</p></div><div className="issueForm"><label className="field"><span>What is it about?</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Safety / workability</option><option>Payment / payout</option><option>Booked scope</option><option>Service area / travel</option><option>Customer interaction</option><option>Other</option></select></label><button onClick={() => run(() => openIssue(state, worker.id, category, job?.id), "Issue sent to cooperative review.")}>Raise issue</button><small>{job ? `Linked to ${job.id}` : "General member issue"}</small></div></section><section className="panel"><div className="sectionTitle roomy"><div><h2>Your shared issue register</h2><p className="muted">See concerns you raised and customer issues linked to your work.</p></div><span>{relevant.length} records</span></div>{relevant.length ? relevant.map((i) => <div className="issueRecord" key={i.id}><div><small>{i.id} · {i.jobId ?? "General"}</small><strong>{i.category}</strong><span>Status: {i.status}</span>{i.notes.map((n, k) => <p key={k}>{n}</p>)}</div>{i.status !== "closed" && <button className="secondary" onClick={() => run(() => addIssueNote(state, i.id, "I have seen this record and request cooperative review."))}>Add acknowledgement</button>}</div>) : <Empty text="No issue records yet." />}</section></>;
}

function WorkerSuggestions({ state, worker, run }: { state: AppState; worker?: AppState["workers"][number]; run: Run }) {
  if (!worker) return <Empty text="Worker not found." />;
  const mine = state.suggestions.filter((s) => s.workerId === worker.id);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    run(() => submitPolicySuggestion(state, { category: String(d.get("category")) as SuggestionCategory, title: String(d.get("title")), details: String(d.get("details")) }), "Suggestion submitted. It cannot change policy until review, simulation and member voting.");
    e.currentTarget.reset();
  }
  return <><section className="suggestionHero"><div><p className="eyebrow">SPEAK UP</p><h2>Something in the rules doesn’t feel right?</h2><p>Describe it in normal language. You do not need to write policy text. The cooperative reviews your idea; any real rule change still needs simulation and a member ballot.</p></div><span className="supportBadge">Member voice · no retaliation</span></section><section className="suggestionLayout"><form className="panel suggestionForm" onSubmit={submit}><label className="field"><span>What area should change?</span><select name="category" defaultValue="dispatch"><option value="pay">Pay / protection</option><option value="dispatch">Job allocation</option><option value="safety">Workload / safety</option><option value="scope">Scope / change orders</option><option value="access">Opportunity access</option><option value="other">Other</option></select></label><label className="field"><span>Short title</span><input name="title" required placeholder="Example: Give more rest after heavy jobs" /></label><label className="field"><span>What feels wrong, and what would be better?</span><textarea name="details" required placeholder="Explain it like you would to another worker-member…" /></label><button>Submit suggestion</button><p className="formHelp">Submitting a suggestion never changes your ranking, rating or access to work.</p></form><section className="panel"><div className="sectionTitle"><h2>Your suggestions</h2><span>{mine.length}</span></div>{mine.length ? mine.map((s) => <div className="suggestionRow" key={s.id}><span className={`suggestionStatus ${s.status}`}>{humanStatus(s.status)}</span><strong>{s.title}</strong><span>{pretty(s.category)} · {new Date(s.createdAt).toLocaleDateString()}</span><p>{s.details}</p></div>) : <Empty text="No suggestions yet. This is for future rules—not current-job support." />}</section></section></>;
}

function WorkerEarnings({ state, jobs, worker }: { state: AppState; jobs: AppState["jobs"]; worker?: AppState["workers"][number] }) {
  const settlements = state.settlements.filter((s) => jobs.some((j) => j.id === s.jobId));
  const cancellations = state.cancellations.filter((c) => jobs.some((j) => j.id === c.jobId));
  const total = settlements.reduce((n, s) => n + s.workerPayout, 0) + cancellations.reduce((n, c) => n + c.workerPayout, 0);
  const declines = state.safeDeclines.filter((d) => d.workerId === worker?.id);
  return <><section className="earningsHero"><div><p className="eyebrow light">PROTECTED EARNINGS</p><div className="bigNumber">₹{total.toLocaleString("en-IN")}</div><p>Settled labour plus cancellation protection. Safe declines never create deductions.</p></div><div className="earningsMeta"><span>Protection floor</span><strong>₹{state.policy.minimumPayout}</strong><small>{declines.length} safe decline(s) · ₹0 penalty</small></div></section><section className="panel"><h2>Ledger</h2>{jobs.map((j) => <div className="ticket" key={j.id}><div><strong>{j.id}</strong><span>{pretty(j.service)} · {j.locality}</span></div><div className="ticketRight"><strong>₹{j.amount}</strong><span>{labels[j.status]}</span></div></div>)}</section></>;
}

function WorkerGovernance({ state, worker, run }: { state: AppState; worker?: AppState["workers"][number]; run: Run }) {
  if (!worker) return <Empty text="Worker not found." />;
  const proposalId = "proposal-floor-860";
  const reviewed = state.policyReviews.some((r) => r.proposalId === proposalId && r.memberId === worker.id);
  const vote = state.votes.find((v) => v.proposalId === proposalId && v.memberId === worker.id);
  const sim = simulatePolicy(state, 860);
  return <><section className="governanceHero"><div><p className="eyebrow">MEMBER GOVERNANCE</p><h2>See what a rule means for you before voting.</h2><p>Suggestions become proposals only after review and simulation. Every worker-member then gets one vote.</p></div><span className="statusChip">Active · {state.policy.version}</span></section><section className="policyImpact"><div><small>CURRENT</small><strong>₹{sim.currentFloor}</strong><span>minimum protected payout</span></div><span>→</span><div><small>PROPOSED</small><strong>₹{sim.simulatedFloor}</strong><span>minimum protected payout</span></div><div className="impactPersonal"><small>YOUR PERSONAL IMPACT</small><strong>+₹{sim.workerProtectionDelta} minimum protection per qualifying job</strong><span>Past receipts and settlements stay frozen.</span></div></section><section className="panel"><div className="proposalCard"><div><small>MEMBER BALLOT · PROPOSAL</small><h3>Raise the protected payout floor to ₹860</h3><p>Policy Twin runs first. Existing jobs never change retroactively.</p></div>{vote ? <span className="voteDone">Your vote: {vote.choice.toUpperCase()}</span> : reviewed ? <div className="actions"><button onClick={() => run(() => castVote(state, proposalId, worker.id, "yes"), "Your yes vote is recorded. One member, one vote.")}>Vote yes</button><button className="secondary" onClick={() => run(() => castVote(state, proposalId, worker.id, "no"), "Your no vote is recorded.")}>Vote no</button></div> : <button onClick={() => run(() => reviewPolicyImpact(state, proposalId, worker.id), "Personal impact reviewed. Voting is now available.")}>I reviewed my impact</button>}</div><div className="governanceSteps"><span className="done">1 Suggest</span><span className="done">2 Validate</span><span className="done">3 Simulate</span><span className={reviewed ? "done" : ""}>4 My impact</span><span className={vote ? "done" : ""}>5 Vote</span><span>6 Quorum & activate</span></div><div className="ballotStats"><div><span>Yes</span><strong>{state.votes.filter((v) => v.proposalId === proposalId && v.choice === "yes").length}</strong></div><div><span>No</span><strong>{state.votes.filter((v) => v.proposalId === proposalId && v.choice === "no").length}</strong></div><div><span>Rule status</span><strong>Not activated</strong></div></div></section></>;
}

function Admin({ state, tab, run }: { state: AppState; tab: string; run: Run }) {
  if (tab === "workers") return <section className="panel"><div className="sectionTitle roomy"><div><h2>Worker registry & welfare</h2><p className="muted">Verification, skills, certifications and workability limits.</p></div><span>{state.workers.filter((w) => w.verified).length} verified</span></div><div className="adminTable">{state.workers.map((w) => <div className="adminRow" key={w.id}><div><span className="workerAvatar">{w.name[0]}</span><span><strong>{w.name}</strong><small>{w.id} · {w.cooperativeId}</small></span></div><div><small>Skills</small><strong>{w.skills.map(pretty).join(" · ")}</strong></div><div><small>Certification</small><strong>{(w.certifications ?? []).join(" · ")}</strong></div><div><small>Workload</small><strong>{w.workloadTodayMinutes} / {w.maxDailyMinutes ?? 480}</strong></div><div><small>Status</small><strong>{w.available ? "Available" : "Unavailable"}</strong></div></div>)}</div></section>;

  if (tab === "issues") return <section className="panel"><div className="sectionTitle roomy"><div><h2>Issues & Replay Court</h2><p className="muted">Review records; no automatic deactivation.</p></div><span>{state.issues.length + state.challenges.length}</span></div>{state.issues.map((i) => <div className="caseRow" key={i.id}><div><small>Service / member issue · {i.id}</small><strong>{i.category}</strong><span>{i.jobId ?? "General"} · {i.status}</span>{i.notes.map((n, k) => <p key={k}>{n}</p>)}</div><div className="actions"><button className="secondary" onClick={() => run(() => addIssueNote(state, i.id, "Cooperative review acknowledged."))}>Acknowledge</button>{i.status !== "closed" && <button onClick={() => run(() => reviewIssue(state, i.id, "closed"))}>Close case</button>}</div></div>)}{state.challenges.map((c) => <div className="caseRow" key={c.id}><div><small>Replay Court · {c.id}</small><strong>{c.reason}</strong><span>{c.jobId} · {c.status}</span><p>{c.replaySummary}</p></div><span className="statusChip">Frozen replay</span></div>)}</section>;

  if (tab === "suggestions") return <section className="panel"><div className="sectionTitle roomy"><div><h2>Worker suggestions</h2><p className="muted">Acceptance cannot bypass Policy Twin and member voting.</p></div><span>{state.suggestions.length}</span></div>{state.suggestions.length ? state.suggestions.map((s) => <div className="adminSuggestion" key={s.id}><div><small>{s.id} · {s.workerId} · {pretty(s.category)}</small><strong>{s.title}</strong><p>{s.details}</p></div><div><span className={`suggestionStatus ${s.status}`}>{humanStatus(s.status)}</span><div className="actions"><button className="secondary" onClick={() => run(() => reviewPolicySuggestion(state, s.id, "under-review"))}>Review</button><button onClick={() => run(() => reviewPolicySuggestion(state, s.id, "accepted"), "Suggestion accepted for policy development; active constitution unchanged.")}>Accept idea</button><button className="dangerGhost" onClick={() => run(() => reviewPolicySuggestion(state, s.id, "declined"))}>Decline</button></div></div></div>) : <Empty text="No worker policy suggestions yet." />}</section>;

  if (tab === "settlements") return <section className="panel"><div className="sectionTitle roomy"><div><h2>Settlements & cancellation protection</h2><p className="muted">Job-linked worker money records.</p></div><strong>₹{state.settlements.reduce((n, s) => n + s.workerPayout, 0).toLocaleString("en-IN")} settled</strong></div>{state.settlements.map((s) => <div className="ticket" key={s.id}><div><strong>{s.invoiceNumber}</strong><span>{s.jobId}</span></div><div className="ticketRight"><strong>Worker ₹{s.workerPayout}</strong><span>Fee ₹{s.platformFee}</span></div></div>)}{state.cancellations.length > 0 && <div className="cancellationLedger"><h3>Cancellation protection</h3>{state.cancellations.map((c) => <div className="ticket" key={c.id}><div><strong>{c.jobId}</strong><span>{c.reason}</span></div><div className="ticketRight"><strong>Worker ₹{c.workerPayout}</strong><span>Refund ₹{c.customerRefund}</span></div></div>)}</div>}</section>;

  if (tab === "governance") { const sim = simulatePolicy(state, state.policy.minimumPayout + 100); return <><section className="governanceHero admin"><div><p className="eyebrow">COOPERATIVE DISPATCH CONSTITUTION</p><h2>Test livelihood consequences before changing the rule.</h2><p>Admins can simulate and prepare proposals. Members control activation.</p></div><span className="statusChip">{state.policy.version}</span></section><section className="panel policyTwin"><div className="sectionTitle"><div><p className="eyebrow">COUNTERFACTUAL POLICY TWIN</p><h2>Same jobs. Same workers. Different rule.</h2></div><span className="statusChip">Simulation only</span></div><div className="receiptGrid large"><div><small>Current floor</small><strong>₹{sim.currentFloor}</strong></div><div><small>Simulated floor</small><strong>₹{sim.simulatedFloor}</strong></div><div><small>Affected jobs</small><strong>{sim.affectedJobs}</strong></div><div><small>Activation</small><strong>Member ballot required</strong></div></div></section><InnovationRegister state={state} /></>; }

  if (tab === "demand") { const forecast: [string, number][] = [["Mon", 46], ["Tue", 62], ["Wed", 78], ["Thu", 55], ["Fri", 88], ["Sat", 70], ["Sun", 50]]; return <section className="panel"><div className="sectionTitle roomy"><div><h2>Demand & voluntary workforce planning</h2><p className="muted">Synthetic SIH forecast; never an automatic worker penalty.</p></div><span className="statusChip">Synthetic</span></div><div className="forecast">{forecast.map(([day, height]) => <div key={day} style={{ height: `${height}%` }}><span>{day}</span><strong>{height}</strong></div>)}</div><div className="demandAdvice"><div><small>High demand</small><strong>Friday evening</strong></div><div><small>Action</small><strong>Invite available certified members</strong></div><div><small>Hard guard</small><strong>Worker safety limit remains first</strong></div></div></section>; }

  if (tab === "federation") return <><FederationMap state={state} /><section className="panel federationPanel"><p className="eyebrow">FEDERATION MESH</p><h2>Cooperative first. Worker second.</h2><p className="muted">Cross-cooperative routing improves coverage without creating a cheapest-worker marketplace.</p><div className="federationFlow"><strong>Customer demand</strong><span>→</span><strong>Eligible cooperative</strong><span>→</span><strong>Its constitution</strong><span>→</span><strong>Worker member</strong></div><div className="protectionBanner"><strong>Non-undercut covenant</strong><span>₹{state.policy.minimumPayout} minimum protection follows every routed job.</span></div>{state.receipts.slice(0, 5).map((r) => <div className="federationReceipt" key={r.id}><span>{r.jobId}</span><strong>{r.cooperativeId}</strong><span>→</span><strong>{r.workerId}</strong><small>{r.policyVersion}</small></div>)}</section></>;

  return <><section className="metricGrid"><article><small>Open jobs</small><strong>{state.jobs.filter((j) => !["settled", "cancelled"].includes(j.status)).length}</strong><span>Shared register</span></article><article><small>Verified members</small><strong>{state.workers.filter((w) => w.verified).length}</strong><span>5 service capabilities</span></article><article><small>Open voice records</small><strong>{state.issues.filter((i) => i.status !== "closed").length + state.suggestions.filter((s) => ["submitted", "under-review"].includes(s.status)).length}</strong><span>Issues + suggestions</span></article><article><small>Protection floor</small><strong>₹{state.policy.minimumPayout}</strong><span>No reverse bidding</span></article></section><section className="panel"><div className="sectionTitle roomy"><div><h2>Live work register</h2><p className="muted">One job state across customer, worker and cooperative.</p></div><span>{state.jobs.length}</span></div>{state.jobs.map((j) => <div className="ticket" key={j.id}><div><strong>{j.id} · {pretty(j.service)}</strong><span>{j.locality} · {j.cooperativeId ?? "routing"} → {j.workerId ?? "pending"}</span></div><span className="statusChip">{labels[j.status]}</span></div>)}</section><InnovationRegister state={state} /></>;
}

function InnovationRegister({ state }: { state: AppState }) {
  const items = [
    "Worker Protection Floor",
    "Cooperative Dispatch Constitution",
    "Counterfactual Policy Twin",
    "Decision Receipt + Replay Court",
    "Opportunity Access Normalization",
    "Protected Payout / No Reverse Bidding",
    "Scope Lock + Change Order",
    "Cancellation Protection",
    "Rating & Deactivation Firewall",
    "Workload Safety Guard",
    "Federation Mesh",
    "One Member / One Vote",
    "Worker Suggestions / Member Voice",
  ];
  return <section className="panel"><div className="sectionTitle roomy"><div><h2>Cooperative safeguards</h2><p className="muted">Reachable mechanisms—not decorative feature claims.</p></div><span className="statusChip">{items.length} live surfaces</span></div><div className="innovationGrid complete">{items.map((name) => <article key={name}><div><strong>{name}</strong><span>{featureDesc(name, state)}</span></div><small>Live</small></article>)}<article><div><strong>Collective Pattern Court</strong><span>Not enabled until a stable implementation exists.</span></div><small className="disabledStatus">Disabled</small></article></div></section>;
}

function RuleCompare({ state }: { state: AppState }) {
  return <section className="ruleCompare"><div><span>SAME JOBS</span><strong>{state.jobs.length}</strong></div><div><span>SAME WORKERS</span><strong>{state.workers.length}</strong></div><div className="different"><span>DIFFERENT RULES</span><strong>{state.policy.version}</strong></div></section>;
}

function Empty({ text }: { text: string }) { return <div className="empty"><span aria-hidden="true">○</span><p>{text}</p></div>; }
function pretty(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ").replaceAll("-", " "); }
function humanStatus(value: string) { return value.split("-").map(pretty).join(" "); }
function featureDesc(name: string, state: AppState) {
  const descriptions: Record<string, string> = {
    "Worker Protection Floor": `₹${state.policy.minimumPayout} hard minimum`,
    "Cooperative Dispatch Constitution": "Hard eligibility before opportunity ordering",
    "Counterfactual Policy Twin": "Simulation cannot mutate active rules",
    "Decision Receipt + Replay Court": "Frozen allocation facts + challenge path",
    "Opportunity Access Normalization": "Safe refusal carries zero penalty",
    "Protected Payout / No Reverse Bidding": "Pay visible before commitment",
    "Scope Lock + Change Order": "Customer consent before extra scope",
    "Cancellation Protection": "Worker compensation after commitment",
    "Rating & Deactivation Firewall": "Complaint creates review, not auto-punishment",
    "Workload Safety Guard": "Member workability blocks unsafe offers first",
    "Federation Mesh": "Receiving cooperative selected before its worker",
    "One Member / One Vote": "Personal impact review precedes ballot",
    "Worker Suggestions / Member Voice": "Simple idea → review → simulation → ballot",
  };
  return descriptions[name] ?? "Operational safeguard";
}
