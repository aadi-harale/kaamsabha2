import type { AppState, DecisionCandidateSnapshot, DecisionReceipt, FederationOpportunity, FederationSnapshot, Job } from "./domain.ts";
import { selectWorkerInCooperative, workerDailyLimit } from "./domain.ts";
import { liveFederationCapacity, matchFederationCooperative } from "./federation.ts";

function nextRevision(state:AppState):AppState{return{...state,revision:state.revision+1};}
function id(prefix:string,revision:number){return`${prefix}-${String(revision+1).padStart(5,"0")}`;}
function requireAdmin(state:AppState){if(state.session?.role!=="admin")throw new Error("admin session required");}

export function federationServiceCatalog(state:AppState){
  return [...new Set(state.workers.filter(w=>w.active&&w.verified).flatMap(w=>w.skills))].sort();
}

function candidateSnapshot(state:AppState,cooperativeId:string,service:string):DecisionCandidateSnapshot[]{
  return state.workers.filter(w=>w.cooperativeId===cooperativeId&&w.skills.includes(service)).map(w=>({
    workerId:w.id,verified:w.verified,active:w.active,available:w.available,skill:w.skills.includes(service),
    workloadTodayMinutes:w.workloadTodayMinutes,maxDailyMinutes:workerDailyLimit(w),
    eligible:w.verified&&w.active&&w.available&&w.skills.includes(service)&&w.workloadTodayMinutes<workerDailyLimit(w)
  })).sort((a,b)=>a.workerId.localeCompare(b.workerId));
}

export function federationCapacityMatrix(state:AppState){
  const services=federationServiceCatalog(state);
  return state.cooperatives.filter(c=>c.active).map(cooperative=>({
    cooperative,
    services:services.map(service=>{
      const relevant=state.workers.filter(w=>w.cooperativeId===cooperative.id&&w.verified&&w.active&&w.skills.includes(service));
      const safe=relevant.filter(w=>w.available&&w.workloadTodayMinutes<workerDailyLimit(w));
      const blocked=relevant.filter(w=>w.available&&w.workloadTodayMinutes>=workerDailyLimit(w));
      const waiting=state.jobs.filter(j=>j.homeCooperativeId===cooperative.id&&j.service===service&&j.status==="requested").length;
      const active=state.jobs.filter(j=>j.cooperativeId===cooperative.id&&j.service===service&&!['settled','cancelled'].includes(j.status)).length;
      return{service,available:safe.length,blocked:blocked.length,waiting,active,totalQualified:relevant.length};
    })
  }));
}

export function federationShortages(state:AppState){
  return federationCapacityMatrix(state).flatMap(row=>row.services
    .filter(cell=>cell.available===0&&cell.totalQualified>0)
    .map(cell=>({cooperative:row.cooperative,...cell})))
    .sort((a,b)=>b.waiting-a.waiting||b.blocked-a.blocked||a.cooperative.locality.localeCompare(b.cooperative.locality));
}

export function openFederationTransferRequest(state:AppState,input:{homeCooperativeId:string;service:string;slaMinutes:number;customerId?:string;sourceJobId?:string}):AppState{
  requireAdmin(state);
  const home=state.cooperatives.find(c=>c.id===input.homeCooperativeId&&c.active);
  if(!home)throw new Error("Active home cooperative not found");
  const services=federationServiceCatalog(state);
  if(!services.includes(input.service))throw new Error("Unsupported service category");
  const slaMinutes=Math.max(15,Math.min(90,Math.round(input.slaMinutes)));
  const capacities=liveFederationCapacity(state,home.id,input.service);
  const homeCapacity=capacities.find(c=>c.cooperativeId===home.id);
  if((homeCapacity?.availableWorkers??0)>0)throw new Error("Home cooperative still has safe local capacity. Federation is only for genuine overflow.");
  const protectedPayout=state.policy.minimumPayout;
  const match=matchFederationCooperative({homeCooperativeId:home.id,service:input.service,sla:slaMinutes,workerPayout:protectedPayout,capacities});
  const existing=input.sourceJobId?state.jobs.find(j=>j.id===input.sourceJobId):state.jobs.find(j=>j.homeCooperativeId===home.id&&j.service===input.service&&j.status==="requested"&&!j.federationOpportunityId);
  if(input.sourceJobId&&!existing)throw new Error("Selected waiting job was not found");
  const opportunityId=id("FED-REQ",state.revision),jobId=existing?.id??id("KMS-FED",state.revision),now=new Date().toISOString();
  const job:Job=existing?{...existing,federationOpportunityId:opportunityId}:{id:jobId,customerId:input.customerId??"customer01",service:input.service,locality:`${home.locality}, Pune`,scheduledAt:now,emergency:false,status:"requested",homeCooperativeId:home.id,federationOpportunityId:opportunityId,amount:protectedPayout,intakeNote:`Overflow request created from live ${home.locality} capacity.`,referenceName:"",declinedWorkerIds:[],evidence:[],changeOrders:[]};
  const opportunity:FederationOpportunity={id:opportunityId,jobId,homeCooperativeId:home.id,service:input.service,slaMinutes,workerPayout:protectedPayout,status:match.selectedCooperativeId?"open":"unfilled",candidates:match.candidates,federationReceiptId:`${opportunityId}-federation`,createdAt:now};
  const snapshot:FederationSnapshot={id:`${opportunityId}-request-snapshot`,opportunityId,homeCooperativeId:home.id,service:input.service,slaMinutes,workerPayout:protectedPayout,capacities,createdAt:now};
  const jobs=existing?state.jobs.map(j=>j.id===existing.id?job:j):[job,...state.jobs];
  return nextRevision({...state,jobs,federation:{...state.federation,opportunities:[opportunity,...state.federation.opportunities],snapshots:[snapshot,...state.federation.snapshots]}});
}

export function routeFederationTransfer(state:AppState,opportunityId:string,targetCooperativeId:string):AppState{
  requireAdmin(state);
  const opportunity=state.federation.opportunities.find(o=>o.id===opportunityId);
  if(!opportunity)throw new Error("Federation request not found");
  if(opportunity.status!=="open")throw new Error("Only an open federation request can be routed");
  if(targetCooperativeId===opportunity.homeCooperativeId)throw new Error("Federation transfer must go to another cooperative");
  const requestSnapshot=state.federation.snapshots.find(s=>s.opportunityId===opportunity.id&&!s.selectedCooperativeId);
  if(!requestSnapshot)throw new Error("Frozen request capacity snapshot is unavailable");
  const freshMatch=matchFederationCooperative({homeCooperativeId:opportunity.homeCooperativeId,service:opportunity.service,sla:opportunity.slaMinutes,workerPayout:Math.max(opportunity.workerPayout,state.policy.minimumPayout),capacities:liveFederationCapacity(state,opportunity.homeCooperativeId,opportunity.service)});
  const freshCandidate=freshMatch.candidates.find(c=>c.cooperativeId===targetCooperativeId);
  if(!freshCandidate?.eligible)throw new Error(freshCandidate?.exclusionReason||"Selected cooperative is no longer eligible; refresh capacity before transfer");
  const receiving=state.cooperatives.find(c=>c.id===targetCooperativeId&&c.active);
  if(!receiving)throw new Error("Receiving cooperative is unavailable");
  const protectedPayout=Math.max(opportunity.workerPayout,state.policy.minimumPayout);
  const worker=selectWorkerInCooperative(state,receiving.id,opportunity.service);
  if(!worker)throw new Error("Receiving cooperative no longer has a safe eligible member. Refresh capacity before transfer.");
  const job=opportunity.jobId?state.jobs.find(j=>j.id===opportunity.jobId):undefined;
  if(!job||job.status!=="requested")throw new Error("Linked overflow job is not available for transfer");
  const receiptId=`${opportunity.id}-worker`,snapshots=candidateSnapshot(state,receiving.id,opportunity.service);
  const candidateWorkerIds=snapshots.filter(s=>s.eligible).map(s=>s.workerId);
  const receipt:DecisionReceipt={
    id:receiptId,jobId:job.id,policyVersion:receiving.policyVersion,workerId:worker.id,cooperativeId:receiving.id,
    hardChecks:{verified:worker.verified,active:worker.active,available:worker.available,skill:worker.skills.includes(opportunity.service),workloadSafe:worker.workloadTodayMinutes<workerDailyLimit(worker)},
    protectedPayout,protectionFloor:state.policy.minimumPayout,estimatedCost:87,estimatedNet:protectedPayout-87,
    federationReason:`Federation routed the job to ${receiving.name} after live capacity, protection and SLA re-validation. No worker was ranked across cooperatives.`,
    reason:"The receiving cooperative then ran its own constitution and selected the lowest safe workload among its eligible members, with worker ID only as a stable tie-break.",
    candidateWorkerIds,candidateSnapshot:snapshots,createdAt:new Date().toISOString()
  };
  const assignedJob:Job={...job,status:"assigned",cooperativeId:receiving.id,workerId:worker.id,receiptId,amount:Math.max(job.amount,protectedPayout)};
  const decisionSnapshot:FederationSnapshot={id:`${opportunity.id}-decision-snapshot`,opportunityId:opportunity.id,homeCooperativeId:opportunity.homeCooperativeId,service:opportunity.service,slaMinutes:opportunity.slaMinutes,workerPayout:protectedPayout,capacities:requestSnapshot.capacities,selectedCooperativeId:receiving.id,workerId:worker.id,createdAt:new Date().toISOString()};
  const accepted:FederationOpportunity={...opportunity,status:"accepted",workerPayout:protectedPayout,selectedCooperativeId:receiving.id,workerId:worker.id,workerReceiptId:receiptId,candidates:freshMatch.candidates};
  const workOpportunity={id:id("OPP",state.revision),jobId:job.id,workerId:worker.id,status:"offered" as const,hardEligible:true as const,opportunityPenalty:0 as const,createdAt:new Date().toISOString()};
  return nextRevision({...state,jobs:state.jobs.map(j=>j.id===job.id?assignedJob:j),receipts:[receipt,...state.receipts],opportunities:[workOpportunity,...state.opportunities],federation:{...state.federation,opportunities:state.federation.opportunities.map(o=>o.id===opportunity.id?accepted:o),snapshots:[decisionSnapshot,...state.federation.snapshots]}});
}
