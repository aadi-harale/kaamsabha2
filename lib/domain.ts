export type Role = "customer" | "worker" | "admin";
export type Locale = "en" | "hi" | "mr";
export type JobStatus = "requested" | "assigned" | "accepted" | "travelling" | "arrived" | "started" | "change_pending" | "completed" | "settled" | "cancelled";
export type SuggestionCategory = "pay" | "dispatch" | "safety" | "scope" | "access" | "other";
export type ChallengeCategory = "eligibility" | "workload" | "opportunity" | "pay" | "federation" | "other";
export type ChallengeOutcome = "confirmed" | "violation" | "human-review";
export type ChallengeStatus = "open" | "replayed" | "confirmed" | "violation" | "human-review" | "remedied" | "closed" | "upheld" | "dismissed";

export interface Worker {
  id:string; name:string; cooperativeId:string; skills:string[]; verified:boolean; active:boolean; available:boolean;
  radiusKm:number; workloadTodayMinutes:number; rating:number; certifications?:string[]; maxDailyMinutes?:number;
  minRestMinutes?:number; availableUntil?:string;
}
export interface WorkerEarningEntry {
  id:string; workerId:string; service:string; amount:number; earnedAt:string;
  type:"job"|"cancellation"; label:string;
}
export interface Cooperative { id:string; name:string; locality:string; lat:number; lng:number; active:boolean; serviceRadiusKm:number; policyVersion:string; }
export interface DecisionCandidateSnapshot {
  workerId:string; verified:boolean; active:boolean; available:boolean; skill:boolean;
  workloadTodayMinutes:number; maxDailyMinutes:number; eligible:boolean;
}
export interface DecisionReceipt {
  id:string; jobId:string; policyVersion:string; workerId:string; cooperativeId:string; hardChecks:Record<string,boolean>;
  protectedPayout:number; protectionFloor?:number; estimatedCost:number; estimatedNet:number; reason:string; federationReason:string;
  createdAt:string; candidateWorkerIds?:string[]; candidateSnapshot?:DecisionCandidateSnapshot[];
}
export interface OtpChallenge { purpose:"start"|"completion"; token:string; expiresAt:number; attemptsLeft:number; usedAt?:number; }
export interface Evidence { id:string; label:string; createdAt:string; uploadedBy:string; }
export interface ChangeOrder { id:string; description:string; amountDelta:number; requestedBy:string; approved?:boolean; decidedAt?:string; }
export interface Settlement { id:string; jobId:string; amount:number; workerPayout:number; platformFee:number; invoiceNumber:string; settledAt:string; }
export interface Feedback { id:string; jobId:string; customerId:string; rating:number; note:string; createdAt:string; }
export interface ChallengeDecisionSnapshot {
  receiptId:string; jobId:string; policyVersion:string; selectedWorkerId:string; cooperativeId:string;
  hardChecks:Record<string,boolean>; protectedPayout:number; protectionFloor:number; estimatedCost:number; estimatedNet:number;
  reason:string; federationReason:string; candidateSnapshot:DecisionCandidateSnapshot[]; receiptCreatedAt:string;
}
export interface ChallengeReplayResult {
  outcome:ChallengeOutcome; expectedWorkerId?:string; selectedWorkerId:string; checksPassed:boolean; protectionPreserved:boolean;
  summary:string; replayedAt:string;
}
export interface Challenge {
  id:string; jobId:string; workerId:string; reason:string; category?:ChallengeCategory; desiredOutcome?:string;
  status:ChallengeStatus; replaySummary?:string; decisionSnapshot?:ChallengeDecisionSnapshot; replayResult?:ChallengeReplayResult;
  adminNote?:string; remedy?:string; createdAt:string; replayedAt?:string; resolvedAt?:string; closedAt?:string;
}
export interface CancellationRecord { id:string; jobId:string; cancelledBy:string; reason:string; workerPayout:number; customerRefund:number; createdAt:string; }
export interface SafeDeclineRecord { id:string; jobId:string; workerId:string; reason:string; penalty:0; createdAt:string; }
export interface OpportunityRecord { id:string; jobId:string; workerId:string; status:"offered"|"accepted"|"declined"; hardEligible:true; opportunityPenalty:0; createdAt:string; resolvedAt?:string; }
export interface PolicySuggestion { id:string; workerId:string; category:SuggestionCategory; title:string; details:string; status:"submitted"|"under-review"|"accepted"|"declined"; createdAt:string; reviewedAt?:string; }
export interface IssueRecord { id:string; jobId?:string; openedBy:string; category:string; status:"open"|"responded"|"closed"; notes:string[]; }
export interface Job {
  id:string; customerId:string; service:string; locality:string; scheduledAt:string; emergency:boolean; status:JobStatus;
  workerId?:string; cooperativeId?:string; homeCooperativeId?:string; receiptId?:string; federationOpportunityId?:string; amount:number;
  intakeNote?:string; referenceName?:string; declinedWorkerIds?:string[]; startOtp?:OtpChallenge; completionOtp?:OtpChallenge;
  evidence:Evidence[]; changeOrders:ChangeOrder[];
}

export interface PolicyProposalSimulation { currentFloor:number; proposedFloor:number; currentMaxWait:number; proposedMaxWait:number; workerProtectionDelta:number; affectedJobs:number; note:string; }
export interface PolicyProposal { id:string; title:string; description:string; proposedMinimumPayout:number; proposedMaxAddedWaitMinutes:number; status:"simulated"|"voting"|"active"|"rejected"; sourceSuggestionId?:string; createdAt:string; activatedAt?:string; simulation:PolicyProposalSimulation; }
export interface VoteRecord { proposalId:string; memberId:string; choice:"yes"|"no"; reason?:string; }

export interface FederationCapacity { cooperativeId:string; service:string; availableWorkers:number; activeWorkers:number; workloadBlocked:number; earliestEta:number; demand:"low"|"balanced"|"high"; }
export interface FederationCandidate { cooperativeId:string; availableWorkers:number; eta:number; protectionCompatible:boolean; slaCompatible:boolean; eligible:boolean; exclusionReason:string|null; }
export interface FederationOpportunity { id:string; jobId?:string; homeCooperativeId:string; service:string; slaMinutes:number; workerPayout:number; status:"open"|"accepted"|"unfilled"; selectedCooperativeId?:string; workerId?:string; candidates:FederationCandidate[]; federationReceiptId:string; workerReceiptId?:string; createdAt:string; }
export interface FederationSnapshot { id:string; opportunityId:string; homeCooperativeId:string; service:string; slaMinutes:number; workerPayout:number; capacities:FederationCapacity[]; selectedCooperativeId?:string; workerId?:string; createdAt:string; }
export interface FederationReplay { id:string; snapshotId:string; opportunityId:string; status:"confirmed"|"violation"; summary:string; createdAt:string; }
export interface FederationSettlement { id:string; opportunityId:string; customerTotal:number; workerAmount:number; welfareAmount:number; fulfillingCooperativeAmount:number; reconciles:boolean; createdAt:string; }
export interface FederationState { opportunities:FederationOpportunity[]; snapshots:FederationSnapshot[]; replays:FederationReplay[]; settlements:FederationSettlement[]; }

export interface AppState {
  schema:1; revision:number; locale:Locale; session:{userId:string;role:Role}|null; cooperatives:Cooperative[]; workers:Worker[];
  jobs:Job[]; receipts:DecisionReceipt[]; opportunities:OpportunityRecord[]; settlements:Settlement[]; cancellations:CancellationRecord[];
  earningsHistory:WorkerEarningEntry[];
  safeDeclines:SafeDeclineRecord[]; feedback:Feedback[]; challenges:Challenge[]; issues:IssueRecord[]; suggestions:PolicySuggestion[];
  proposals:PolicyProposal[]; policyReviews:{proposalId:string;memberId:string;reviewedAt:string}[]; votes:VoteRecord[]; federation:FederationState;
  policy:{version:string;minimumPayout:number;maxAddedWaitMinutes:number;activeFrom:string};
}

export const POLICY={version:"constitution-v2",minimumPayout:760,maxAddedWaitMinutes:12,activeFrom:"2026-09-01T00:00:00.000Z"} as const;
const seedTime="2026-09-01T00:00:00.000Z";
const proposalId="proposal-floor-860";
const seededVoters=["W01","W03","W04","W05","W06","W07","W08","W09"];

function seededFederation():FederationState{
  const candidates:FederationCandidate[]=[
    {cooperativeId:"coop-yerawada",availableWorkers:2,eta:24,protectionCompatible:true,slaCompatible:true,eligible:true,exclusionReason:null},
    {cooperativeId:"coop-viman",availableWorkers:0,eta:21,protectionCompatible:true,slaCompatible:true,eligible:false,exclusionReason:"Workload protection is active."},
    {cooperativeId:"coop-hadapsar",availableWorkers:1,eta:39,protectionCompatible:true,slaCompatible:false,eligible:false,exclusionReason:"The 39-minute arrival is outside the customer promise."}
  ];
  const capacities:FederationCapacity[]=[
    {cooperativeId:"coop-kharadi",service:"electrician",availableWorkers:0,activeWorkers:4,workloadBlocked:2,earliestEta:52,demand:"high"},
    {cooperativeId:"coop-yerawada",service:"electrician",availableWorkers:2,activeWorkers:4,workloadBlocked:1,earliestEta:24,demand:"balanced"},
    {cooperativeId:"coop-hadapsar",service:"electrician",availableWorkers:1,activeWorkers:3,workloadBlocked:0,earliestEta:39,demand:"balanced"},
    {cooperativeId:"coop-viman",service:"electrician",availableWorkers:0,activeWorkers:2,workloadBlocked:1,earliestEta:21,demand:"low"}
  ];
  return {
    opportunities:[{id:"FED-00001",homeCooperativeId:"coop-kharadi",service:"electrician",slaMinutes:35,workerPayout:760,status:"accepted",selectedCooperativeId:"coop-yerawada",workerId:"W01",candidates,federationReceiptId:"FED-RCPT-00001",workerReceiptId:"FED-WORKER-00001",createdAt:seedTime}],
    snapshots:[{id:"FED-SNAP-00001",opportunityId:"FED-00001",homeCooperativeId:"coop-kharadi",service:"electrician",slaMinutes:35,workerPayout:760,capacities,selectedCooperativeId:"coop-yerawada",workerId:"W01",createdAt:seedTime}],
    replays:[],
    settlements:[{id:"FED-SET-00001",opportunityId:"FED-00001",customerTotal:900,workerAmount:760,welfareAmount:40,fulfillingCooperativeAmount:100,reconciles:true,createdAt:seedTime}]
  };
}

function seededEarnings(workers:Worker[]):WorkerEarningEntry[]{
  const dates=["2026-07-19","2026-07-27","2026-08-04","2026-08-12","2026-08-20","2026-08-28","2026-09-03","2026-09-06"];
  const base=[760,820,760,940,860,1020,780,900];
  return workers.flatMap((worker,workerIndex)=>{
    const service=worker.skills[0]??"service";
    const regular=dates.map((date,index)=>({
      id:`HIST-${worker.id}-${index+1}`,
      workerId:worker.id,
      service,
      amount:base[index]+(workerIndex%4)*40,
      earnedAt:`${date}T12:00:00.000Z`,
      type:"job" as const,
      label:`${service.replaceAll("_"," ")} service completed`
    }));
    const protection:WorkerEarningEntry={
      id:`HIST-${worker.id}-P`,workerId:worker.id,service,amount:190,
      earnedAt:`2026-08-${String(16+(workerIndex%8)).padStart(2,"0")}T09:30:00.000Z`,
      type:"cancellation",label:"Protected cancellation payout"
    };
    return workerIndex%2===0?[...regular,protection]:regular;
  });
}

export function initialState():AppState{
  const workers:Worker[]=[
    {id:"W01",name:"Meena Jadhav",cooperativeId:"coop-yerawada",skills:["electrician"],certifications:["Electrical Safety L2"],verified:true,active:true,available:true,radiusKm:9,workloadTodayMinutes:160,rating:4.8,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W02",name:"Ravi Shinde",cooperativeId:"coop-kharadi",skills:["electrician","appliance"],certifications:["Electrical Safety L2","Appliance Repair L1"],verified:true,active:true,available:true,radiusKm:8,workloadTodayMinutes:210,rating:4.7,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W03",name:"Asha Kamble",cooperativeId:"coop-kharadi",skills:["cleaning"],certifications:["Home Hygiene L2"],verified:true,active:true,available:true,radiusKm:7,workloadTodayMinutes:130,rating:4.9,maxDailyMinutes:420,minRestMinutes:30},
    {id:"W04",name:"Sagar Pawar",cooperativeId:"coop-hadapsar",skills:["plumbing"],certifications:["Plumbing & Leak Safety L1"],verified:true,active:true,available:true,radiusKm:10,workloadTodayMinutes:95,rating:4.8,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W05",name:"Nikita More",cooperativeId:"coop-yerawada",skills:["carpentry"],certifications:["Home Carpentry L1"],verified:true,active:true,available:true,radiusKm:9,workloadTodayMinutes:115,rating:4.9,maxDailyMinutes:420,minRestMinutes:30},
    {id:"W06",name:"Priya Gaikwad",cooperativeId:"coop-yerawada",skills:["electrician","appliance"],certifications:["Electrical Safety L2"],verified:true,active:true,available:true,radiusKm:9,workloadTodayMinutes:240,rating:4.8,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W07",name:"Imran Shaikh",cooperativeId:"coop-hadapsar",skills:["electrician","cleaning"],certifications:["Electrical Safety L1"],verified:true,active:true,available:true,radiusKm:10,workloadTodayMinutes:170,rating:4.7,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W08",name:"Kavita Bhosale",cooperativeId:"coop-viman",skills:["electrician"],certifications:["Electrical Safety L2"],verified:true,active:true,available:true,radiusKm:8,workloadTodayMinutes:500,rating:4.9,maxDailyMinutes:420,minRestMinutes:60},
    {id:"W09",name:"Manoj Patil",cooperativeId:"coop-hadapsar",skills:["plumbing","cleaning"],certifications:["Plumbing & Leak Safety L2"],verified:true,active:true,available:true,radiusKm:10,workloadTodayMinutes:260,rating:4.6,maxDailyMinutes:480,minRestMinutes:30},
    {id:"W10",name:"Anil Kulkarni",cooperativeId:"coop-viman",skills:["plumbing","appliance"],certifications:["Plumbing & Leak Safety L1","Appliance Repair L1"],verified:true,active:true,available:true,radiusKm:8,workloadTodayMinutes:185,rating:4.8,maxDailyMinutes:480,minRestMinutes:30}
  ];
  return {
    schema:1,revision:0,locale:"en",session:null,policy:{...POLICY},
    cooperatives:[
      {id:"coop-kharadi",name:"Kharadi Labour Cooperative",locality:"Kharadi",lat:18.5515,lng:73.9348,active:true,serviceRadiusKm:10,policyVersion:POLICY.version},
      {id:"coop-yerawada",name:"Yerawada Labour Cooperative",locality:"Yerawada",lat:18.5529,lng:73.8797,active:true,serviceRadiusKm:10,policyVersion:POLICY.version},
      {id:"coop-hadapsar",name:"Hadapsar Labour Cooperative",locality:"Hadapsar",lat:18.5089,lng:73.9259,active:true,serviceRadiusKm:11,policyVersion:POLICY.version},
      {id:"coop-viman",name:"Viman Nagar Labour Cooperative",locality:"Viman Nagar",lat:18.5679,lng:73.9143,active:true,serviceRadiusKm:9,policyVersion:POLICY.version}
    ],
    workers,
    jobs:[],receipts:[],opportunities:[],settlements:[],cancellations:[],earningsHistory:seededEarnings(workers),safeDeclines:[],feedback:[],challenges:[],issues:[],suggestions:[],
    proposals:[{id:proposalId,title:"Raise the protected payout floor to ₹860",description:"Increase the minimum protected payout from ₹760 to ₹860 and reduce the maximum fair-work added wait from 12 to 10 minutes.",proposedMinimumPayout:860,proposedMaxAddedWaitMinutes:10,status:"voting",createdAt:seedTime,simulation:{currentFloor:760,proposedFloor:860,currentMaxWait:12,proposedMaxWait:10,workerProtectionDelta:100,affectedJobs:0,note:"Counterfactual only. Past receipts and settlements remain frozen."}}],
    policyReviews:seededVoters.map(memberId=>({proposalId,memberId,reviewedAt:seedTime})),
    votes:seededVoters.map(memberId=>({proposalId,memberId,choice:"yes" as const})),
    federation:seededFederation()
  };
}

export function workerDailyLimit(worker:Worker){return worker.maxDailyMinutes??480;}
export function eligible(worker:Worker,service:string){return worker.verified&&worker.active&&worker.available&&worker.skills.includes(service)&&worker.workloadTodayMinutes<workerDailyLimit(worker);}
export function homeCooperativeForLocality(state:AppState,locality:string):Cooperative|undefined{const lower=locality.toLowerCase();return state.cooperatives.find(c=>lower.includes(c.locality.toLowerCase()))??state.cooperatives.find(c=>c.id==="coop-kharadi");}
export function selectWorkerInCooperative(state:AppState,cooperativeId:string,service:string,excludedWorkerIds:string[]=[]):Worker|undefined{const excluded=new Set(excludedWorkerIds);return state.workers.filter(w=>w.cooperativeId===cooperativeId&&!excluded.has(w.id)&&eligible(w,service)).sort((a,b)=>a.workloadTodayMinutes-b.workloadTodayMinutes||a.id.localeCompare(b.id))[0];}
export function selectCooperative(state:AppState,service:string,excludedWorkerIds:string[]=[]):Cooperative|undefined{const excluded=new Set(excludedWorkerIds);const candidates=state.cooperatives.filter(c=>c.active).map(c=>{const workers=state.workers.filter(w=>w.cooperativeId===c.id&&!excluded.has(w.id)&&eligible(w,service));return{coop:c,capacity:workers.length};}).filter(x=>x.capacity>0);return candidates.sort((a,b)=>b.capacity-a.capacity||a.coop.id.localeCompare(b.coop.id))[0]?.coop;}
export function selectWorker(state:AppState,service:string,excludedWorkerIds:string[]=[]):Worker|undefined{const coop=selectCooperative(state,service,excludedWorkerIds);return coop?selectWorkerInCooperative(state,coop.id,service,excludedWorkerIds):undefined;}