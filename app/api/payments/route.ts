import { NextResponse } from "next/server";
import { paymentConfiguration, paymentService, publicInvoice, requirePaymentOperator, workerLinkedAccount } from "@/lib/payment-server";
import { clientKey, rateLimit, rateLimitHeaders, readJsonBody } from "@/lib/rate-limit";
export const runtime="nodejs";
export async function GET(){return NextResponse.json(paymentConfiguration());}
export async function POST(request:Request){
  const limit=rateLimit(clientKey(request,"payments"),30,60000);if(!limit.ok)return NextResponse.json({error:"Too many payment requests. Wait before retrying."},{status:429,headers:rateLimitHeaders(limit,30)});
  const parsed=await readJsonBody(request,12000);if(!parsed.ok)return NextResponse.json({error:parsed.error},{status:parsed.status});
  try{const b=parsed.body,service=paymentService(),id=typeof b.invoiceId==="string"?b.invoiceId:"",token=typeof b.accessToken==="string"?b.accessToken:"";
    if(["approve","transfer","reconcile-order","reconcile-transfer"].includes(String(b.action)))requirePaymentOperator(request);
    if(b.action==="approve"){const invoice=service.approve(b);return NextResponse.json({invoice:publicInvoice(invoice),accessToken:invoice.token});}
    if(b.action==="read")return NextResponse.json({invoice:publicInvoice(await service.read(id,token))});
    if(b.action==="order")return NextResponse.json({invoice:publicInvoice(await service.order(id,token)),keyId:paymentConfiguration().keyId});
    if(b.action==="verify")return NextResponse.json({invoice:publicInvoice(await service.confirm(id,token,String(b.paymentId??""),String(b.signature??"")))});
    if(b.action==="transfer"){const invoice=service.repo.find(id);if(!invoice)throw new Error("Invoice missing");return NextResponse.json({invoice:publicInvoice(await service.transfer(id,workerLinkedAccount(invoice.workerId)))});}
    if(b.action==="reconcile-order")return NextResponse.json({invoice:publicInvoice(await service.reconcileOrder(id,String(b.orderId??"")))});
    if(b.action==="reconcile-transfer")return NextResponse.json({invoice:publicInvoice(await service.reconcileTransfer(id,String(b.transferId??"")))});
    return NextResponse.json({error:"Unknown payment action"},{status:400});
  }catch(error){const message=error instanceof Error?error.message:"Payment request failed";return NextResponse.json({error:message},{status:message.includes("access denied")?403:409});}
}
