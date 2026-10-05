"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductApp } from "@/components/product-app";
import { signIn } from "@/lib/commands";
import type { AppState, Role } from "@/lib/domain";
import { stateRepository } from "@/lib/repository";
import { summarizeWorkerEarnings, weeklyWorkerEarnings, workerEarningEntries } from "@/lib/earnings";
import { authenticateDemoAccount, DEMO_PASSWORD, demoAccounts, rolePermissions, roleTitle } from "@/lib/demo-auth";
import { resetRegister, SCENARIOS } from "@/lib/demo-scenarios";
import { t as msg } from "@/lib/messages";

/**
 * Seventeen screens across three roles is a lot to drive from a cold start. These jump the
 * register to the state a given story needs, using the same commands a person would — nothing
 * is written directly — so what appears afterwards is the product working, not a mock-up.
 */
function ScenarioPicker({onSeed}:{onSeed:(state:AppState,signInAs:string)=>void}){
  const[open,setOpen]=useState(false);
  const[ran,setRan]=useState<string|null>(null);
  return <section className="scenarioPicker">
    <button type="button" className="scenarioToggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
      <span>{open?"Hide demo shortcuts":"Jump straight to a story"}</span>
      <span aria-hidden="true">{open?"▴":"▾"}</span>
    </button>
    {open&&<div className="scenarioBody">
      <p className="scenarioNote">
        Each one books and advances real jobs through the same dispatch rules the app uses. It
        replaces the clicking, not the logic. Running one clears the register first.
      </p>
      <ul className="scenarioList">
        {SCENARIOS.map(scenario=><li key={scenario.id}>
          <div>
            <strong>{scenario.name}</strong>
            <span>{scenario.sets}</span>
            <small>{scenario.then}</small>
          </div>
          <button type="button" onClick={()=>{onSeed(scenario.run(),scenario.signInAs);setRan(scenario.id);}}>
            {ran===scenario.id?"Set up ✓":"Set up"}
          </button>
        </li>)}
      </ul>
      <button type="button" className="scenarioReset" onClick={()=>{onSeed(resetRegister(),"customer");setRan(null);}}>
        Clear the register and start from the seed
      </button>
    </div>}
  </section>;
}

function DemoLogin({state,onLogin,onSeed,initialUsername="customer"}:{state:AppState;onLogin:(role:Role,identity:string)=>void;onSeed:(state:AppState,signInAs:string)=>void;initialUsername?:string}){
  const[username,setUsername]=useState(initialUsername);
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

        <ScenarioPicker onSeed={onSeed}/>

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
  const locale=state.locale;
  // This panel covers the workspace, so Escape has to get out of it. On a phone it also used
  // to cover the fixed bottom navigation; the stylesheet now leaves room for that bar.
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[onClose]);
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
  return <section className="earningsWorkspace" aria-label={`${worker.name} earnings analysis`}><div className="earningsWorkspaceHead"><div><p className="eyebrow">{msg(locale,"money.title")}</p><h2>{locale==="en"?worker.name:worker.nameDevanagari||worker.name}</h2><span>{coop?.name} · {worker.skills.map(s=>s.replaceAll("_"," ")).join(" · ")}</span></div><button className="ghost compact" onClick={onClose} aria-label={msg(locale,"money.close")}>× {msg(locale,"money.close")}</button></div><div className="earningsKpis"><article><span>{msg(locale,"money.total")}</span><strong>₹{summary.total.toLocaleString("en-IN")}</strong><small>{msg(locale,"money.body")}</small></article><article><span>{msg(locale,"money.jobsDone")}</span><strong>{summary.completedJobs}</strong></article><article><span>{msg(locale,"money.average")}</span><strong>₹{summary.averageJobPayout.toLocaleString("en-IN")}</strong></article><article><span>{msg(locale,"money.cancelTotal")}</span><strong>₹{summary.cancellationProtection.toLocaleString("en-IN")}</strong><small>{msg(locale,"money.cancelled")}</small></article></div><div className="earningsAnalysisGrid"><article className="earningsChartCard"><div className="sectionTitle"><div><h3>{msg(locale,"money.sixWeeks")}</h3></div><strong>₹{summary.last30Days.toLocaleString("en-IN")}<small> · 30</small></strong></div><div className="earningsBars" role="img" aria-label={`Six week earnings trend for ${worker.name}`}>{weeks.map(week=><div className="earningsBarColumn" key={week.label}><span className="earningsBarValue">₹{week.amount}</span><div className="earningsBarTrack"><i style={{height:`${Math.max(6,Math.round(week.amount/maxWeek*100))}%`}}/></div><small>{week.label}</small></div>)}</div></article><article className="earningsBreakdown"><div className="sectionTitle"><div><h3>{msg(locale,"money.whichWork")}</h3></div></div>{services.map(([service,amount])=><div className="earningsServiceRow" key={service}><span>{service.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</span><strong>₹{amount.toLocaleString("en-IN")}</strong></div>)}<div className="earningsBest"><span>{msg(locale,"money.best")}</span><strong>₹{summary.bestPayout.toLocaleString("en-IN")}</strong></div></article></div><article className="earningsHistoryCard"><div className="sectionTitle roomy"><div><h3>{msg(locale,"money.recent")}</h3><p className="muted">{msg(locale,"money.recentNote")}</p></div><span>{entries.length} records</span></div><div className="earningsHistoryList">{entries.slice(0,10).map(entry=><div key={entry.id}><div><strong>{entry.label}</strong><span>{new Date(entry.earnedAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})} · {entry.type==="cancellation"?"Protection payout":entry.service.replaceAll("_"," ")}</span></div><strong>₹{entry.amount.toLocaleString("en-IN")}</strong></div>)}</div></article></section>;
}

export function DemoShell(){
  const[loaded,setLoaded]=useState(false);
  const[session,setSession]=useState<AppState["session"]>(null);
  const[loginState,setLoginState]=useState<AppState|null>(null);
  const[appKey,setAppKey]=useState(0);
  const[earningsOpen,setEarningsOpen]=useState(false);
  const[earningsState,setEarningsState]=useState<AppState|null>(null);
  const[usernameHint,setUsernameHint]=useState("customer");

  useEffect(()=>{
    const current=stateRepository.load();setLoginState(current);setSession(current.session);setLoaded(true);
    // The poll watches for a sign-out that happened in another part of the app. It must
    // compare by value: handing React a freshly parsed object every tick re-rendered the
    // whole workspace several times a second and tore down the observers below with it.
    let lastKey=current.session?`${current.session.role}:${current.session.userId}`:"";
    const timer=window.setInterval(()=>{
      const next=stateRepository.load();
      const key=next.session?`${next.session.role}:${next.session.userId}`:"";
      if(key===lastKey)return;
      lastKey=key;
      setSession(next.session);
      if(!next.session){setLoginState(next);setEarningsOpen(false);}
    },700);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!session)return;
    const decorateProductUi=()=>{
      const root=document.querySelector(".productShell");if(!root)return;
      const state=stateRepository.load();
      // Member IDs left in older components are swapped for names — in the reader's own script,
      // so a Marathi screen does not end up with one Latin name in the middle of it.
      const names=new Map(state.workers.map(w=>[w.id,state.locale==="en"?w.name:(w.nameDevanagari||w.name)]));
      // Leaflet rewrites its own DOM constantly while a map pans or re-measures. Walking
      // into it would make this run on every tile move for no benefit, so it is skipped.
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
        acceptNode:node=>(node.parentElement?.closest(".leafletHost")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT)
      });let node=walker.nextNode();
      while(node){
        const value=node.nodeValue??"";
        const replaced=value
          .replace(/\bW\d{2}\b/g,id=>names.get(id)??id)
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
    const observer=new MutationObserver(records=>{
      // Ignore mutations that came from inside a map; they never carry member names.
      const relevant=records.some(record=>{
        const target=record.target.nodeType===Node.ELEMENT_NODE?record.target as Element:record.target.parentElement;
        return !target?.closest(".leafletHost");
      });
      if(relevant)decorateProductUi();
    });
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

  /** A scenario replaces the register outright, so the login screen has to be told to redraw. */
  function seed(next:AppState,signInAs:string){
    stateRepository.save({...next,session:null});
    const reloaded=stateRepository.load();
    setLoginState(reloaded);
    setSession(null);
    setUsernameHint(signInAs);
    setAppKey(k=>k+1);
  }

  if(!loaded||!loginState)return <main className="shell loading">Loading KaamSabha…</main>;
  if(!session)return <DemoLogin key={appKey} state={loginState} onLogin={login} onSeed={seed} initialUsername={usernameHint}/>;
  return <div className="demoShellRoot"><ProductApp key={appKey}/>{earningsOpen&&earningsState&&<EarningsWorkspace state={earningsState} onClose={()=>setEarningsOpen(false)}/>}</div>;
}
