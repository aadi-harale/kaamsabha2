"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AppState, ChallengeCategory, ChallengeOutcome, DecisionReceipt, Locale, Worker } from "@/lib/domain";
import { t } from "@/lib/messages";
import { closeChallenge, openChallenge, remedyChallenge, replayChallenge, resolveChallenge } from "@/lib/commands";

type Run=(fn:()=>AppState,message?:string)=>void;

const CATEGORY_IDS:ChallengeCategory[]=["opportunity","workload","eligibility","pay","federation","other"];
const categoryLabel=(id:ChallengeCategory,locale:Locale)=>t(locale,`replay.cat.${id}` as never);
const categoryHelp=(id:ChallengeCategory,locale:Locale)=>t(locale,`replay.cat.${id}.help` as never);
const WANT_KEYS=["replay.want.explain","replay.want.check","replay.want.access","replay.want.human"] as const;

function pretty(value:string){return value.replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());}
function participates(receipt:DecisionReceipt,workerId:string){return receipt.workerId===workerId||receipt.candidateWorkerIds?.includes(workerId)||receipt.candidateSnapshot?.some(c=>c.workerId===workerId);}

function Stepper({status,locale="en"}:{status:string;locale?:Locale}){
  const order=["open","replayed","outcome","remedied","closed"];
  const outcomeStatuses=new Set(["confirmed","violation","human-review","remedied","closed","upheld","dismissed"]);
  const reached=(step:string)=>{
    if(step==="open")return true;
    if(step==="replayed")return status!=="open";
    if(step==="outcome")return outcomeStatuses.has(status);
    if(step==="remedied")return status==="remedied"||status==="closed";
    return status==="closed";
  };
  return <ol className="replayStepper" aria-label={t(locale,"replay.progress")}>{order.map((step,index)=><li className={reached(step)?"done":""} key={step}><span>{reached(step)?"✓":index+1}</span><b>{t(locale,`replay.step.${step}` as never)}</b></li>)}</ol>;
}

function FrozenFacts({receipt,locale="en"}:{receipt:DecisionReceipt;locale?:Locale}){
  const candidates=receipt.candidateSnapshot??[];
  return <div className="frozenFacts" aria-label="Frozen decision summary">
    <div><span>{t(locale,"replay.constitution")}</span><strong>{receipt.policyVersion}</strong></div>
    <div><span>{t(locale,"fact.payout")}</span><strong>₹{receipt.protectedPayout}</strong><small>{t(locale,"replay.floorAt",{floor:receipt.protectionFloor??receipt.protectedPayout})}</small></div>
    <div><span>{t(locale,"replay.selectedMember")}</span><strong>{receipt.workerId}</strong></div>
    <div><span>{t(locale,"replay.participants")}</span><strong>{candidates.length||receipt.candidateWorkerIds?.length||1}</strong><small>{t(locale,"replay.frozenAtDispatch")}</small></div>
  </div>;
}

export function WorkerReplayCourt({state,worker,run,locale="en"}:{state:AppState;worker:Worker;run:Run;locale?:Locale}){
  const receipts=useMemo(()=>state.receipts.filter(r=>participates(r,worker.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),[state.receipts,worker.id]);
  const cases=state.challenges.filter(c=>c.workerId===worker.id);
  const [receiptId,setReceiptId]=useState(receipts[0]?.id??"");
  const [category,setCategory]=useState<ChallengeCategory>("opportunity");
  const [statement,setStatement]=useState("");
  const [desired,setDesired]=useState<string>(WANT_KEYS[0]);
  useEffect(()=>{if(!receipts.some(r=>r.id===receiptId))setReceiptId(receipts[0]?.id??"");},[receipts,receiptId]);
  const receipt=receipts.find(r=>r.id===receiptId);
  const job=receipt?state.jobs.find(j=>j.id===receipt.jobId):undefined;
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!receipt)return;
    run(()=>openChallenge(state,receipt.jobId,{receiptId:receipt.id,category,statement,desiredOutcome:t(locale,desired as never)}),"Replay Court case opened. The decision facts are now frozen for review.");
    setStatement("");
  }
  return <section className="replayCourt workerReplay" aria-labelledby="worker-replay-title">
    <div className="replayCourtHero"><div><p className="eyebrow">{t(locale,"replay.title")}</p><h2 id="worker-replay-title">{t(locale,"replay.heading")}</h2><p>{t(locale,"replay.body")}</p></div><div className="replayPromise"><span>{t(locale,"replay.rightLabel")}</span><strong>{t(locale,"replay.rightTitle")}</strong><small>{t(locale,"replay.rightNote")}</small></div></div>

    <div className="replayWorkspace">
      <form className="panel replayComposer" onSubmit={submit}>
        <div><p className="eyebrow">{t(locale,"replay.startTitle")}</p><h3>{t(locale,"replay.startHeading")}</h3><p className="muted">{t(locale,"replay.startBody")}</p></div>
        {receipts.length?<>
          <label className="field"><span>{t(locale,"replay.decision")}</span><select value={receiptId} onChange={e=>setReceiptId(e.target.value)}>{receipts.map(r=>{const j=state.jobs.find(x=>x.id===r.jobId);return <option value={r.id} key={r.id}>{r.jobId} · {j?.service??"work allocation"} · {r.policyVersion}</option>})}</select></label>
          {receipt&&<FrozenFacts receipt={receipt} locale={locale}/>} 
          <fieldset className="replayReasons"><legend>{t(locale,"replay.whatFeltWrong")}</legend>{CATEGORY_IDS.map(id=><label className={category===id?"replayReason selected":"replayReason"} key={id}><input type="radio" name="challenge-category" value={id} checked={category===id} onChange={()=>setCategory(id)}/><span><strong>{categoryLabel(id,locale)}</strong><small>{categoryHelp(id,locale)}</small></span></label>)}</fieldset>
          <label className="field"><span>{t(locale,"replay.ownWords")}</span><textarea value={statement} onChange={e=>setStatement(e.target.value)} required minLength={8} placeholder={t(locale,"replay.ownWordsHint")}/></label>
          <label className="field"><span>{t(locale,"replay.whatWouldHelp")}</span><select value={desired} onChange={e=>setDesired(e.target.value)}>{WANT_KEYS.map(key=><option value={key} key={key}>{t(locale,key)}</option>)}</select></label>
          <button>{t(locale,"replay.open")}</button>
        </>:<div className="replayEmpty"><strong>{t(locale,"replay.noDecisions")}</strong><span>{t(locale,"replay.noDecisionsBody")}</span></div>}
      </form>

      <section className="panel replayCases" aria-label="Your Replay Court cases"><div className="sectionTitle roomy"><div><h3>{t(locale,"replay.yourCases")}</h3><p className="muted">{t(locale,"replay.casesNote")}</p></div><span>{cases.length}</span></div>{cases.length?cases.map(c=>{const snap=c.decisionSnapshot;return <article className="workerCase" key={c.id}><div className="workerCaseHead"><div><small>{c.id} · {c.jobId}</small><strong>{c.category?pretty(c.category):"Allocation review"}</strong><span>{c.reason}</span></div><span className={`caseStatus ${c.status}`}>{pretty(c.status)}</span></div><Stepper status={c.status}/>{snap&&<div className="caseFrozenLine"><span>Frozen evidence</span><b>{snap.policyVersion}</b><span>₹{snap.protectedPayout} protected</span><span>{snap.candidateSnapshot.length||1} participant(s)</span></div>}{c.replayResult&&<div className={`replayFinding ${c.replayResult.outcome}`}><small>REPLAY FINDING</small><strong>{pretty(c.replayResult.outcome)}</strong><p>{c.replayResult.summary}</p></div>}{c.adminNote&&<div className="caseMessage"><strong>Cooperative response</strong><span>{c.adminNote}</span></div>}{c.remedy&&<div className="caseRemedy"><strong>Remedy recorded</strong><span>{c.remedy}</span></div>}</article>}):<div className="replayEmpty"><strong>{t(locale,"replay.noCases")}</strong><span>{t(locale,"replay.noCasesBody")}</span></div>}</section>
    </div>
  </section>;
}

export function AdminReplayCourt({state,run}:{state:AppState;run:Run}){
  const cases=state.challenges;
  const [selectedId,setSelectedId]=useState(cases[0]?.id??"");
  const [note,setNote]=useState("");
  const [remedy,setRemedy]=useState("");
  useEffect(()=>{if(!cases.some(c=>c.id===selectedId))setSelectedId(cases[0]?.id??"");},[cases,selectedId]);
  const challenge=cases.find(c=>c.id===selectedId);
  const snap=challenge?.decisionSnapshot;
  const worker=challenge?state.workers.find(w=>w.id===challenge.workerId):undefined;
  const result=challenge?.replayResult;
  function resolve(outcome:ChallengeOutcome){if(!challenge)return;run(()=>resolveChallenge(state,challenge.id,outcome,note||`${pretty(outcome)} recorded from the frozen replay.`),"Replay Court finding recorded for the worker.");setNote("");}
  return <section className="replayCourt adminReplay" aria-labelledby="admin-replay-title">
    <div className="replayCourtHero admin"><div><p className="eyebrow">REPLAY COURT · CASE WORKSPACE</p><h2 id="admin-replay-title">Reproduce the decision before judging the complaint.</h2><p>The court replays only frozen dispatch facts. Current ratings, workload, availability and newer policy versions are deliberately ignored.</p></div><div className="replayPromise"><span>Open cases</span><strong>{cases.filter(c=>c.status!=="closed").length}</strong><small>{cases.length} total case record(s)</small></div></div>
    <div className="adminReplayLayout">
      <nav className="panel replayQueue" aria-label="Replay Court case queue"><div className="sectionTitle"><h3>Case queue</h3><span>{cases.length}</span></div>{cases.length?cases.map(c=><button key={c.id} className={c.id===selectedId?"replayQueueItem active":"replayQueueItem"} onClick={()=>setSelectedId(c.id)} aria-current={c.id===selectedId?"true":undefined}><div><strong>{c.id}</strong><span>{state.workers.find(w=>w.id===c.workerId)?.name??c.workerId}</span><small>{c.jobId} · {c.category?pretty(c.category):"Allocation"}</small></div><span className={`caseStatus ${c.status}`}>{pretty(c.status)}</span></button>):<div className="replayEmpty"><strong>No Replay Court cases.</strong><span>Worker challenges will appear here with their frozen receipt.</span></div>}</nav>
      <section className="panel replayCaseDetail">{challenge?<>
        <div className="replayCaseTitle"><div><small>{challenge.id} · opened by {worker?.name??challenge.workerId}</small><h3>{challenge.reason}</h3><p>{challenge.desiredOutcome||"Worker requested an allocation review."}</p></div><span className={`caseStatus ${challenge.status}`}>{pretty(challenge.status)}</span></div>
        <Stepper status={challenge.status}/>
        {snap?<><div className="frozenHeader"><div><p className="eyebrow">FROZEN DECISION EVIDENCE</p><h4>{snap.receiptId}</h4></div><span>Captured {new Date(snap.receiptCreatedAt).toLocaleString()}</span></div><div className="frozenFacts admin"><div><span>Constitution</span><strong>{snap.policyVersion}</strong></div><div><span>Selected worker</span><strong>{snap.selectedWorkerId}</strong></div><div><span>Protected payout</span><strong>₹{snap.protectedPayout}</strong><small>Floor ₹{snap.protectionFloor}</small></div><div><span>Candidate facts</span><strong>{snap.candidateSnapshot.length||"Legacy"}</strong></div></div>{snap.candidateSnapshot.length>0&&<div className="replayCandidateTable" role="table" aria-label="Frozen candidate facts"><div className="replayCandidateHead" role="row"><span>Member</span><span>Eligible</span><span>Workload at decision</span><span>Limit</span></div>{[...snap.candidateSnapshot].sort((a,b)=>a.workloadTodayMinutes-b.workloadTodayMinutes||a.workerId.localeCompare(b.workerId)).map(c=><div className={c.workerId===snap.selectedWorkerId?"replayCandidateRow selected":"replayCandidateRow"} role="row" key={c.workerId}><strong>{state.workers.find(w=>w.id===c.workerId)?.name??c.workerId}</strong><span>{c.eligible?"Yes":"No"}</span><span>{c.workloadTodayMinutes} min</span><span>{c.maxDailyMinutes} min</span></div>)}</div>}</>:<div className="replayEmpty"><strong>Legacy case.</strong><span>Replay will escalate to human review if the original candidate snapshot is unavailable.</span></div>}
        <div className="replayLogic"><strong>What the replay will do</strong><ol><li>Use the frozen eligibility/workload facts above.</li><li>Filter ineligible candidates exactly as dispatch did.</li><li>Order safe candidates by frozen workload, then stable worker ID.</li><li>Compare that result with the original selection and protection floor.</li></ol></div>
        {challenge.status==="open"&&<button className="replayPrimary" onClick={()=>run(()=>replayChallenge(state,challenge.id),"Frozen decision replay completed. Review the finding before resolving the case.")}>Run frozen replay</button>}
        {result&&<div className={`replayFinding ${result.outcome}`}><small>DETERMINISTIC REPLAY RESULT</small><strong>{pretty(result.outcome)}</strong><p>{result.summary}</p><div className="replayResultFacts"><span>Expected: <b>{result.expectedWorkerId??"Human review"}</b></span><span>Original: <b>{result.selectedWorkerId}</b></span><span>Protection: <b>{result.protectionPreserved?"Preserved":"Mismatch"}</b></span></div></div>}
        {challenge.status==="replayed"&&result&&<div className="replayResolution"><label className="field"><span>Message to the worker</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Explain what the cooperative found…"/></label><div className="actions"><button onClick={()=>resolve(result.outcome)}>{result.outcome==="confirmed"?"Confirm replay result":result.outcome==="violation"?"Record violation":"Send to human review"}</button>{result.outcome!=="human-review"&&<button className="secondary" onClick={()=>resolve("human-review")}>Escalate to human reviewer</button>}</div></div>}
        {["violation","human-review","upheld"].includes(challenge.status)&&<div className="replayResolution"><label className="field"><span>Remedy / corrective action</span><textarea value={remedy} onChange={e=>setRemedy(e.target.value)} placeholder="Example: restore opportunity credit, correct the worker record, or schedule cooperative review…"/></label><button onClick={()=>{run(()=>remedyChallenge(state,challenge.id,remedy),"Replay Court remedy recorded.");setRemedy("");}}>Record remedy</button></div>}
        {challenge.adminNote&&<div className="caseMessage"><strong>Cooperative response</strong><span>{challenge.adminNote}</span></div>}{challenge.remedy&&<div className="caseRemedy"><strong>Recorded remedy</strong><span>{challenge.remedy}</span></div>}
        {["confirmed","remedied","dismissed"].includes(challenge.status)&&<button className="secondary" onClick={()=>run(()=>closeChallenge(state,challenge.id),"Replay Court case closed with its evidence and outcome preserved.")}>Close case</button>}
      </>:<div className="replayEmpty"><strong>Select a case.</strong><span>Worker challenges will appear with the decision-time facts needed to replay them.</span></div>}</section>
    </div>
  </section>;
}
