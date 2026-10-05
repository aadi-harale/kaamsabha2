import { DatabaseSync } from "node:sqlite";
import type { PaymentRepository, PaymentStatus, TestInvoice } from "./payments.ts";

/** The server owns immutable test invoices and the unique captured-payment ledger. */
export class SqlitePaymentRepository implements PaymentRepository {
  private db:DatabaseSync;
  constructor(path:string){this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY, job_id TEXT UNIQUE NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ledger(invoice_id TEXT PRIMARY KEY, payment_id TEXT UNIQUE NOT NULL, amount INTEGER NOT NULL, worker INTEGER NOT NULL, commission INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_events(id TEXT PRIMARY KEY);`);}
  find(id:string){const row=this.db.prepare("SELECT data FROM invoices WHERE id=?").get(id) as {data:string}|undefined;return row?JSON.parse(row.data) as TestInvoice:undefined;}
  forJob(jobId:string){const row=this.db.prepare("SELECT data FROM invoices WHERE job_id=?").get(jobId) as {data:string}|undefined;return row?JSON.parse(row.data) as TestInvoice:undefined;}
  forOrder(orderId:string){const row=this.db.prepare("SELECT data FROM invoices WHERE json_extract(data,'$.orderId')=?").get(orderId) as {data:string}|undefined;return row?JSON.parse(row.data) as TestInvoice:undefined;}
  create(i:TestInvoice){this.db.prepare("INSERT INTO invoices VALUES(?,?,?,?)").run(i.id,i.jobId,i.status,JSON.stringify(i));}
  save(i:TestInvoice){const old=this.find(i.id);if(!old)throw new Error("Invoice missing");
    for(const field of ["jobId","workerId","receiptId","scope","total","worker","commission","floor","token","createdAt"] as const)if(old[field]!==i[field])throw new Error("Approved invoice fields are immutable");
    if(old.status==="captured"&&(i.status!=="captured"||i.paymentId!==old.paymentId))throw new Error("Captured invoice cannot be reset");
    this.db.prepare("UPDATE invoices SET status=?,data=? WHERE id=?").run(i.status,JSON.stringify(i),i.id);}
  claim(id:string,from:PaymentStatus,to:PaymentStatus){return Number(this.db.prepare("UPDATE invoices SET status=?,data=json_set(data,'$.status',?) WHERE id=? AND status=?").run(to,to,id,from).changes)===1;}
  capture(id:string,paymentId:string,eventId?:string){this.db.exec("BEGIN IMMEDIATE");try{const i=this.find(id);if(!i)throw new Error("Invoice missing");if(i.status==="captured"){if(i.paymentId!==paymentId)throw new Error("A different payment is already recorded; cooperative refund review required");this.db.exec("COMMIT");return i;}
    if(i.status!=="ordered")throw new Error("Invoice has no approved order");
    if(eventId)this.db.prepare("INSERT INTO webhook_events VALUES(?)").run(eventId);
    this.db.prepare("INSERT INTO ledger VALUES(?,?,?,?,?)").run(id,paymentId,i.total,i.worker,i.commission);
    const next:TestInvoice={...i,status:"captured",paymentId,capturedAt:new Date().toISOString()};this.save(next);this.db.exec("COMMIT");return next;
  }catch(error){this.db.exec("ROLLBACK");throw error;}}
  claimTransfer(id:string,account:string){this.db.exec("BEGIN IMMEDIATE");try{const i=this.find(id);if(!i||i.status!=="captured"||i.transfer){this.db.exec("COMMIT");return false;}this.save({...i,transfer:{account,amount:i.worker,status:"requesting"}});this.db.exec("COMMIT");return true;}catch(error){this.db.exec("ROLLBACK");throw error;}}
  close(){this.db.close();}
}
