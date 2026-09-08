export type Role = "customer" | "worker" | "admin";
export type Locale = "en" | "hi" | "mr";
export type JobStatus = "requested" | "assigned" | "accepted" | "travelling" | "arrived" | "started" | "change_pending" | "completed" | "settled" | "cancelled";
export type SuggestionCategory = "pay" | "dispatch" | "safety" | "scope" | "access" | "other";

export interface Worker { id:string; name:string; cooperativeId:string; skills:string[]; verified:boolean; active:boolean; available:boolean; radiusKm:number; workloadTodayMinutes:number; rating:number; certifications?:string[]; maxDailyMinutes?:number; minRestMinutes?:number; availableUntil?:string; }
export interface Cooperative { id:string; name:string; active:boolean; serviceRadiusKm:number; policyVersion:string; }
export interface DecisionReceipt { id:string; jobId:string; policyVersion:string; workerId:string; cooperativeId:string; hardChecks:Record<string,boolean>; protectedPayout:number; estimatedCost:number; estimatedNet:number; reason:string; federationReason:string; createdAt:string; }
export interface OtpChallenge { purpose:"start"|"completion"; token:string; expiresAt:number; attemptsLeft:number; usedAt?:number; }
export interface Evidence { id:string; label:string; createdAt:string; uploadedBy:string; }
export interface ChangeOrder { id:string; description:string; amountDelta:number; requestedBy:string; approved?:boolean; decidedAt?:string; }
export interface Settlement { id:string; jobId:string; amount:number; workerPayout:number; platformFee:number; invoiceNumber:string; settledAt:string; }
export interface Feedback { id:string; jobId:string; customerId:string; rating:number; note:string; createdAt:string; }
export interface Challenge { id:string; jobId:string; workerId:string; reason:string; status:"open"|"upheld"|"dismissed"; replaySummary?:string; createdAt:string; }
export interface CancellationRecord { id:string; jobId:string; cancelledBy:string; reason:string; workerPayout:number; customerRefund:number; createdAt:string; }
export interface SafeDeclineRecord { id:string; jobId:string; workerId:string; reason:string; penalty:0; createdAt:string; }
export interface PolicySuggestion { id:string; workerId:string; category:SuggestionCategory; title:string; details:string; status:"submitted"|"under-review"|"accepted"|"declined"; createdAt:string; reviewedAt?:string; }
export interface IssueRecord { id:string; jobId?:string; openedBy:string; category:string; status:"open"|"responded"|"closed"; notes:string[]; }
export interface Job { id:string; customerId:string; service:string; locality:string; scheduledAt:string; emergency:boolean; status:JobStatus; workerId?:string; cooperativeId?:string; receiptId?:string; amount:number; intakeNote?:string; referenceName?:string; declinedWorkerIds?:string[]; startOtp?:OtpChallenge; completionOtp?:OtpChallenge; evidence:Evidence[]; changeOrders:ChangeOrder[]; }
export interface AppState { schema:1; revision:number; locale:Locale; session:{userId:string;role:Role}|null; cooperatives:Cooperative[]; workers:Worker[]; jobs:Job[]; receipts:DecisionReceipt[]; settlements:Settlement[]; cancellations:CancellationRecord[]; safeDeclines:SafeDeclineRecord[]; feedback:Feedback[]; challenges:Challenge[]; issues:IssueRecord[]; suggestions:PolicySuggestion[]; policyReviews:{proposalId:string;memberId:string;reviewedAt:string}[]; votes:{proposalId:string;memberId:string;choice:"yes"|"no"}[]; policy:{version:string;minimumPayout:number;maxAddedWaitMinutes:number;activeFrom:string}; }

export const POLICY={version:"constitution-v2",minimumPayout:760,maxAddedWaitMinutes:12,activeFrom:"2026-09-01T00:00:00.000Z"} as const;

export function initialState():AppState{return{schema:1,revision:0,locale:"en",session:null,policy:{...POLICY},cooperatives:[
{id:"coop-kharadi",name:"Kharadi Kaam Sabha",active:true,serviceRadiusKm:10,policyVersion:POLICY.version},
{id:"coop-yerawada",name:"Yerawada Kaam Sabha",active:true,serviceRadiusKm:10,policyVersion:POLICY.version},
{id:"coop-hadapsar",name:"Hadapsar Kaam Sabha",active:true,serviceRadiusKm:11,policyVersion:POLICY.version}],workers:[
{id:"W01",name:"Meena Jadhav",cooperativeId:"coop-yerawada",skills:["electrician"],certifications:["Electrical Safety L2"],verified:true,active:true,available:true,radiusKm:9,workloadTodayMinutes:160,rating:4.8,maxDailyMinutes:480,minRestMinutes:30},
{id:"W02",name:"Ravi Shinde",cooperativeId:"coop-kharadi",skills:["electrician","appliance"],certifications:["Electrical Safety L2","Appliance Repair L1"],verified:true,active:true,available:true,radiusKm:8,workloadTodayMinutes:210,rating:4.7,maxDailyMinutes:480,minRestMinutes:30},
{id:"W03",name:"Asha Kamble",cooperativeId:"coop-kharadi",skills:["cleaning"],certifications:["Home Hygiene L2"],verified:true,active:true,available:true,radiusKm:7,workloadTodayMinutes:130,rating:4.9,maxDailyMinutes:420,minRestMinutes:30},
{id:"W04",name:"Sagar Pawar",cooperativeId:"coop-hadapsar",skills:["plumbing"],certifications:["Plumbing & Leak Safety L1"],verified:true,active:true,available:true,radiusKm:10,workloadTodayMinutes:95,rating:4.8,maxDailyMinutes:480,minRestMinutes:30},
{id:"W05",name:"Nikita More",cooperativeId:"coop-yerawada",skills:["carpentry"],certifications:["Home Carpentry L1"],verified:true,active:true,available:true,radiusKm:9,workloadTodayMinutes:115,rating:4.9,maxDailyMinutes:420,minRestMinutes:30}],jobs:[],receipts:[],settlements:[],cancellations:[],safeDeclines:[],feedback:[],challenges:[],issues:[],suggestions:[],policyReviews:[],votes:[]};}

export function workerDailyLimit(worker:Worker){return worker.maxDailyMinutes??480;}
export function eligible(worker:Worker,service:string){return worker.verified&&worker.active&&worker.available&&worker.skills.includes(service)&&worker.workloadTodayMinutes<workerDailyLimit(worker);}
export function selectCooperative(state:AppState,service:string,excludedWorkerIds:string[]=[]):Cooperative|undefined{const excluded=new Set(excludedWorkerIds);const candidates=state.cooperatives.filter(c=>c.active).map(c=>{const workers=state.workers.filter(w=>w.cooperativeId===c.id&&!excluded.has(w.id)&&eligible(w,service));return{coop:c,capacity:workers.length};}).filter(x=>x.capacity>0);return candidates.sort((a,b)=>b.capacity-a.capacity||a.coop.id.localeCompare(b.coop.id))[0]?.coop;}
export function selectWorkerInCooperative(state:AppState,cooperativeId:string,service:string,excludedWorkerIds:string[]=[]):Worker|undefined{const excluded=new Set(excludedWorkerIds);return state.workers.filter(w=>w.cooperativeId===cooperativeId&&!excluded.has(w.id)&&eligible(w,service)).sort((a,b)=>a.workloadTodayMinutes-b.workloadTodayMinutes||a.id.localeCompare(b.id))[0];}
export function selectWorker(state:AppState,service:string,excludedWorkerIds:string[]=[]):Worker|undefined{const coop=selectCooperative(state,service,excludedWorkerIds);return coop?selectWorkerInCooperative(state,coop.id,service,excludedWorkerIds):undefined;}
