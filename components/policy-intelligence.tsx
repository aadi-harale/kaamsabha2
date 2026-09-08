"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/domain";
import { readPolicyAnalyses, recordPolicyAnalysis, type PolicyAnalysis } from "@/lib/policy-intelligence";

type Run=(fn:()=>AppState,message?:string)=>void;

export function PolicyIntelligence({state,run}:{state:AppState;run:Run}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const sourceIssues=useMemo(()=>state.issues.filter(i=>i.openedBy!=="policy-ai"),[state.issues]);
 const sourceSuggestions=state.suggestions;
 const history=readPolicyAnalyses(state);
 const latest=history[0];
 async function analyze(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/ai/policy",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({issues:sourceIssues.map(i=>({category:i.category,text:[i.category,...i.notes].join(" — ")})),suggestions:sourceSuggestions.map(s=>({category:s.category,text:`${s.title}: ${s.details}`}))})});
   const data=await response.json() as PolicyAnalysis&{error?:string};
   if(!response.ok)throw new Error(data.error||"Policy analysis failed");
   run(()=>recordPolicyAnalysis(state,data,sourceIssues.map(i=>i.id),sourceSuggestions.map(s=>s.id)),"Collective policy signals analyzed and stored for human review.");
  }catch(e){setError(e instanceof Error?e.message:"Policy analysis failed");}finally{setBusy(false);}
 }
 return <section className="panel policyIntel">
  <div className="policyIntelHead"><div><p className="eyebrow">COLLECTIVE PATTERN COURT · POLICY SIGNAL MONITOR</p><h2>Find repeated worker concerns before they become invisible patterns.</h2><p className="muted">AI reads anonymized issue and suggestion text, clusters themes and drafts discussion language. It cannot rank workers, punish anyone, dispatch, vote, set pay or activate policy.</p></div><button disabled={busy||sourceIssues.length+sourceSuggestions.length===0} onClick={()=>void analyze()}>{busy?"Analyzing member voice…":"Analyze all member voice"}</button></div>
  <div className="policyIntelStats"><div><span>Worker issues</span><strong>{sourceIssues.length}</strong></div><div><span>Suggestions</span><strong>{sourceSuggestions.length}</strong></div><div><span>Analysis snapshots</span><strong>{history.length}</strong></div><div><span>Latest mode</span><strong>{latest?.analysis.mode==="ai-assisted"?"AI assisted":latest?"Deterministic fallback":"Not run"}</strong></div></div>
  {error&&<p className="error" role="alert">{error}</p>}
  {latest?<div className="policyIntelBody"><div><div className="sectionTitle"><div><h3>Repeated themes</h3><p className="muted">{latest.analysis.analyzedCount} voice records analyzed · {new Date(latest.createdAt).toLocaleString()}</p></div><span className="statusChip">Human review required</span></div><div className="policyThemeGrid">{latest.analysis.themes.map(theme=><article key={`${theme.label}-${theme.count}`}><span className={`signalSeverity ${theme.severity}`}>{theme.severity}</span><strong>{theme.label}</strong><b>{theme.count} signal{theme.count===1?"":"s"}</b><p>{theme.evidence||"Theme detected from member voice."}</p></article>)}</div></div><aside className="policyDraft"><small>DRAFT FOR DISCUSSION — NOT EXECUTABLE POLICY</small><h3>{latest.analysis.draftTitle}</h3><p>{latest.analysis.draftDescription}</p><div><strong>Recommended next step</strong><span>{latest.analysis.recommendedAction}</span></div><p className="policyGuardrail">Next: protection validation → Policy Twin → personal impact → member ballot. AI stops before all of those decisions.</p></aside></div>:<div className="policyIntelEmpty"><strong>No collective analysis yet.</strong><span>Workers can write complaints and suggestions in their own words; this monitor helps admins spot repeated themes without turning complaints into automatic penalties.</span></div>}
 </section>;
}
