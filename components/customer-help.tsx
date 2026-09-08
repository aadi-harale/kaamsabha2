"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AppState } from "@/lib/domain";
import { createCustomerHelpCase, type CustomerHelpCategory } from "@/lib/customer-support";

type Run=(fn:()=>AppState,message?:string)=>void;
type ChatMessage={role:"assistant"|"customer";text:string};

type SupportReply={mode:"ai-assisted"|"manual-fallback";reply:string;photoRecommended:boolean;createCase:boolean;notice:string};

const options:{category:CustomerHelpCategory;title:string;note:string;photo:boolean}[]=[
  {category:"Track my booking",title:"Track my booking",note:"Status, route or arrival time",photo:false},
  {category:"Scope / extra charge",title:"Extra work or charge",note:"Scope Lock and approval questions",photo:true},
  {category:"Payment / invoice",title:"Payment or invoice",note:"Checkout, receipt or settlement",photo:false},
  {category:"Service quality",title:"Service quality",note:"Incomplete or incorrect work",photo:true},
  {category:"Safety concern",title:"Safety concern",note:"Unsafe condition or behaviour",photo:true},
  {category:"Worker delayed / no-show",title:"Worker delayed",note:"Late arrival or no-show",photo:false},
  {category:"Something else",title:"Something else",note:"Describe it in your own words",photo:true},
];

function assistantPrompt(category:CustomerHelpCategory){
  if(category==="Track my booking")return"Tell me what looks wrong with the current status or arrival time.";
  if(category==="Scope / extra charge")return"Tell me what extra work or charge was requested. If useful, you can attach a photo for cooperative review.";
  if(category==="Payment / invoice")return"Tell me what is missing or incorrect in the payment or invoice flow.";
  if(category==="Service quality")return"Describe what was incomplete or incorrect. A photo can help the cooperative review the case.";
  if(category==="Safety concern")return"Describe the safety concern. If there is immediate danger, stop the service and move to safety first.";
  if(category==="Worker delayed / no-show")return"Tell me how long the delay has been or what the current booking status shows.";
  return"Tell me what happened in your own words. I’ll keep it simple and create a reviewable support record.";
}

export function CustomerHelp({state,job,run}:{state:AppState;job?:AppState["jobs"][number];run:Run}){
  const[category,setCategory]=useState<CustomerHelpCategory>("Track my booking");
  const[text,setText]=useState("");
  const[file,setFile]=useState<File|null>(null);
  const[busy,setBusy]=useState(false);
  const[messages,setMessages]=useState<ChatMessage[]>([{role:"assistant",text:"Hi — I can help with your booking, scope, payment, service quality or safety. Choose a topic below."}]);
  const wantsPhoto=useMemo(()=>options.find(o=>o.category===category)?.photo??false,[category]);
  const mine=state.issues.filter(i=>i.openedBy===state.session?.userId&&i.category.startsWith("Customer Help ·"));

  function choose(next:CustomerHelpCategory){
    setCategory(next);setText("");setFile(null);
    setMessages(prev=>[...prev,{role:"customer",text:next},{role:"assistant",text:assistantPrompt(next)}]);
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const clean=text.trim();if(!clean)return;
    setBusy(true);
    setMessages(prev=>[...prev,{role:"customer",text:clean}]);
    const jobSummary=job?`${job.id} · ${job.service} · ${job.status} · ${job.locality} · ₹${job.amount}`:"No active booking selected";
    let reply:SupportReply={mode:"manual-fallback",reply:"I’ll record this for cooperative support so an admin can review it.",photoRecommended:wantsPhoto,createCase:true,notice:"Manual fallback"};
    try{
      const response=await fetch("/api/ai/support",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({category,text:clean,attachmentName:file?.name??"",jobSummary})});
      const data=await response.json() as SupportReply|{error?:string};
      if(response.ok&&"reply" in data)reply=data;
    }catch{}
    setMessages(prev=>[...prev,{role:"assistant",text:reply.reply}]);
    run(()=>createCustomerHelpCase(state,{category,message:clean,jobId:job?.id,attachmentName:file?.name,assistantReply:reply.reply,aiMode:reply.mode}),"Support request saved and sent to the cooperative admin case register.");
    setText("");setFile(null);setBusy(false);
  }

  return <div className="customerHelpPage">
    <section className="supportHero helpHero"><div><p className="eyebrow">KAAMSABHA HELP</p><h2>Ask for help without turning support into an automatic worker penalty.</h2><p>Choose a common issue or describe it normally. Every submitted request is also visible to the cooperative admin for human review.</p></div><span className="supportBadge">AI-guided · human reviewed</span></section>
    <section className="helpLayout">
      <aside className="panel helpTopics"><div><p className="eyebrow">QUICK OPTIONS</p><h3>What do you need help with?</h3></div>{options.map(option=><button key={option.category} type="button" className={category===option.category?"helpTopic active":"helpTopic"} onClick={()=>choose(option.category)}><span><strong>{option.title}</strong><small>{option.note}</small></span><span aria-hidden="true">›</span></button>)}</aside>
      <section className="panel helpChat" aria-label="Customer help conversation">
        <div className="helpChatHead"><div><p className="eyebrow">HELP ASSISTANT</p><h3>{category}</h3></div><span className="microTag">{job?job.id:"General"}</span></div>
        <div className="helpMessages" aria-live="polite">{messages.slice(-8).map((message,index)=><div key={`${message.role}-${index}`} className={`helpMessage ${message.role}`}><span>{message.role==="assistant"?"KaamSabha":"You"}</span><p>{message.text}</p></div>)}</div>
        <form className="helpComposer" onSubmit={submit}><label className="field"><span>Tell me what happened</span><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Write in your own words…" required/></label>{wantsPhoto&&<label className="helpUpload"><span><strong>Attach a photo if it helps</strong><small>Stored as case evidence metadata for cooperative review. The assistant does not claim to inspect the image.</small></span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]??null)}/>{file&&<em>{file.name}</em>}</label>}<div className="helpComposerFoot"><span>{job?`Linked to ${job.id}`:"General support request"}</span><button disabled={busy||!text.trim()}>{busy?"Checking…":"Ask & send to support"}</button></div></form>
      </section>
    </section>
    <section className="panel helpCaseHistory"><div className="sectionTitle roomy"><div><h2>Your support requests</h2><p className="muted">The same records are visible in Admin → Cases.</p></div><span>{mine.length}</span></div>{mine.length?mine.map(issue=><div className="caseRow" key={issue.id}><div><small>{issue.id} · {issue.jobId??"General"}</small><strong>{issue.category.replace("Customer Help · ","")}</strong><span>Status: {issue.status}</span><p>{issue.notes.find(n=>n.startsWith("Customer request:"))?.replace("Customer request: ","")}</p></div></div>):<div className="empty"><span aria-hidden="true">○</span><p>No help requests yet.</p></div>}</section>
  </div>;
}
