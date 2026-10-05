"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addFeedback, cancelBookingProtected, createBooking, decideChangeOrder,
  recordOtpFailure, recordOtpIssued, recordOtpVerified,
  settleJob, signIn, signOut,
} from "@/lib/commands";
import type { AppState, Locale, OtpChallenge, Role } from "@/lib/domain";
import { initialState, workerDailyLimit } from "@/lib/domain";
import { decidePreStartScopeChange } from "@/lib/prestart-scope";
import { copy } from "@/lib/i18n";
import { stateRepository } from "@/lib/repository";
import { ServiceMap } from "@/components/service-map";
import { AdminWorkspace, adminSections, adminPage } from "@/components/admin-workspace";
import { DemoPaymentSheet } from "@/components/demo-payment-sheet";
import { CustomerHelp } from "@/components/customer-help";
import { CustomerMatchReason } from "@/components/allocation-reasons";
import { JobFlowTrack, NextStepCard } from "@/components/job-flow-view";
import { RuleComparison } from "@/components/rule-comparison";
import { CustomerOtpPanel } from "@/components/otp-panel";
import { OTP_MAX_ATTEMPTS } from "@/lib/otp-config";
import { t as msg } from "@/lib/messages";
import { workerText } from "@/lib/worker-copy";
import { WorkerFair, WorkerIssues, WorkerSuggestions, WorkerEarnings, WorkerHomeEarnings, WorkerGovernance } from "@/components/worker-simple";
import { WorkerHome } from "@/components/worker-home";
import { WorkerListen } from "@/components/worker-listen";
import { workerSpokenSummary } from "@/lib/worker-guidance";

import { HandoverRecord, PriceBreakdown, ProofRecords, SafetyHelp } from "@/components/work-trust";
import { RazorpayTestCheckout } from "@/components/razorpay-test";

type Run=(fn:()=>AppState,message?:string)=>boolean;

const roles:{id:Role;title:string;note:string;demo:string}[]=[
  {id:"customer",title:"Customer",note:"Book and track trusted local services",demo:"customer01"},
  {id:"worker",title:"Worker member",note:"Work, protections, voice and governance",demo:"W02"},
  {id:"admin",title:"Cooperative admin",note:"Operations, cases, policy and federation",demo:"admin01"},
];
const localeNames:Record<Locale,string>={en:"English",hi:"हिन्दी",mr:"मराठी"};
const serviceCatalog=[
  {id:"electrician",name:"Electrical",icon:"⚡",note:"Repairs, fittings & safety checks",price:760},
  {id:"cleaning",name:"Home cleaning",icon:"✦",note:"Rooms, kitchen & deep clean",price:760},
  {id:"appliance",name:"Appliance repair",icon:"⌁",note:"Diagnosis & repair visit",price:760},
  {id:"plumbing",name:"Plumbing",icon:"◒",note:"Leaks, taps, fittings & water issues",price:760},
  {id:"carpentry",name:"Carpentry",icon:"◇",note:"Furniture, doors, shelves & repairs",price:760},
] as const;
const labels:Record<string,string>={requested:"Finding a member",assigned:"Worker assigned",accepted:"Accepted",travelling:"On the way",arrived:"Arrived · confirm scope",started:"Work in progress",change_pending:"Waiting for scope approval",completed:"Work completed",settled:"Paid & settled",cancelled:"Cancelled"};
function pretty(value:string){return value.replaceAll("_"," ").replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());}

export function ProductApp({onSignOut}:{onSignOut?:(next:AppState)=>void}={}){
  const[state,setState]=useState<AppState>(initialState());
  const[ready,setReady]=useState(false),[tab,setCurrentTab]=useState("home"),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const[workerVoteId,setWorkerVoteId]=useState<string|null>(null);
  const[adminMenuOpen,setAdminMenuOpen]=useState(false);
  function setTab(next:string){setCurrentTab(next);setWorkerVoteId(null);setAdminMenuOpen(false);setNotice("");setError("");}
  useEffect(()=>{const local=stateRepository.load();setState(local);setReady(true);void stateRepository.loadRemote().then(remote=>{if(remote)setState(current=>remote.revision>current.revision?{...remote,session:current.session}:current);});},[]);
  useEffect(()=>{if(ready)stateRepository.save(state);},[state,ready]);
  useEffect(()=>{document.documentElement.lang=state.locale;},[state.locale]);
  const role=state.session?.role,t=copy[state.locale];
  useEffect(()=>{if(role==="admin"){document.getElementById("admin-page-title")?.focus({preventScroll:true});window.scrollTo({top:0,behavior:"instant"});}},[role,tab]);
  const worker=role==="worker"?state.workers.find(w=>w.id===state.session?.userId):undefined;
  const visibleJobs=useMemo(()=>role==="customer"?state.jobs.filter(j=>j.customerId===state.session?.userId):role==="worker"?state.jobs.filter(j=>j.workerId===worker?.id):state.jobs,[role,state.jobs,state.session?.userId,worker?.id]);
  const activeJob=visibleJobs.find(j=>!["settled","cancelled"].includes(j.status)),latestJob=visibleJobs[0];
  const[clock,setClock]=useState(Date.now);
  useEffect(()=>{
    if(role!=="worker")return;
    const expiry=Math.max(activeJob?.startOtp?.usedAt?0:activeJob?.startOtp?.expiresAt??0,activeJob?.completionOtp?.usedAt?0:activeJob?.completionOtp?.expiresAt??0);
    setClock(Date.now());
    if(expiry<=Date.now())return;
    // Keep the next action and spoken summary honest when a real code expires.
    const timer=window.setInterval(()=>{const now=Date.now();setClock(now);if(now>=expiry)window.clearInterval(timer);},1000);
    return()=>window.clearInterval(timer);
  },[role,activeJob?.id,activeJob?.startOtp?.expiresAt,activeJob?.startOtp?.usedAt,activeJob?.completionOtp?.expiresAt,activeJob?.completionOtp?.usedAt]);
  const stateRef=useRef(state);stateRef.current=state;
  const run:Run=(fn,message)=>{try{setError("");setNotice("");const next=fn();if(next!==stateRef.current&&next.revision!==stateRef.current.revision+1)throw new Error("The job changed while this action was running. Check its current state and retry.");stateRepository.save(next);stateRef.current=next;setState(next);if(message)setNotice(message);return true;}catch(e){setError(e instanceof Error?e.message:"Action failed");return false;}};

  async function issueOtp(jobId:string,purpose:"start"|"completion"){
    setError("");
    try{
      const response=await fetch("/api/otp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"issue",jobId,purpose})});
      const data=await response.json() as {token?:string;issuedAt?:number;expiresAt?:number;attemptsLeft?:number;demoCode?:string;error?:string};
      if(!response.ok||!data.token||!data.expiresAt)throw new Error(data.error||"OTP could not be issued");
      // The code is stored on the job, not in screen memory. Holding it only in React state
      // meant a reload or a role switch destroyed it, and the member could then never be
      // given the code the job needed to move on.
      const challenge:OtpChallenge={purpose,token:data.token,issuedAt:data.issuedAt??Date.now(),expiresAt:data.expiresAt,attemptsLeft:data.attemptsLeft??OTP_MAX_ATTEMPTS,demoCode:data.demoCode};
      setState(s=>recordOtpIssued(s,jobId,challenge));
      setNotice(purpose==="start"?"Start code issued. Read it out to the member when you are ready.":"Finish code issued. Read it out to the member to close the job.");
    }catch(e){setError(e instanceof Error?e.message:"OTP could not be issued");}
  }

  async function verifyOtp(jobId:string,purpose:"start"|"completion",code:string){
    setError("");
    try{
      const job=state.jobs.find(j=>j.id===jobId),challenge=purpose==="start"?job?.startOtp:job?.completionOtp;
      const noun=purpose==="start"?"start code":"finish code";
      if(!challenge)throw new Error(`The customer has not issued a ${noun} yet. Ask them when they are ready.`);
      if(challenge.usedAt)throw new Error(`This ${noun} has already been used once and cannot be reused.`);
      if(challenge.expiresAt<Date.now())throw new Error(`That ${noun} expired. Ask the customer to issue a new one — this does not count against you.`);
      if(challenge.attemptsLeft<=0)throw new Error(`No attempts left on this ${noun}. Ask the customer to issue a new one.`);
      const response=await fetch("/api/otp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify",jobId,purpose,token:challenge.token,code})});
      const data=await response.json() as {ok?:boolean;reason?:string};
      if(!response.ok||!data.ok){
        if(data.reason==="expired")throw new Error(`That ${noun} expired. Ask the customer to issue a new one — this does not count against you.`);
        setState(s=>recordOtpFailure(s,jobId,purpose));
        const left=Math.max(0,challenge.attemptsLeft-1);
        throw new Error(left>0?`That ${noun} is not right. ${left} attempt${left===1?"":"s"} left.`:`No attempts left. Ask the customer to issue a new ${noun}.`);
      }
      setState(s=>recordOtpVerified(s,jobId,purpose));
      setNotice(purpose==="start"?"Work started with customer confirmation.":"Completion confirmed. Customer can settle the invoice.");
    }catch(e){setError(e instanceof Error?e.message:"OTP verification failed");}
  }

  if(!ready)return <main className="shell loading">Loading KaamSabha…</main>;
  if(!state.session)return <Auth state={state} run={run} error={error}/>;
  const nav=role==="customer"?[{id:"home",label:t.home,icon:"⌂"},{id:"orders",label:t.orders,icon:"▤"},{id:"support",label:t.help,icon:"?"}]:role==="worker"?[{id:"home",label:t.current,icon:"▣"},{id:"fair",label:workerText(state.locale,"jobChoices"),icon:"◎"},{id:"issues",label:workerText(state.locale,"help"),icon:"!"},{id:"suggestions",label:workerText(state.locale,"ideas"),icon:"✎"},{id:"earnings",label:workerText(state.locale,"money"),icon:"₹"},{id:"governance",label:workerText(state.locale,"votes"),icon:"◫"}]:[{id:"home",label:t.operations,icon:"▦"},{id:"workers",label:t.workers,icon:"◉"},{id:"issues",label:t.cases,icon:"!"},{id:"suggestions",label:t.suggestions,icon:"✎"},{id:"settlements",label:t.money,icon:"₹"},{id:"governance",label:t.governance,icon:"◫"},{id:"demand",label:t.demand,icon:"↗"},{id:"federation",label:t.federation,icon:"⌘"}];

  return <main className={role==="worker"?"shell productShell workerEasyShell":role==="admin"?"shell productShell adminShell":"shell productShell"}><a className="skipLink" href="#workspace">Skip to main content</a><header className="topbar"><button className="brand brandButton" onClick={()=>setTab("home")} aria-label="KaamSabha home"><span className="brandMark small">K</span><span><strong>KaamSabha</strong><small>Worker-owned local services</small></span></button><div className="topContext"><span className="locationPill">⌖ Pune cooperative network</span><span className="rolePill">{roles.find(r=>r.id===role)?.title}</span></div><div className="topActions"><label className="locale"><span className="srOnly">{t.language}</span><select value={state.locale} onChange={e=>setState(s=>({...s,locale:e.target.value as Locale,revision:s.revision+1}))}>{Object.entries(localeNames).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><button className="ghost compact" onClick={()=>{const next=signOut(state);if(run(()=>next))onSignOut?.(next);}}>{t.logout}</button></div></header><div className="appGrid"><aside className="sideNav"><div className="identity"><span className={`roleDot ${role}`}/><div><strong>{role==="worker"?(state.locale==="en"?worker?.name:worker?.nameDevanagari||worker?.name):role==="admin"?"Cooperative admin":state.session.userId}</strong><small>{role==="worker"?msg(state.locale,"role.worker"):roles.find(r=>r.id===role)?.title}</small></div></div>{role==="admin"?<><button className="adminMenuToggle secondary" aria-expanded={adminMenuOpen} aria-controls="admin-navigation" onClick={()=>setAdminMenuOpen(open=>!open)}>{adminMenuOpen?"Close workspace menu":"Workspace menu"}<span>{adminPage(tab).label}</span></button><nav id="admin-navigation" className={adminMenuOpen?"adminNavigation isOpen":"adminNavigation"} aria-label="Primary navigation">{adminSections.map(group=><section key={group.label}><h2>{group.label}</h2>{group.items.map(item=><button key={item.id} className={tab===item.id?"navItem active":"navItem"} aria-current={tab===item.id?"page":undefined} onClick={()=>setTab(item.id)}>{item.label}</button>)}</section>)}</nav></>:<nav aria-label="Primary navigation">{nav.map(item=><button key={item.id} className={tab===item.id?"navItem active":"navItem"} aria-current={tab===item.id?"page":undefined} onClick={()=>setTab(item.id)}><span className="navIcon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>}{role==="worker"?<details className="workerRuleNote"><summary>{workerText(state.locale,"workRules")}</summary><p>{state.policy.version}</p><p>{msg(state.locale,"sidebar.floor",{amount:state.policy.minimumPayout})}</p></details>:<div className="constitution"><small>ACTIVE CONSTITUTION</small><strong>{state.policy.version}</strong><span>{`₹${state.policy.minimumPayout} protection floor`}</span></div>}</aside><section id="workspace" className="workspace" tabIndex={-1}><div className="pageHead compactHead"><div>{role==="worker"&&<p className="workerMobileName">{state.locale==="en"?worker?.name:worker?.nameDevanagari||worker?.name}</p>}<p className="eyebrow">{role==="customer"?"TRUSTED LOCAL SERVICES":role==="worker"?"":"COOPERATIVE OPERATIONS"}</p><h1 id={role==="admin"?"admin-page-title":undefined} tabIndex={role==="admin"?-1:undefined}>{role==="customer"?"Services for your home":role==="worker"?nav.find(item=>item.id===tab)?.label:adminPage(tab).label}</h1>{role==="admin"&&<p className="adminPageDescription">{adminPage(tab).description}</p>}</div>{role==="worker"&&worker&&<WorkerListen key={`${tab}:${workerVoteId??"list"}`} text={workerSpokenSummary(state,worker,tab,activeJob,clock,workerVoteId)} locale={state.locale}/>} {role==="admin"&&<span className="statusChip"><span className="statusDot"/>Shared register · rev {state.revision}</span>}</div>{notice&&<p className="notice" role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}
    {role==="customer"&&tab==="home"&&<CustomerHome state={state} run={run} openOrders={()=>setTab("orders")}/>} {role==="customer"&&tab==="orders"&&<CustomerOrders state={state} jobs={visibleJobs} run={run} issueOtp={issueOtp}/>} {role==="customer"&&tab==="support"&&<CustomerHelp state={state} job={activeJob??latestJob} run={run}/>}
    {role==="worker"&&tab==="home"&&worker&&<><WorkerHomeEarnings state={state} worker={worker} onSeePayments={()=>setTab("earnings")}/><WorkerHome state={state} job={activeJob} worker={worker} now={clock} run={run} verifyOtp={verifyOtp} onSeeVotes={()=>setTab("governance")}/></>} {role==="worker"&&tab==="fair"&&worker&&<WorkerFair state={state} worker={worker} run={run}/>} {role==="worker"&&tab==="issues"&&worker&&<WorkerIssues state={state} worker={worker} run={run}/>} {role==="worker"&&tab==="suggestions"&&worker&&<WorkerSuggestions state={state} worker={worker} run={run}/>} {role==="worker"&&tab==="earnings"&&worker&&<WorkerEarnings state={state} worker={worker}/>} {role==="worker"&&tab==="governance"&&worker&&<WorkerGovernance state={state} worker={worker} run={run} selectedProposalId={workerVoteId} onSelectProposal={setWorkerVoteId}/>}
    {role==="admin"&&<AdminWorkspace key={tab} state={state} tab={tab} run={run} navigate={setTab}/>} {role==="worker"&&<details className="workerMore workerComparison"><summary>{workerText(state.locale,"sharingRules")}</summary><RuleComparison state={state}/></details>}</section></div></main>;
}

function Auth({state,run,error}:{state:AppState;run:Run;error:string}){return <main className="authShell"><section className="authCard"><div className="authIntro"><span className="brandMark">K</span><p className="eyebrow light">Cooperative services</p><h1>Reliable local help.<br/>Fair work behind it.</h1><p>A familiar home-services marketplace for customers, with worker-owned rules, protections and auditable decisions underneath.</p><div className="trustRow"><span>✓ Verified skills</span><span>✓ In-browser maps</span><span>✓ Worker-owned rules</span></div><div className="authProof"><div><strong>5</strong><span>service categories</span></div><div><strong>₹{state.policy.minimumPayout}</strong><span>protected worker floor</span></div><div><strong>3</strong><span>languages</span></div></div></div><form className="rolePicker" onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);run(()=>signIn(state,String(d.get("userId")),String(d.get("role")) as Role));}}><div><p className="eyebrow">DEMO ACCESS</p><h2>Choose a workspace</h2><p>All roles share one persisted register.</p></div>{roles.map((r,i)=><label className="roleChoice" key={r.id}><input type="radio" name="role" value={r.id} defaultChecked={i===0} onChange={e=>{const input=e.currentTarget.form?.elements.namedItem("userId") as HTMLInputElement;if(input)input.value=r.demo;}}/><span><strong>{r.title}</strong><small>{r.note}</small></span></label>)}<label className="field"><span>Demo ID</span><input name="userId" defaultValue="customer01"/></label><button>Open workspace →</button>{error&&<p className="error">{error}</p>}<p className="formFoot">Deterministic seed 26089 · local-first demo register</p></form></section></main>}

function CustomerHome({state,run,openOrders}:{state:AppState;run:Run;openOrders:()=>void}){
  const[selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState(""),[problem,setProblem]=useState(""),[aiBusy,setAiBusy]=useState(false),[ai,setAi]=useState<{summary:string;urgency:string;safetyNote:string;notice:string}|null>(null);
  const active=state.jobs.find(j=>j.customerId===state.session?.userId&&!["settled","cancelled"].includes(j.status));
  const chosen=serviceCatalog.find(s=>s.id===selected),filtered=serviceCatalog.filter(s=>`${s.name} ${s.note}`.toLowerCase().includes(query.toLowerCase()));
  const availability=(service:string)=>state.workers.filter(w=>w.verified&&w.active&&w.available&&w.skills.includes(service)&&w.workloadTodayMinutes<workerDailyLimit(w)).length;
  async function assist(){if(!chosen||!problem.trim())return;setAiBusy(true);try{const response=await fetch("/api/ai/intake",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({service:chosen.id,text:problem})});const data=await response.json() as {summary:string;urgency:string;safetyNote:string;notice:string};if(response.ok){setAi(data);setProblem(data.summary);}}finally{setAiBusy(false);}}
  function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!chosen)return;const d=new FormData(e.currentTarget),when=new Date(),schedule=String(d.get("schedule"));if(schedule==="2h")when.setHours(when.getHours()+2);if(schedule==="tomorrow")when.setDate(when.getDate()+1);const file=d.get("reference") as File|null;run(()=>createBooking(state,{customerId:state.session!.userId,service:chosen.id,locality:String(d.get("location")),scheduledAt:when.toISOString(),emergency:d.get("emergency")==="on",amount:chosen.price,intakeNote:problem,referenceName:file?.name??""}),"Booking confirmed and dispatched under the cooperative constitution.");setSelected(null);setProblem("");setAi(null);}
  return <>{active&&<section className="activeOrderCard dense"><div className="activeOrderIcon">⌁</div><div><p className="eyebrow">ACTIVE BOOKING</p><strong>{pretty(active.service)} · {labels[active.status]}</strong><span>{active.workerId?`Member ${active.workerId} assigned`:"Finding a certified member"} · {active.locality}</span></div><button className="secondary" onClick={openOrders}>Track order</button></section>}<section className="ucHero"><div><p className="eyebrow">HOUSEHOLD & COMMUNITY SERVICES</p><h2>What do you need help with?</h2><p>Verified local professionals, clear scope, and worker-protected pricing.</p></div><label className="ucSearch"><span aria-hidden="true">⌕</span><span className="srOnly">Search services</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search services"/></label></section><div className="ucSectionHead"><div><h2>Popular services</h2><p>Choose a category to see availability and book.</p></div><span>● Live cooperative capacity</span></div><section className="ucServiceGrid" aria-label="Service categories">{filtered.map(s=>{const available=availability(s.id);return <button key={s.id} className={selected===s.id?"ucServiceCard selected":"ucServiceCard"} onClick={()=>setSelected(s.id)} aria-pressed={selected===s.id}><span className="ucServiceIcon">{s.icon}</span><span className="ucServiceBody"><strong>{s.name}</strong><span>{s.note}</span><span className="ucServiceTags"><small>From ₹{Math.max(s.price,state.policy.minimumPayout)}</small><small className={available?"available":"constrained"}>{available?`${available} safe member${available===1?"":"s"} now`:"Federation may assist"}</small></span></span><span className="ucChevron" aria-hidden="true">›</span></button>})}</section>{chosen&&<section className="bookingConfigurator ucBooking"><div className="ucBookingHead"><div><p className="eyebrow">BOOK {chosen.name.toUpperCase()}</p><h2>Confirm the details</h2><p>Describe the problem once. That scope follows the job and protects both sides.</p></div><button className="ghost compact" onClick={()=>setSelected(null)} aria-label="Close booking form">×</button></div><form className="bookingForm" onSubmit={submit}><div className="ucBookingGrid"><label className="field"><span>Service location</span><input name="location" defaultValue="Kharadi, Pune" required/></label><label className="field"><span>When?</span><select name="schedule" defaultValue="now"><option value="now">Now / on-demand</option><option value="2h">In about 2 hours</option><option value="tomorrow">Tomorrow</option></select></label></div><div className="intakeCard"><label className="field"><span>What is the problem?</span><textarea value={problem} onChange={e=>setProblem(e.target.value)} placeholder="Example: switch sparks when turned on…" required/></label><button type="button" className="secondary" disabled={aiBusy||!problem.trim()} onClick={()=>void assist()}>{aiBusy?"Structuring…":"Help me structure this"}</button>{ai&&<div className="aiAssistResult"><span className="microTag">{ai.urgency}</span><strong>Safety note</strong><span>{ai.safetyNote}</span><small>{ai.notice}</small></div>}</div><div className="ucBookingGrid"><label className="fileField"><span>Reference photo (optional)</span><input type="file" name="reference" accept="image/*"/></label><label className="checkField"><input type="checkbox" name="emergency"/><span><strong>Emergency priority</strong><small>Use only for urgent needs.</small></span></label></div><PriceBreakdown amount={Math.max(chosen.price,state.policy.minimumPayout)}/><button>Confirm booking</button></form></section>}<section className="compactAssurances"><span>✓ Scope Lock</span><span>₹ Protected payout</span><span>◎ Explainable dispatch</span><span>! Rating firewall</span></section></>;
}

function CustomerOrders({state,jobs,run,issueOtp}:{state:AppState;jobs:AppState["jobs"];run:Run;issueOtp:(id:string,p:"start"|"completion")=>Promise<void>}){
  const[view,setView]=useState<"active"|"past">("active"),shown=jobs.filter(j=>view==="active"?!["settled","cancelled"].includes(j.status):["settled","cancelled"].includes(j.status));
  return <section className="ordersPage"><div className="sectionTitle roomy"><div><h2>Bookings</h2><p className="muted">Track one clear path from assignment to invoice.</p></div><div className="segment"><button className={view==="active"?"active":""} onClick={()=>setView("active")}>Active</button><button className={view==="past"?"active":""} onClick={()=>setView("past")}>Past</button></div></div>{shown.length?shown.map(j=>{
    const worker=state.workers.find(w=>w.id===j.workerId),pending=j.changeOrders.find(c=>c.approved===undefined),settlement=state.settlements.find(s=>s.jobId===j.id),cancellation=state.cancellations.find(c=>c.jobId===j.id),latestDecision=[...j.changeOrders].reverse().find(c=>c.approved!==undefined);
    return <article className="orderCard" key={j.id}><div className="orderTop"><div><small>{j.id} · {new Date(j.scheduledAt).toLocaleString()}</small><h3>{pretty(j.service)}</h3><p>{j.locality}</p></div><span className="statusChip">{j.handoverHistory?.at(-1)?.status==="awaiting-customer"?"Waiting for your replacement approval":labels[j.status]}</span></div><JobFlowTrack job={j} viewer="customer" locale={state.locale}/><NextStepCard job={j} viewer="customer" locale={state.locale}/><HandoverRecord state={state} job={j} run={run}/>{j.handoverHistory?.at(-1)?.status!=="awaiting-customer"&&<CustomerMatchReason state={state} job={j}/>}{j.workerId&&!["settled","cancelled"].includes(j.status)&&<ServiceMap job={j} workerName={worker?.name}/>} {j.federationOpportunityId&&<div className="customerFederationNote"><span className="microTag">Federation assisted</span><strong>Another cooperative had safe capacity.</strong><span>Federation selected the cooperative first; that cooperative selected its own member. Worker protection stayed unchanged.</span></div>}<div className="orderFacts"><div><span>Worker</span><strong>{worker?.name??"Pending"}</strong></div><div><span>Current approved amount</span><strong>₹{j.amount}</strong></div><div><span>Work proof</span><strong>{j.evidence.length}</strong></div></div>{j.intakeNote&&<div className="intakeSummary"><strong>Booked scope</strong><span>{j.intakeNote}</span></div>}{["requested","assigned","accepted","travelling"].includes(j.status)&&!j.handoverHistory?.length&&<button className="dangerGhost" onClick={()=>run(()=>cancelBookingProtected(state,j.id,"Customer no longer needs service"),"Cancellation recorded with worker-protection rules.")}>Cancel booking</button>}
    {pending&&<div className="scopePendingBanner"><small>Your approval is required for this extra work</small><strong>{pending.description} · +₹{pending.amountDelta}</strong><span>The worker cannot start this added work until you approve it. If declined, the original booked scope remains unchanged.</span><div className="actions"><button onClick={()=>run(()=>j.startOtp?.usedAt?decideChangeOrder(state,j.id,pending.id,true):decidePreStartScopeChange(state,j.id,pending.id,true),"Extra work approved and price updated. Follow the next step on this booking.")}>Approve addition</button><button className="secondary" onClick={()=>run(()=>j.startOtp?.usedAt?decideChangeOrder(state,j.id,pending.id,false):decidePreStartScopeChange(state,j.id,pending.id,false),"Additional scope declined. Original scope remains locked.")}>Keep original scope</button></div></div>}
    {j.status==="arrived"&&!pending&&<div className="scopeDecisionNote"><span>✓</span><div><strong>Scope is settled before work starts.</strong><span>{latestDecision?.approved===true?`Approved addition: ${latestDecision.description}. New total ₹${j.amount}.`:latestDecision?.approved===false?"The requested addition was declined; the original scope remains active.":"No extra scope is pending."}</span></div></div>}
    {j.status==="arrived"&&!pending&&<CustomerOtpPanel job={j} purpose="start" onIssue={issueOtp}/>}
    <ProofRecords state={state} job={j} run={run}/><SafetyHelp state={state} job={j} run={run}/>
    {j.status==="started"&&!j.evidence.some(e=>e.uploadedBy===j.workerId&&e.phase!=="before")&&<p className="softNote">Your member is working now. The finish code appears here once they add their work proof.</p>}
    {j.status==="started"&&j.evidence.some(e=>e.uploadedBy===j.workerId&&e.phase!=="before")&&<CustomerOtpPanel job={j} purpose="completion" onIssue={issueOtp}/>}
    {j.status==="completed"&&j.gatewayInvoice&&<RazorpayTestCheckout state={state} job={j} run={run}/>}
    {j.status==="completed"&&!j.gatewayInvoice&&!j.handoverHistory?.some(h=>h.payReviewRequired&&!h.payReviewNote)&&<DemoPaymentSheet amount={j.amount} jobId={j.id} onSettle={()=>run(()=>settleJob(state,j.id),"Demo payment completed; invoice and protected payout posted.")}/>}
    {settlement&&<div className="invoiceStrip"><strong>{settlement.invoiceNumber}</strong><span>Worker ₹{settlement.workerPayout}</span><span>Fee ₹{settlement.platformFee}</span><small>{settlement.mode==="razorpay-test"?"Razorpay test capture; bank settlement is separate":"Local demo settlement; no real money"}</small></div>}{cancellation&&<div className="cancelProtection"><strong>Cancellation protection ₹{cancellation.workerPayout}</strong><span>Customer refund ₹{cancellation.customerRefund}</span></div>}{j.status==="settled"&&!state.feedback.some(f=>f.jobId===j.id)&&<FeedbackForm state={state} jobId={j.id} run={run}/>}</article>;
  }):view==="active"&&jobs.length?<ClosedBookingHandoff jobs={jobs} state={state} onShowPast={()=>setView("past")}/>:<Empty text={view==="active"?"No active bookings yet. Book a service from Home and it appears here.":"No past orders yet."}/>}</section>;
}

/**
 * Paying moves a booking to Past, which used to drop the customer onto an empty screen at the
 * exact moment they might want the invoice or want to rate the work. This says what happened
 * and takes them there.
 */
function ClosedBookingHandoff({jobs,state,onShowPast}:{jobs:AppState["jobs"];state:AppState;onShowPast:()=>void}){
  const latest=jobs.find(j=>["settled","cancelled"].includes(j.status));
  if(!latest)return <Empty text="No active bookings yet. Book a service from Home and it appears here."/>;
  const settlement=state.settlements.find(s=>s.jobId===latest.id);
  const rated=state.feedback.some(f=>f.jobId===latest.id);
  const worker=state.workers.find(w=>w.id===latest.workerId);
  return <section className="nextStep finished">
    <p className="eyebrow">NOTHING ACTIVE RIGHT NOW</p>
    <strong>
      {latest.status==="settled"
        ?`${pretty(latest.service)} with ${worker?.name??"your member"} is paid and closed.`
        :`Your ${pretty(latest.service)} booking was cancelled.`}
    </strong>
    <span>
      {settlement?`Invoice ${settlement.invoiceNumber} · ₹${settlement.workerPayout} went to the member as a protected payout. `:""}
      {latest.status==="settled"&&!rated?"Rating it is optional, and a low rating goes to cooperative review rather than punishing the member.":"The full record is in your past orders."}
    </span>
    <button className="secondary compact" type="button" onClick={onShowPast}>
      {latest.status==="settled"&&!rated?"See the invoice and rate this job":"See past orders"}
    </button>
  </section>;
}

function FeedbackForm({state,jobId,run}:{state:AppState;jobId:string;run:Run}){const[rating,setRating]=useState(5),[note,setNote]=useState("");return <form className="feedbackComposer" onSubmit={e=>{e.preventDefault();run(()=>addFeedback(state,jobId,rating,note||"Customer feedback submitted"),rating<=2?"Rating Firewall opened human review; worker access is unchanged.":"Feedback recorded.");}}><label className="field"><span>Rating</span><select value={rating} onChange={e=>setRating(Number(e.target.value))}><option value={5}>5 — Excellent</option><option value={4}>4 — Good</option><option value={3}>3 — Okay</option><option value={2}>2 — Needs review</option><option value={1}>1 — Serious concern</option></select></label><label className="field"><span>Optional note</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="What should the cooperative know?"/></label><button>Submit feedback</button></form>}

function Empty({text}:{text:string}){return <div className="empty"><span aria-hidden="true">○</span><p>{text}</p></div>}
