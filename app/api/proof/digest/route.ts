import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readRawBody } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function POST(request:Request){const data=await readRawBody(request,2*1024*1024);if(!data.ok)return NextResponse.json({error:data.error},{status:data.status});return NextResponse.json({digest:createHash("sha256").update(data.body).digest("hex")});}
