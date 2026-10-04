"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductApp } from "@/components/product-app";
import { signIn } from "@/lib/commands";
import type { AppState, Role } from "@/lib/domain";
import { stateRepository } from "@/lib/repository";
import { summarizeWorkerEarnings, weeklyWorkerEarnings, workerEarningEntries } from "@/lib/earnings";
import { authenticateDemoAccount, DEMO_PASSWORD, demoAccounts, rolePermissions, roleTitle } from "@/lib/demo-auth";

function DemoLogin({state,onLogin}:{state:AppState;onLogin:(role:Role,identity:string)=>void}){
  const[username,setUsername]=useState("customer");
  const[password,setPassword]=useState(DEMO_PASSWORD);
  const[showPassword,setShowPassword]=useState(false);
  const[error,setError]=useState("");
  const accounts=demoAccounts(state);
  const featured=accounts.filter(account=>["customer","ravi","admin"].includes(account.username));
  const active=accounts.find(account=>account.username===username.trim().toLowerCase());

  function choose(next:string){
    setUsername(next);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const account=authenticateDemoAccount(state,username,password);
    if(!account){
      setError("Incorrect username or password. Demo password is 12345.");
      return;
    }
    setError("");
    onLogin(account.role,account.userId);
  }

  return <main className="namedLoginShell">
    <section className="namedLoginCard">
      <div className="namedLoginIntro">
        <div className="namedBrand">K</div>
        <div className="namedLoginBrandCopy">
          <span>KAAMSABHA</span>
          <small>Fair work · trusted service · cooperative control</small>
        </div>
        <div className="namedLoginTrust">
          <span>✓ Account-bound roles</span>
          <span>✓ Shared cooperative register</span>
          <span>✓ Protected worker rules</span>
        </div>
      </div>
      <form className="namedLoginForm" onSubmit={submit}>
        <div className="namedLoginHeading">
          <p className="eyebrow">SECURE DEMO ACCESS</p>
          <h1>Welcome back</h1>
          <p>Sign in with a KaamSabha account. The account decides the workspace and permissions automatically.</p>
        </div>

        <div className="namedQuickAccess">
          <span className="namedFieldLabel">Quick demo accounts</span>
          <div className="namedQuickGrid">
            {featured.map(account=><button type="button" key={account.username} className={username===account.username?"namedQuickCard active":"namedQuickCard"} onClick={()=>choose(account.username)}>
              <small>{roleTitle(account.role)}</small>
              <strong>{account.displayName}</strong>
              <span>@{account.username}</span>
            </button>)}
          </div>
        </div>

        <label className="namedField">
          <span>Username</span>
          <input value={username} onChange={event=>{setUsername(event.target.value);setError("");}} autoComplete="username" placeholder="customer, ravi, admin…" />
        </label>

        <label className="namedField">
          <span>Password</span>
          <div className="namedPasswordInput">
            <input type={showPassword?"text":"password"} value={password} onChange={event=>{setPassword(event.target.value);setError("");}} autoComplete="current-password" inputMode="numeric" placeholder="Enter password" />
            <button type="button" onClick={()=>setShowPassword(value=>!value)}>{showPassword?"Hide":"Show"}</button>
          </div>
        </label>

        {error&&<p className="namedLoginError" role="alert">{error}</p>}

        <button className="namedOpen" type="submit">Sign in securely →</button>

        {active&&<div className="namedAccessPreview">
          <div><span>{roleTitle(active.role)}</span><strong>{active.displayName}</strong><small>{active.subtitle}</small></div>
          <ul>{rolePermissions[active.role].slice(0,3).map(item=><li key={item}>✓ {item}</li>)}</ul>
        </div>}

        <div className="namedDemoHint">
          <strong>Demo credentials</strong>
          <span>Every account uses password <b>12345</b>.</span>
          <small>Workers can sign in with their first name in lowercase.</small>
        </div>
      </form>
    </section>
    <p className="namedSecurityNote">Demo-only authentication for the SIH prototype. Production requires server-side identity, hashed credentials, secure sessions and backend authorization.</p>
  </main>;
}

function EarningsWorkspace({state,onClose}:{state:AppState;onClose:()=>void}){
  const worker=state.workers.find(w=>w.id===state.session?.userId);
  const summary=worker?summarizeWorkerEarnings(state,worker.id):null;
  const entries=worker?workerEarningEntries(state,worker.id):[];
  const weeks=worker?weeklyWorkerEarnings(state,worker.id):[];
  const maxWeek=Math.max(1,...weeks.map(w=>w.amount));
  const services=useMemo(()=>{
    const totals=new Map<string,number>();
    entries.filter(e=>e.type==="job").forEach(e=>totals.set(e.service,(totals.get(e.service)??0)+e.amount));
    return [...totals.entries()].sort((a,b)=>b[1]-a[1]);
  },[entries]);
  if(!worker||!summary)return null;
  const coop=state.cooperatives.find(c=>c.id===worker.cooperativeId);
  return <section className="earningsWorkspace" aria-label={`${worker.name} earnings analysis`}><div className="earningsWorkspaceHead"><div><p className="eyebrow">MEMBER EARNINGS · DEMO HISTORY + LIVE SETTLEMENTS</p><h2>{worker.name}</h2><span>{coop?.name} · {worker.skills.map(s=>s.replaceAll("_"," ")).join(" · ")}</span></div><button className="ghost compact" onClick={onClose} aria-label="Close earnings analysis">× Close</button></div><div className="earningsKpis"><article><span>Total protected earnings</span><strong>₹{summary.total.toLocaleString("en-IN")}</strong><small>Historical demo records + new settlements</small></article><article><span>Completed jobs</span><strong>{summary.completedJobs}</strong><small>Settled service jobs</small></article><article><span>Average per job</span><strong>₹{summary.averageJobPayout.toLocaleString("en-IN")}</strong><small>Job earnings only</small></article><article><span>Cancellation protection</span><strong>₹{summary.cancellationProtection.toLocaleString("en-IN")}</strong><small>Protected travel/commitment payouts</small></article></div><div className="earningsAnalysisGrid"><article className="earningsChartCard"><div className="sectionTitle"><div><h3>6-week earnings trend</h3><p className="muted">The seeded history makes the worker view useful immediately; live demo settlements are added on top.</p></div><strong>₹{summary.last30Days.toLocaleString("en-IN")}<small> last 30d</small></strong></div><div className="earningsBars" role="img" aria-label={`Six week earnings trend for ${worker.name}`}>{weeks.map(week=><div className="earningsBarColumn" key={week.label}><span className="earningsBarValue">₹{week.amount}</span><div className="earningsBarTrack"><i style={{height:`${Math.max(6,Math.round(week.amount/maxWeek*100))}%`}}/></div><small>{week.label}</small></div>)}</div></article><article className="earningsBreakdown"><div className="sectionTitle"><div><h3>Where earnings came from</h3><p className="muted">Service mix for completed work.</p></div></div>{services.map(([service,amount])=><div className="earningsServiceRow" key={service}><span>{service.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</span><strong>₹{amount.toLocaleString("en-IN")}</strong></div>)}<div className="earningsBest"><span>Best single payout</span><strong>₹{summary.bestPayout.toLocaleString("en-IN")}</strong></div></article></div><article className="earningsHistoryCard"><div className="sectionTitle roomy"><div><h3>Recent protected earnings</h3><p className="muted">A worker can see exactly why each amount was posted.</p></div><span>{entries.length} records</span></div><div className="earningsHistoryList">{entries.slice(0,10).map(entry=><div key={entry.id}><div><strong>{entry.label}</strong><span>{new Date(entry.earnedAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} · {entry.type==="cancellation"?"Protection payout":entry.service.replaceAll("_"," ")}</span></div><strong>₹{entry.amount.toLocaleString("en-IN")}</strong></div>)}</div></article></section>;
}

export function DemoShell(){
  const[loaded,setLoaded]=useState(false);
  const[session,setSession]=useState<AppState["session"]>(null);
  const[loginState,setLoginState]=useState<AppState|null>(null);
  const[appKey,setAppKey]=useState(0);
  const[earningsOpen,setEarningsOpen]=useState(false);
  const[earningsState,setEarningsState]=useState<AppState|null>(null);

  useEffect(()=>{
    const current=stateRepository.load();setLoginState(current);setSession(current.session);setLoaded(true);
    const timer=window.setInterval(()=>{const next=stateRepository.load();setSession(next.session);if(!next.session){setLoginState(next);setEarningsOpen(false);}},350);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!session)return;
    const decorateProductUi=()=>{
      const root=document.querySelector(".productShell");if(!root)return;
      const state=stateRepository.load(),names=new Map(state.workers.map(w=>[w.id,w.name]));
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node=walker.nextNode();
      while(node){
        const value=node.nodeValue??"";
        const replaced=value
          .replace(/\bW(?:0[1-9]|10)\b/g,id=>names.get(id)??id)
          .replace(/\bpolicy-ai\b/g,"Policy Signal Monitor")
          .replace(/\bcustomer01\b/g,"Customer 01")
          .replace(/\badmin01\b/g,"Cooperative Admin");
        if(replaced!==value)node.nodeValue=replaced;node=walker.nextNode();
      }
      root.querySelectorAll<HTMLElement>(".caseRow p").forEach(note=>{
        const text=(note.textContent??"").trim();
        if(text.startsWith("POLICY_INSIGHT_JSON:")){
          note.dataset.machineMetadata="true";
          note.setAttribute("aria-hidden","true");
          note.textContent="";
        }
      });
    };
    decorateProductUi();
    const observer=new MutationObserver(()=>decorateProductUi());
    const root=document.querySelector(".productShell");if(root)observer.observe(root,{subtree:true,childList:true,characterData:true});
    const click=(event:MouseEvent)=>{
      const button=(event.target as HTMLElement|null)?.closest("button.navItem");if(!button)return;
      const icon=button.querySelector(".navIcon")?.textContent?.trim();
      if(session.role==="worker"&&icon==="₹"){
        event.preventDefault();event.stopPropagation();setEarningsState(stateRepository.load());setEarningsOpen(true);
      }else setEarningsOpen(false);
    };
    document.addEventListener("click",click,true);
    return()=>{observer.disconnect();document.removeEventListener("click",click,true);};
  },[session,appKey]);

  function login(role:Role,identity:string){
    const base=stateRepository.load(),next=signIn(base,identity,role);stateRepository.save(next);setSession(next.session);setAppKey(k=>k+1);
  }

  if(!loaded||!loginState)return <main className="shell loading">Loading KaamSabha…</main>;
  if(!session)return <DemoLogin state={loginState} onLogin={login}/>;
  return <div className="demoShellRoot"><ProductApp key={appKey}/>{earningsOpen&&earningsState&&<EarningsWorkspace state={earningsState} onClose={()=>setEarningsOpen(false)}/>}</div>;
}
