import { NextResponse } from "next/server";

export const runtime="nodejs";

type VoiceItem={kind:"issue"|"suggestion";category:string;text:string};
type Theme={label:string;count:number;severity:"low"|"medium"|"high";evidence:string};

function sanitize(value:unknown,max=500){return typeof value==="string"?value.replace(/\s+/g," ").trim().slice(0,max):"";}
function normalizeItems(body:Record<string,unknown>):VoiceItem[]{
 const issues=Array.isArray(body.issues)?body.issues:[],suggestions=Array.isArray(body.suggestions)?body.suggestions:[];
 const out:VoiceItem[]=[];
 for(const raw of issues.slice(0,60)){if(!raw||typeof raw!=="object")continue;const item=raw as Record<string,unknown>;const category=sanitize(item.category,100),text=sanitize(item.text,600);if(category||text)out.push({kind:"issue",category,text});}
 for(const raw of suggestions.slice(0,60)){if(!raw||typeof raw!=="object")continue;const item=raw as Record<string,unknown>;const category=sanitize(item.category,100),text=sanitize(item.text,600);if(category||text)out.push({kind:"suggestion",category,text});}
 return out.slice(0,100);
}

function fallback(items:VoiceItem[]){
 const buckets=[
  {label:"Pay & protection",re:/pay|payout|earning|wage|money|fee|deduction|settlement/i},
  {label:"Dispatch & opportunity access",re:/dispatch|allocation|opportun|job access|ranking|priority|fair/i},
  {label:"Workload & safety",re:/workload|rest|fatigue|safety|unsafe|heavy|hours/i},
  {label:"Scope & change orders",re:/scope|extra|material|change order|customer approval/i},
  {label:"Travel & service area",re:/travel|distance|route|area|radius|eta/i},
  {label:"Ratings & review",re:/rating|review|complaint|deactiv|penalty/i},
 ];
 const themes:Theme[]=buckets.map(bucket=>{const matches=items.filter(item=>bucket.re.test(`${item.category} ${item.text}`));const count=matches.length;return{label:bucket.label,count,severity:count>=4?"high":count>=2?"medium":"low",evidence:matches[0]?.text.slice(0,180)||"No repeated signal in this category."};}).filter(t=>t.count>0).sort((a,b)=>b.count-a.count).slice(0,6);
 if(!themes.length)themes.push({label:"General member feedback",count:items.length,severity:items.length>=4?"medium":"low",evidence:items[0]?.text.slice(0,180)||"No text supplied."});
 const top=themes[0];
 return{mode:"manual-fallback" as const,analyzedCount:items.length,themes,recommendedAction:`Review the ${top.label.toLowerCase()} pattern with affected worker-members, verify it against Decision Receipts and workload/opportunity records, then decide whether a Policy Twin is warranted.`,draftTitle:`Member review: ${top.label}`,draftDescription:`Multiple member voice records point to ${top.label.toLowerCase()}. Validate the pattern against frozen operational records before drafting any executable rule. Keep the Worker Protection Floor, safe-refusal, workload, rating-firewall and no-reverse-bidding safeguards unchanged.`,notice:"AI provider unavailable. KaamSabha used a deterministic category/keyword fallback. No dispatch, pay, worker status, vote or policy changed."};
}

function validate(value:unknown,count:number){
 if(!value||typeof value!=="object")return null;const v=value as Record<string,unknown>;
 const rawThemes=Array.isArray(v.themes)?v.themes:[];
 const themes:Theme[]=rawThemes.slice(0,6).flatMap(raw=>{if(!raw||typeof raw!=="object")return[];const t=raw as Record<string,unknown>;const label=sanitize(t.label,80),evidence=sanitize(t.evidence,220);const n=Math.max(1,Math.min(count,Number(t.count)||1));const severity=t.severity==="high"||t.severity==="medium"?t.severity:"low";return label?[{label,count:n,severity,evidence}]:[];});
 const recommendedAction=sanitize(v.recommendedAction,400),draftTitle=sanitize(v.draftTitle,120),draftDescription=sanitize(v.draftDescription,700);
 if(!themes.length||!recommendedAction||!draftTitle||!draftDescription)return null;
 return{mode:"ai-assisted" as const,analyzedCount:count,themes,recommendedAction,draftTitle,draftDescription,notice:"AI clustered member voice for admin review only. It cannot rank workers, punish anyone, vote, dispatch, set pay or activate policy."};
}

export async function POST(request:Request){
 let body:Record<string,unknown>;try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 const items=normalizeItems(body);if(!items.length)return NextResponse.json({error:"No worker issues or suggestions to analyze"},{status:400});
 const key=process.env.OPENROUTER_API_KEY,model=process.env.OPENROUTER_MODEL;if(!key||!model)return NextResponse.json(fallback(items));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json","HTTP-Referer":"https://kaamsabha2.vercel.app","X-Title":"KaamSabha Policy Signal Monitor"},signal:controller.signal,body:JSON.stringify({model,temperature:0.1,response_format:{type:"json_object"},messages:[{role:"system",content:"You are a policy-signal clustering assistant for a worker-owned cooperative. Read anonymized worker issues and suggestions, identify repeated policy themes, and draft discussion language. Never infer guilt, rank workers, recommend penalties/deactivation, choose workers, set pay, vote, dispatch, decide challenges, or activate policy. Existing worker protections are constitutional constraints. Return JSON only with themes:[{label,count,severity,evidence}], recommendedAction, draftTitle, draftDescription."},{role:"user",content:JSON.stringify(items)}]})});
  if(!response.ok)throw new Error("provider failed");const payload=await response.json() as {choices?:{message?:{content?:string}}[]};const content=payload.choices?.[0]?.message?.content;if(!content)throw new Error("empty provider output");const parsed=validate(JSON.parse(content),items.length);return NextResponse.json(parsed||fallback(items));
 }catch{return NextResponse.json(fallback(items));}finally{clearTimeout(timer);}
}
