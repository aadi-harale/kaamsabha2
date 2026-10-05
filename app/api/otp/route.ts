import { NextResponse } from "next/server";
import { issueOtp, verifyOtp } from "@/lib/otp";
import type { OtpPurpose } from "@/lib/otp";
import { OTP_MAX_ATTEMPTS, OTP_TTL_MS, resolveOtpRuntimeConfig } from "@/lib/otp-config";
import { clientKey, rateLimit, rateLimitHeaders, readJsonBody } from "@/lib/rate-limit";

export const runtime="nodejs";

function validPurpose(value:unknown):value is OtpPurpose{return value==="start"||value==="completion"}

export async function GET(){
  const config=resolveOtpRuntimeConfig(process.env);
  return NextResponse.json({ok:Boolean(config),mode:config?.source??"disabled",demo:Boolean(config?.demo)},{status:config?200:503});
}

export async function POST(request:Request){
  // The per-challenge attempt budget is held in the browser's register, so the only thing
  // standing between an attacker and an unlimited guessing loop is this ceiling.
  const limit=rateLimit(clientKey(request,"otp"),30,60_000);
  if(!limit.ok)return NextResponse.json({error:"Too many code requests. Wait a moment and try again."},{status:429,headers:rateLimitHeaders(limit,30)});
  const parsed=await readJsonBody(request,8*1024);
  if(!parsed.ok)return NextResponse.json({error:parsed.error},{status:parsed.status});
  const body=parsed.body;
  const jobId=typeof body.jobId==="string"?body.jobId:"",purpose=body.purpose;
  if(!jobId||!validPurpose(purpose))return NextResponse.json({error:"jobId and purpose are required"},{status:400});
  const config=resolveOtpRuntimeConfig(process.env);
  if(!config)return NextResponse.json({error:"KAAMSABHA_OTP_SECRET is not configured and demo fallback is disabled"},{status:503});

  if(body.action==="issue"){
    const issuedAt=Date.now();
    const issued=issueOtp(jobId,purpose,config.secret,issuedAt,OTP_TTL_MS,crypto.randomUUID());
    return NextResponse.json({
      token:issued.token,
      issuedAt,
      expiresAt:issued.expiresAt,
      attemptsLeft:OTP_MAX_ATTEMPTS,
      // Only returned when the deployment is explicitly in demo mode. It stands in for the
      // SMS a real customer would read off their phone; the check itself is still the
      // server-side HMAC below.
      demoCode:config.demo?issued.code:undefined,
      demo:config.demo,
      mode:config.source
    });
  }

  if(body.action==="verify"){
    if(typeof body.token!=="string"||typeof body.code!=="string")return NextResponse.json({error:"token and code are required"},{status:400});
    const result=verifyOtp(body.token,body.code,jobId,purpose,config.secret);
    return NextResponse.json({...result,mode:config.source},{status:result.ok?200:400});
  }

  return NextResponse.json({error:"Unknown action"},{status:400});
}
