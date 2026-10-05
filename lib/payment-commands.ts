import type { AppState, Job } from "./domain.ts";
import type { TestInvoice } from "./payments.ts";
/** The server invoice must describe the same customer-approved work as its total. */
export function invoiceScope(job:Job){return JSON.stringify({service:job.service,request:job.intakeNote?.trim()||job.service,approvedChanges:job.changeOrders.filter(c=>c.approved===true).map(c=>({id:c.id,description:c.description,amount:c.amountDelta}))});}
function matchesJob(state:AppState,job:Job,invoice:TestInvoice){const receipt=state.receipts.find(r=>r.id===job.receiptId);return invoice.jobId===job.id&&invoice.workerId===job.workerId&&invoice.receiptId===job.receiptId&&invoice.scope===invoiceScope(job)&&invoice.total===job.amount*100&&invoice.worker===invoice.total&&invoice.commission===0&&invoice.floor===(receipt?.protectionFloor??job.amount)*100;}
function jobReady(state:AppState,jobId:string){const job=state.jobs.find(j=>j.id===jobId);if(!job||job.status!=="completed"||!job.workerId||!job.receiptId)throw new Error("Completed, assigned booking required");if(state.settlements.some(s=>s.jobId===jobId))throw new Error("This job is already settled");if(job.handoverHistory?.some(h=>h.payReviewRequired&&!h.payReviewNote))throw new Error("Record the interrupted-work pay review first");return job;}
export function attachTestInvoice(state:AppState,jobId:string,invoice:TestInvoice,token:string):AppState{
  if(state.session?.role!=="admin")throw new Error("Cooperative admin required");const job=jobReady(state,jobId);
  if(!matchesJob(state,job,invoice)||!/^[a-f0-9]{64}$/.test(token))throw new Error("Server invoice differs from this job");
  return {...state,revision:state.revision+1,jobs:state.jobs.map(j=>j.id===jobId?{...j,gatewayInvoice:{invoiceId:invoice.id,accessToken:token}}:j)};
}
/** Called only after the same-origin server confirms capture or reconciles its webhook. */
export function recordTestCapture(state:AppState,jobId:string,invoice:TestInvoice):AppState{
  const candidate=state.jobs.find(j=>j.id===jobId);if(!candidate||!state.session||!(state.session.role==="admin"||state.session.role==="customer"&&state.session.userId===candidate.customerId))throw new Error("Booking customer or cooperative required");
  const existing=state.settlements.find(s=>s.jobId===jobId);if(existing&&existing.mode==="razorpay-test"&&existing.providerPaymentId===invoice.paymentId)return state;
  const job=jobReady(state,jobId);
  if(invoice.status!=="captured"||!invoice.paymentId||!invoice.orderId||!invoice.capturedAt||invoice.id!==job.gatewayInvoice?.invoiceId||!matchesJob(state,job,invoice)||invoice.worker<invoice.floor)throw new Error("Verified captured invoice required; earnings unchanged");
  return {...state,revision:state.revision+1,jobs:state.jobs.map(j=>j.id===job.id?{...j,status:"settled"}:j),settlements:[{id:`SET-${invoice.id}`,jobId:job.id,workerId:job.workerId,amount:invoice.total/100,workerPayout:invoice.worker/100,platformFee:invoice.commission/100,invoiceNumber:`TEST-${job.id}`,settledAt:invoice.capturedAt!,mode:"razorpay-test",providerPaymentId:invoice.paymentId,providerOrderId:invoice.orderId},...state.settlements]};
}
