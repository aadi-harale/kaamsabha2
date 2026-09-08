import { NextResponse } from "next/server";
import { issueOtp, verifyOtp } from "@/lib/otp";
import type { OtpPurpose } from "@/lib/otp";
import { resolveOtpRuntimeConfig } from "@/lib/otp-config";

export const runtime="nodejs";

function validPurpose(value:unknown):value is OtpPurpose{return value==="start"||value==="completion"}

export async function GET(){
  const config=resolveOtpRuntimeConfig(process.env);
  return NextResponse.json({ok:Boolean(config),mode:config?.source??"disabled",demo:Boolean(config?.demo)},{status:config?200:503});
}

export async function POST(request:Request){
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>;}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
  const jobId=typeof body.jobId==="string"?body.jobId:"",purpose=body.purpose;
  if(!jobId||!validPurpose(purpose))return NextResponse.json({error:"jobId and purpose are required"},{status:400});
  const config=resolveOtpRuntimeConfig(process.env);
  if(!config)return NextResponse.json({error:"KAAMSABHA_OTP_SECRET is not configured and demo fallback is disabled"},{status:503});

  if(body.action==="issue"){
    const issued=issueOtp(jobId,purpose,config.secret,Date.now(),5*60_000,crypto.randomUUID());
    return NextResponse.json({
      token:issued.token,
      expiresAt:issued.expiresAt,
      attemptsLeft:5,
      demoCode:config.demo?issued.code:undefined,
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
