import { NextResponse } from "next/server";

export const runtime="nodejs";

type SupportResponse={mode:"ai-assisted"|"manual-fallback";reply:string;photoRecommended:boolean;createCase:boolean;notice:string};

function sanitize(value:unknown,max=1200){return typeof value==="string"?value.replace(/\s+/g," ").trim().slice(0,max):"";}

function fallback(category:string,text:string,attachmentName:string):SupportResponse{
  const photoRecommended=["Scope / extra charge","Service quality","Safety concern"].includes(category);
  const attached=Boolean(attachmentName);
  let reply="I’ll record this for cooperative support so an admin can review it.";
  if(category==="Track my booking")reply="Open Orders to see the shared booking status and route. I’ll also create a support record if you want the cooperative to check the delay.";
  if(category==="Scope / extra charge")reply="Do not accept an unapproved extra charge. KaamSabha uses Scope Lock: any added work and price must be approved before the Start OTP unlocks work.";
  if(category==="Payment / invoice")reply="Your payment and invoice should only appear after completion is confirmed. I’ll attach this request to the cooperative money/support register for review.";
  if(category==="Service quality")reply="Describe what was incomplete or incorrect. A photo can help the cooperative review the case. Your complaint will not automatically deactivate the worker.";
  if(category==="Safety concern")reply="If there is immediate danger, stop the service and move to safety first. I’ll mark this as a support case for cooperative review; a photo can be attached if it is safe to take one.";
  if(category==="Worker delayed / no-show")reply="Check Orders for the current route/status. I’ll record the delay so the cooperative can review the assignment and service promise.";
  if(category==="Something else")reply="Tell me the problem in your own words. I’ll keep the answer practical and create a reviewable support record.";
  if(attached)reply+=` Your attachment “${attachmentName}” will be listed for human review; I am not claiming to visually inspect it.`;
  return{mode:"manual-fallback",reply,photoRecommended,createCase:true,notice:"Support assistant fallback used. It cannot refund, dispatch, penalize workers, alter ratings, or change policy."};
}

function valid(value:unknown,category:string,text:string,attachmentName:string):SupportResponse|null{
  if(!value||typeof value!=="object")return null;
  const v=value as Record<string,unknown>;
  if(typeof v.reply!=="string")return null;
  return{
    mode:"ai-assisted",
    reply:v.reply.replace(/\s+/g," ").trim().slice(0,900),
    photoRecommended:typeof v.photoRecommended==="boolean"?v.photoRecommended:["Scope / extra charge","Service quality","Safety concern"].includes(category),
    createCase:true,
    notice:"AI provides guidance only. The support case is still reviewed by the cooperative and cannot automatically penalize a worker."
  };
}

export async function POST(request:Request){
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
  const category=sanitize(body.category,80),text=sanitize(body.text),attachmentName=sanitize(body.attachmentName,180),jobSummary=sanitize(body.jobSummary,500);
  if(!category||!text)return NextResponse.json({error:"Choose a help topic and describe what happened"},{status:400});
  const manual=fallback(category,text,attachmentName);
  const key=process.env.OPENROUTER_API_KEY,model=process.env.OPENROUTER_MODEL;
  if(!key||!model)return NextResponse.json(manual);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
    const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"content-type":"application/json","HTTP-Referer":"https://kaamsabha2.vercel.app","X-Title":"KaamSabha Customer Help"},
      signal:controller.signal,
      body:JSON.stringify({
        model,temperature:0.15,response_format:{type:"json_object"},
        messages:[
          {role:"system",content:"You are a concise customer-help assistant for KaamSabha, a worker-owned household-services cooperative. Give practical next steps in plain language. Never promise refunds, never change a booking, never choose or punish a worker, never infer fault, never alter ratings, dispatch, pay, Replay Court, or policy. Every submitted concern will also become a human-reviewable cooperative support case. If a photo filename is provided, say it is attached for human review; do not claim you visually inspected the image. Return JSON only with reply and photoRecommended."},
          {role:"user",content:`Topic: ${category}\nCustomer message: ${text}\nBooking context: ${jobSummary||"general help"}\nAttachment filename: ${attachmentName||"none"}`}
        ]
      })
    });
    if(!response.ok)throw new Error("provider failed");
    const payload=await response.json() as {choices?:{message?:{content?:string}}[]};
    const content=payload.choices?.[0]?.message?.content;
    if(!content)throw new Error("empty provider output");
    return NextResponse.json(valid(JSON.parse(content),category,text,attachmentName)||manual);
  }catch{return NextResponse.json(manual);}finally{clearTimeout(timer);}
}
