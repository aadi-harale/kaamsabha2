import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SqlitePaymentRepository } from "./payment-repository.ts";
import { TestPaymentService, equalSecret, type GatewayTransport, type TestInvoice } from "./payments.ts";

let repository:SqlitePaymentRepository|undefined;
export function paymentConfiguration(){
  const key=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET,operator=process.env.PAYMENT_OPERATOR_TOKEN;
  const ready=Boolean(key?.startsWith("rzp_test_")&&secret&&operator&&operator.length>=32&&!process.env.VERCEL);
  return {ready,keyId:ready?key:undefined,reason:process.env.VERCEL?"This deployment needs a durable server payment repository. Local SQLite is disabled on Vercel.":"Set test-only Razorpay keys and a 32-character PAYMENT_OPERATOR_TOKEN in .env.local, then restart.",webhookConfigured:Boolean(process.env.RAZORPAY_WEBHOOK_SECRET)};
}
export function requirePaymentOperator(request:Request){const expected=process.env.PAYMENT_OPERATOR_TOKEN;if(!expected||expected.length<32||!equalSecret(request.headers.get("x-payment-operator")??"",expected))throw new Error("Payment operator access denied");}
export function paymentService(){
  if(!paymentConfiguration().ready)throw new Error(paymentConfiguration().reason);
  if(!repository){const directory=join(process.cwd(),".local-data");mkdirSync(directory,{recursive:true});repository=new SqlitePaymentRepository(join(directory,"payments.sqlite"));}
  const gateway:GatewayTransport={async call(path,method="GET",body){const response=await fetch(`https://api.razorpay.com/v1/${path}`,{method,headers:{Authorization:`Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),cache:"no-store"});if(!response.ok)throw new Error("Razorpay could not confirm the request. Check the test dashboard; no payment or transfer was assumed.");return await response.json() as Record<string,unknown>;}};
  return new TestPaymentService(repository,gateway,process.env.RAZORPAY_KEY_SECRET!);
}
export function publicInvoice(i:TestInvoice){const {token,...result}=i;void token;return {...result,mode:"razorpay-test"};}
export function workerLinkedAccount(workerId:string){try{const accounts=JSON.parse(process.env.RAZORPAY_LINKED_ACCOUNTS??"{}");const account=accounts[workerId];if(typeof account==="string"&&/^acc_[A-Za-z0-9]+$/.test(account))return account;}catch{/* Invalid configuration fails closed. */}throw new Error("Configure this member's verified Razorpay Route linked account before transferring.");}
