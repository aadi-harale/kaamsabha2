import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type PaymentStatus = "approved" | "ordering" | "order-review" | "ordered" | "captured";
export interface TestInvoice {
  id:string; token:string; jobId:string; workerId:string; receiptId:string; scope:string;
  total:number; worker:number; commission:number; floor:number; status:PaymentStatus;
  orderId?:string; paymentId?:string; pendingPaymentId?:string; createdAt:string; capturedAt?:string;
  transfer?: {status:"requesting"|"review"|"created"|"pending"|"processed"|"failed"|"reversed"|"partially_reversed";id?:string;account:string;amount:number;settlementStatus?:string;amountReversed?:number;providerFees?:number;providerTax?:number};
}
export interface PaymentRepository {
  find(id:string):TestInvoice|undefined;
  forJob(jobId:string):TestInvoice|undefined;
  forOrder(orderId:string):TestInvoice|undefined;
  create(invoice:TestInvoice):void;
  claim(id:string, from:PaymentStatus, to:PaymentStatus):boolean;
  save(invoice:TestInvoice):void;
  capture(id:string,paymentId:string,eventId?:string):TestInvoice;
  claimTransfer(id:string,account:string):boolean;
}
export interface GatewayTransport { call(path:string,method?:"GET"|"POST",body?:unknown):Promise<Record<string,unknown>>; }
export function equalSecret(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function verifySignature(payload:string|Uint8Array,signature:string,secret:string){return /^[a-f0-9]{64}$/i.test(signature)&&equalSecret(createHmac("sha256",secret).update(payload).digest("hex"),signature.toLowerCase());}
export function approvedInvoice(input:Record<string,unknown>):TestInvoice{
  const {jobId,workerId,receiptId,scope,amount,protectionFloor}=input;
  if(typeof jobId!=="string"||!/^KMS-\d{5,}$/.test(jobId)||typeof workerId!=="string"||!/^W\d{2,}$/.test(workerId)||typeof receiptId!=="string"||receiptId.length>100||!receiptId||typeof scope!=="string"||!scope.trim()||scope.length>3000||typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<1||amount>100000||typeof protectionFloor!=="number"||!Number.isSafeInteger(protectionFloor)||protectionFloor<1||amount<protectionFloor)throw new Error("Review a complete INR invoice with its protected payout before approval");
  // The current constitution charges zero platform commission. Never invent a fee.
  return {id:`test_${randomBytes(12).toString("hex")}`,token:randomBytes(32).toString("hex"),jobId,workerId,receiptId,scope:scope.trim(),total:amount*100,worker:amount*100,commission:0,floor:protectionFloor*100,status:"approved",createdAt:new Date().toISOString()};
}
export class TestPaymentService {
  readonly repo:PaymentRepository;
  readonly gateway:GatewayTransport;
  readonly secret:string;
  constructor(repo:PaymentRepository,gateway:GatewayTransport,secret:string){this.repo=repo;this.gateway=gateway;this.secret=secret;}
  authenticate(id:string,token:string){const invoice=this.repo.find(id);if(!invoice||!equalSecret(invoice.token,token))throw new Error("Invoice access denied");return invoice;}
  approve(input:Record<string,unknown>){const next=approvedInvoice(input),old=this.repo.forJob(next.jobId);if(old){if(old.total!==next.total||old.workerId!==next.workerId||old.receiptId!==next.receiptId||old.scope!==next.scope||old.floor!==next.floor)throw new Error("Approved invoice is frozen. Resolve the changed job with the cooperative.");return old;}this.repo.create(next);return next;}
  async order(id:string,token:string){let invoice=this.authenticate(id,token);if(invoice.orderId)return invoice;if(!this.repo.claim(id,"approved","ordering"))throw new Error("An order is already being created or needs cooperative reconciliation. Do not retry payment.");
    try{const order=await this.gateway.call("orders","POST",{amount:invoice.total,currency:"INR",receipt:invoice.id,notes:{invoice_id:invoice.id,job_id:invoice.jobId}});if(typeof order.id!=="string"||!order.id.startsWith("order_")||order.amount!==invoice.total||order.currency!=="INR")throw new Error("Provider order differs from the approved invoice");invoice={...invoice,status:"ordered",orderId:order.id};this.repo.save(invoice);return invoice;}catch(error){this.repo.save({...invoice,status:"order-review"});throw error;}}
  async reconcileOrder(id:string,orderId:string){const invoice=this.repo.find(id);if(!invoice||!["order-review","ordering"].includes(invoice.status)||!/^order_[A-Za-z0-9]+$/.test(orderId))throw new Error("Choose an invoice awaiting order reconciliation");const order=await this.gateway.call(`orders/${orderId}`);if(order.amount!==invoice.total||order.currency!=="INR"||order.receipt!==invoice.id)throw new Error("That provider order does not match this frozen invoice");const next={...invoice,orderId,status:"ordered" as const};this.repo.save(next);return next;}
  async confirm(id:string,token:string,paymentId:string,signature:string){let invoice=this.authenticate(id,token);if(!invoice.orderId||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||!verifySignature(`${invoice.orderId}|${paymentId}`,signature,this.secret))throw new Error("Payment signature is invalid");if(invoice.status!=="captured"){invoice={...invoice,pendingPaymentId:paymentId};this.repo.save(invoice);}return this.capture(invoice,paymentId);}
  async read(id:string,token:string){const invoice=this.authenticate(id,token);return invoice.status!=="captured"&&invoice.pendingPaymentId?this.capture(invoice,invoice.pendingPaymentId):invoice;}
  async capture(invoice:TestInvoice,paymentId:string,eventId?:string){if(!/^pay_[A-Za-z0-9]+$/.test(paymentId))throw new Error("Invalid payment reference");const payment=await this.gateway.call(`payments/${paymentId}`);if(payment.status!=="captured"||payment.order_id!==invoice.orderId||payment.amount!==invoice.total||payment.currency!=="INR")throw new Error("Payment is not captured for this exact invoice. No earnings were posted.");return this.repo.capture(invoice.id,paymentId,eventId);}
  async transfer(id:string,account:string){const invoice=this.repo.find(id);if(!invoice||invoice.status!=="captured"||!invoice.paymentId||!/^acc_[A-Za-z0-9]+$/.test(account))throw new Error("Captured payment and a verified Route linked account are required");if(!this.repo.claimTransfer(id,account))throw new Error("Transfer already exists or needs provider reconciliation; it will not be sent twice");try{const result=await this.gateway.call(`payments/${invoice.paymentId}/transfers`,"POST",{transfers:[{account,amount:invoice.worker,currency:"INR",notes:{invoice_id:invoice.id,worker_id:invoice.workerId}}]});const items=result.items as Record<string,unknown>[]|undefined,t=items?.[0];if(!t||typeof t.id!=="string")throw new Error("Provider did not return a transfer reference");const current=this.repo.find(id)!;const next={...current,transfer:{id:t.id,account,amount:invoice.worker,status:"created" as const}};this.repo.save(next);return next;}catch(error){const current=this.repo.find(id)!;this.repo.save({...current,transfer:{account,amount:invoice.worker,status:"review"}});throw error;}}
  async reconcileTransfer(id:string,transferId:string){const invoice=this.repo.find(id);if(!invoice||invoice.status!=="captured"||!invoice.transfer||!/^trf_[A-Za-z0-9]+$/.test(transferId))throw new Error("A recorded transfer is required");const t=await this.gateway.call(`transfers/${transferId}`);if(t.source!==invoice.paymentId||t.recipient!==invoice.transfer.account||t.amount!==invoice.worker||t.currency!=="INR")throw new Error("Transfer does not match the worker's protected payment");const reported=t.status??t.transfer_status;
const known=["created","pending","processed","failed","reversed","partially_reversed"];
const status=(known.includes(String(reported))?reported:"review") as NonNullable<TestInvoice["transfer"]>["status"];
const numeric=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?v:undefined;
const next:TestInvoice={...invoice,transfer:{...invoice.transfer,id:transferId,status,settlementStatus:typeof t.settlement_status==="string"?t.settlement_status:undefined,amountReversed:numeric(t.amount_reversed),providerFees:numeric(t.fees),providerTax:numeric(t.tax)}};this.repo.save(next);return next;}
}
