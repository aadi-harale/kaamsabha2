"use client";

import { useEffect, useMemo, useState } from "react";
import { createBooking, signIn, signOut, transitionJob } from "@/lib/commands";
import { AppState, initialState, Role } from "@/lib/domain";
import { stateRepository } from "@/lib/repository";

const roles: Role[] = ["customer", "worker", "admin"];

export default function Home() {
  const [state, setState] = useState<AppState>(initialState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setState(stateRepository.load()); setReady(true); }, []);
  useEffect(() => { if (ready) stateRepository.save(state); }, [state, ready]);
  const currentJob = useMemo(() => state.jobs[0], [state.jobs]);

  const run = (fn: () => AppState) => { try { setError(""); setState(fn()); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); } };
  if (!ready) return <main className="shell">Loading workspace…</main>;

  if (!state.session) return (
    <main className="shell">
      <section className="loginPanel">
        <div><p className="kicker">SIH26089 · Demo mode</p><h1>KaamSabha</h1><p className="lede">Household services allocated by a worker-owned cooperative, with transparent rules and protected pay.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); run(() => signIn(state, String(data.get("userId")), String(data.get("role")) as Role)); }}>
          <label>User ID<input name="userId" defaultValue="customer01" autoComplete="username" /></label>
          <label>Role<select name="role">{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
          <button type="submit">Enter workspace</button>{error && <p role="alert" className="error">{error}</p>}
        </form>
      </section>
    </main>
  );

  return (
    <main className="shell">
      <header className="topbar"><div><strong>KaamSabha</strong><span>{state.session.role} · {state.session.userId}</span></div><button className="secondary" onClick={() => run(() => signOut(state))}>Logout</button></header>
      <section className="hero"><p className="kicker">Shared cooperative state · revision {state.revision}</p><h1>{state.session.role === "customer" ? "Book a trusted service" : state.session.role === "worker" ? "Your current work" : "Cooperative operations"}</h1></section>
      {state.session.role === "customer" && <section className="panel"><h2>Service request</h2><div className="actions"><button onClick={() => run(() => createBooking(state, { customerId: state.session!.userId, service: "electrician", locality: "Kharadi", scheduledAt: new Date().toISOString(), amount: 760 }))}>Book electrician · ₹760 floor</button><button className="secondary" onClick={() => run(() => createBooking(state, { customerId: state.session!.userId, service: "cleaning", locality: "Kharadi", scheduledAt: new Date().toISOString(), amount: 760 }))}>Book cleaning</button></div></section>}
      {currentJob && <section className="panel"><div className="row"><div><p className="kicker">{currentJob.id}</p><h2>{currentJob.service} · {currentJob.locality}</h2><p>Status: <strong>{currentJob.status}</strong> · Protected payout ₹{currentJob.amount}</p></div><div className="actions">{state.session.role === "worker" && currentJob.status === "assigned" && <button onClick={() => run(() => transitionJob(state, currentJob.id, "accepted"))}>Accept job</button>}{state.session.role === "admin" && <span className="pill">Policy {state.policy.version}</span>}</div></div></section>}
      <section className="compare"><div><span>Same jobs</span><strong>{state.jobs.length}</strong></div><div><span>Same workers</span><strong>{state.workers.length}</strong></div><div><span>Different rule</span><strong>{state.policy.version}</strong></div></section>
      <section className="grid"><article><h3>Worker Protection Floor</h3><p>Protected payout ₹{state.policy.minimumPayout}; reverse bidding is not permitted.</p></article><article><h3>Decision receipts</h3><p>{state.receipts.length} frozen allocation receipt(s) linked to jobs.</p></article><article><h3>Governance</h3><p>{state.votes.length} member vote(s). Policy activation remains separate from dispatch.</p></article><article><h3>Issues & settlement</h3><p>{state.issues.length} persisted issue(s); completed work settles only after valid lifecycle transitions.</p></article></section>
      {error && <p role="alert" className="error">{error}</p>}
    </main>
  );
}
