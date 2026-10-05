import { NextResponse } from "next/server";
import { paymentService, publicInvoice } from "@/lib/payment-server";
import { verifySignature } from "@/lib/payments";
import { readRawBody } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function POST(request:Request){
  const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:"Webhook verification is not configured"},{status:503});
  const parsed=await readRawBody(request,64000);if(!parsed.ok)return NextResponse.json({error:parsed.error},{status:parsed.status});const raw=parsed.body;
  if(!verifySignature(raw,request.headers.get("x-razorpay-signature")??"",secret))return NextResponse.json({error:"Invalid webhook signature"},{status:401});
  try{const event=JSON.parse(raw.toString("utf8")),payment=event.payload?.payment?.entity;
    if(event.event!=="payment.captured")return NextResponse.json({received:true,ignored:true});
    const service=paymentService();
    const invoice=typeof payment?.order_id==="string"?service.repo.forOrder(payment.order_id):undefined;if(!invoice)throw new Error("Approved invoice is missing");
    const captured=await service.capture(invoice,String(payment.id),request.headers.get("x-razorpay-event-id")??undefined);
    return NextResponse.json({received:true,invoiceId:publicInvoice(captured).id});
  }catch{return NextResponse.json({error:"Webhook requires reconciliation; no unverified capture was posted"},{status:409});}
}
