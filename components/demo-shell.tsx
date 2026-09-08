"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductApp } from "@/components/product-app";
import { signIn } from "@/lib/commands";
import type { AppState, Role } from "@/lib/domain";
import { stateRepository } from "@/lib/repository";
import { summarizeWorkerEarnings, weeklyWorkerEarnings, workerEarningEntries } from "@/lib/earnings";

function DemoLogin({state,onLogin}:{state:AppState;onLogin:(role:Role,identity:string)=>void}){
  const[role,setRole]=useState<Role>("customer");
  const[workerName,setWorkerName]=useState("Ravi Shinde");
  const workers=[...state.workers].sort((a,b)=>a.name.localeCompare(b.name));
  return <main className="namedLoginShell"><section className="namedLoginCard"><div className="namedLoginIntro"><div className="namedBrand">K</div><p className="eyebrow">SIH26089 · KAAMSABHA</p><h1>Choose who you want to demo.</h1><p>Worker accounts use real member names in the interface. Internal IDs stay hidden and are used only to keep records deterministic.</p><div className="namedProof"><span>✓ {workers.length} seeded worker members</span><span>✓ Historical earnings for every member</span><span>✓ One shared customer-worker-admin register</span></div></div><div className="namedLoginForm"><p className="eyebrow">DEMO WORKSPACE</p><div className="namedRoleGrid"><button className={role==="customer"?"active":""} onClick={()=>setRole("customer")}><strong>Customer</strong><span>Book and track work</span></button><button className={role==="worker"?"active":""} onClick={()=>setRole("worker")}><strong>Worker member</strong><span>Work, earnings and voice</span></button><button className={role==="admin"?"active":""} onClick={()=>setRole("admin")}><strong>Cooperative admin</strong><span>Operate and govern</span></button></div>{role==="worker"?<label className="field namedWorkerSelect"><span>Login as worker</span><select value={workerName} onChange={e=>setWorkerName(e.target.value)}>{workers.map(worker=>{const coop=state.cooperatives.find(c=>c.id===worker.cooperativeId);return <option key={worker.id} value={worker.name}>{worker.name} · {coop?.locality??"Cooperative"} · {worker.skills.map(s=>s.replaceAll("_"," ")).join(", ")}</option>})}</select><small>Pick the same member name shown on the assigned customer booking.</small></label>:<div className="namedIdentityPreview"><span>{role==="customer"?"Demo customer":"Cooperative administrator"}</span><strong>{role==="customer"?"Customer 01":"Admin 01"}</strong></div>}<button className="namedOpen" onClick={()=>onLogin(role,role==="worker"?workerName:role==="customer"?"customer01":"admin01")}>Open {role==="worker"?workerName:role==="customer"?"customer workspace":"admin workspace"} →</button></div></section></main>;
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
    const replaceWorkerIds=()=>{
      const root=document.querySelector(".productShell");if(!root)return;
      const state=stateRepository.load();const names=new Map(state.workers.map(w=>[w.id,w.name]));
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node=walker.nextNode();
      while(node){const value=node.nodeValue??"";const replaced=value.replace(/\bW(?:0[1-9]|10)\b/g,id=>names.get(id)??id);if(replaced!==value)node.nodeValue=replaced;node=walker.nextNode();}
    };
    replaceWorkerIds();
    const observer=new MutationObserver(()=>replaceWorkerIds());
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
    const base=stateRepository.load();const next=signIn(base,identity,role);stateRepository.save(next);setSession(next.session);setAppKey(k=>k+1);
  }

  if(!loaded||!loginState)return <main className="shell loading">Loading KaamSabha…</main>;
  if(!session)return <DemoLogin state={loginState} onLogin={login}/>;
  return <div className="demoShellRoot"><ProductApp key={appKey}/>{earningsOpen&&earningsState&&<EarningsWorkspace state={earningsState} onClose={()=>setEarningsOpen(false)}/>}</div>;
}
