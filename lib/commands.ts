import type {
  AppState, ChallengeCategory, ChallengeOutcome, DecisionCandidateSnapshot, DecisionReceipt,
  FederationOpportunity, FederationSnapshot, Job, OtpChallenge, Role, SuggestionCategory
} from "./domain.ts";
import { homeCooperativeForLocality, selectWorkerInCooperative, workerDailyLimit } from "./domain.ts";
import { goldenFederationCapacity, liveFederationCapacity, matchFederationCooperative } from "./federation.ts";

function nextRevision(state:AppState):AppState{return{...state,revision:state.revision+1};}
function id(prefix:string,revision:number){return`${prefix}-${String(revision+1).padStart(5,"0")}`;}
function requireRole(state:AppState,role:Role){if(state.session?.role!==role)throw new Error(`${role} session required`);}
function jobById(state:AppState,jobId:string){const job=state.jobs.find(j=>j.id===jobId);if(!job)throw new Error("Job not found");return job;}
function replaceJob(state:AppState,nextJob:Job){return state.jobs.map(j=>j.id===nextJob.id?nextJob:j);}
function currentWorker(state:AppState){requireRole(state,"worker");const worker=state.workers.find(w=>w.id===state.session!.userId);if(!worker)throw new Error("Verified worker-member required");return worker;}

function candidateSnapshot(state:AppState,cooperativeId:string,service:string):DecisionCandidateSnapshot[]{
  return state.workers
    .filter(w=>w.cooperativeId===cooperativeId&&w.skills.includes(service))
    .map(w=>({workerId:w.id,verified:w.verified,active:w.active,available:w.available,skill:w.skills.includes(service),workloadTodayMinutes:w.workloadTodayMinutes,maxDailyMinutes:workerDailyLimit(w),eligible:w.verified&&w.active&&w.available&&w.skills.includes(service)&&w.workloadTodayMinutes<workerDailyLimit(w)}))
    .sort((a,b)=>a.workerId.localeCompare(b.workerId));
}

function receiptFor(state:AppState,input:{jobId:string;service:string;protectedPayout:number;cooperativeId:string;workerId:string;receiptId:string;federated:boolean;candidateWorkerIds:string[]}):DecisionReceipt{
  const worker=state.workers.find(w=>w.id===input.workerId)!;
  const cooperative=state.cooperatives.find(c=>c.id===input.cooperativeId)!;
  const payout=Math.max(input.protectedPayout,state.policy.minimumPayout);
  return{
    id:input.receiptId,jobId:input.jobId,policyVersion:cooperative.policyVersion,workerId:input.workerId,cooperativeId:input.cooperativeId,
    hardChecks:{verified:worker.verified,active:worker.active,available:worker.available,skill:worker.skills.includes(input.service),workloadSafe:worker.workloadTodayMinutes<workerDailyLimit(worker)},
    protectedPayout:payout,protectionFloor:state.policy.minimumPayout,estimatedCost:87,estimatedNet:payout-87,
    federationReason:input.federated?"Local safe capacity was unavailable. The federation compared cooperative capacity, protection compatibility and the customer SLA, selected the receiving cooperative first, and never ranked workers across cooperatives.":"The home cooperative had safe certified capacity, so no cross-cooperative routing was needed.",
    reason:"Inside the selected cooperative, hard eligibility and workload safety passed before opportunity ordering; lower safe workload wins and worker ID is the stable final tie-break.",
    candidateWorkerIds:input.candidateWorkerIds,candidateSnapshot:candidateSnapshot(state,input.cooperativeId,input.service),createdAt:new Date().toISOString()
  };
}

function resolveAssignment(state:AppState,service:string,locality:string,excludedWorkerIds:string[]=[]){
  const home=homeCooperativeForLocality(state,locality);
  if(!home)return{home:undefined,cooperative:undefined,worker:undefined,federated:false,capacities:undefined,candidates:undefined};
  const localWorker=selectWorkerInCooperative(state,home.id,service,excludedWorkerIds);
  if(localWorker)return{home,cooperative:home,worker:localWorker,federated:false,capacities:undefined,candidates:undefined};
  const capacities=liveFederationCapacity(state,home.id,service).map(c=>({...c,availableWorkers:state.workers.filter(w=>w.cooperativeId===c.cooperativeId&&!excludedWorkerIds.includes(w.id)&&w.verified&&w.active&&w.available&&w.skills.includes(service)&&w.workloadTodayMinutes<workerDailyLimit(w)).length}));
  const match=matchFederationCooperative({homeCooperativeId:home.id,service,sla:35,workerPayout:state.policy.minimumPayout,capacities});
  const cooperative=state.cooperatives.find(c=>c.id===match.selectedCooperativeId);
  const worker=cooperative?selectWorkerInCooperative(state,cooperative.id,service,excludedWorkerIds):undefined;
  return{home,cooperative,worker,federated:Boolean(worker&&cooperative&&cooperative.id!==home.id),capacities,candidates:match.candidates};
}

export function signIn(state:AppState,userId:string,role:Role):AppState{const clean=userId.trim();if(!clean)throw new Error("User ID is required");if(role==="worker"){const worker=state.workers.find(w=>w.id===clean||w.name.toLowerCase().includes(clean.toLowerCase()));if(!worker)throw new Error("Worker account is not linked to a verified member");return nextRevision({...state,session:{userId:worker.id,role}});}return nextRevision({...state,session:{userId:clean,role}});}
export function signOut(state:AppState):AppState{return nextRevision({...state,session:null});}

export function createBooking(state:AppState,input:{customerId:string;service:string;locality:string;scheduledAt:string;emergency?:boolean;amount?:number;intakeNote?:string;referenceName?:string}):AppState{
  requireRole(state,"customer");
  if(!input.locality.trim()||!input.service.trim())throw new Error("Service and location are required");
  const assignment=resolveAssignment(state,input.service,input.locality);
  const jobId=id("KMS",state.revision),receiptId=`${jobId}-receipt`,amount=Math.max(input.amount??state.policy.minimumPayout,state.policy.minimumPayout);
  const federationOpportunityId=assignment.federated?id("FED",state.revision):undefined;
  const job:Job={id:jobId,customerId:input.customerId,service:input.service,locality:input.locality,scheduledAt:input.scheduledAt,emergency:Boolean(input.emergency),status:assignment.worker?"assigned":"requested",workerId:assignment.worker?.id,cooperativeId:assignment.cooperative?.id,homeCooperativeId:assignment.home?.id,receiptId:assignment.worker?receiptId:undefined,federationOpportunityId,amount,intakeNote:input.intakeNote?.trim()||"",referenceName:input.referenceName?.trim()||"",declinedWorkerIds:[],evidence:[],changeOrders:[]};
  const candidates=assignment.cooperative?state.workers.filter(w=>w.cooperativeId===assignment.cooperative!.id&&w.skills.includes(input.service)&&w.verified&&w.active&&w.available&&w.workloadTodayMinutes<workerDailyLimit(w)).map(w=>w.id):[];
  const receipt=assignment.worker&&assignment.cooperative?receiptFor(state,{jobId,service:input.service,protectedPayout:amount,cooperativeId:assignment.cooperative.id,workerId:assignment.worker.id,receiptId,federated:assignment.federated,candidateWorkerIds:candidates}):undefined;
  const opportunity=assignment.worker?{id:id("OPP",state.revision),jobId,workerId:assignment.worker.id,status:"offered" as const,hardEligible:true as const,opportunityPenalty:0 as const,createdAt:new Date().toISOString()}:undefined;
  let federation=state.federation;
  if(assignment.federated&&assignment.home&&assignment.cooperative&&assignment.worker&&assignment.capacities&&assignment.candidates&&federationOpportunityId){
    const fedOpportunity:FederationOpportunity={id:federationOpportunityId,jobId,homeCooperativeId:assignment.home.id,service:input.service,slaMinutes:35,workerPayout:state.policy.minimumPayout,status:"accepted",selectedCooperativeId:assignment.cooperative.id,workerId:assignment.worker.id,candidates:assignment.candidates,federationReceiptId:`${federationOpportunityId}-coop`,workerReceiptId:receiptId,createdAt:new Date().toISOString()};
    const snapshot:FederationSnapshot={id:`${federationOpportunityId}-snapshot`,opportunityId:federationOpportunityId,homeCooperativeId:assignment.home.id,service:input.service,slaMinutes:35,workerPayout:state.policy.minimumPayout,capacities:assignment.capacities,selectedCooperativeId:assignment.cooperative.id,workerId:assignment.worker.id,createdAt:new Date().toISOString()};
    federation={...federation,opportunities:[fedOpportunity,...federation.opportunities],snapshots:[snapshot,...federation.snapshots]};
  }
  return nextRevision({...state,jobs:[job,...state.jobs],receipts:receipt?[receipt,...state.receipts]:state.receipts,opportunities:opportunity?[opportunity,...state.opportunities]:state.opportunities,federation});
}

export function transitionJob(state:AppState,jobId:string,next:Job["status"]):AppState{const allowed:Record<Job["status"],Job["status"][]>={requested:["assigned","cancelled"],assigned:["accepted","cancelled"],accepted:["travelling","cancelled"],travelling:["arrived"],arrived:[],started:["change_pending"],change_pending:["started"],completed:["settled"],settled:[],cancelled:[]};const job=jobById(state,jobId);if(!allowed[job.status].includes(next))throw new Error(`Invalid transition ${job.status} → ${next}`);const opportunities=next==="accepted"?state.opportunities.map(o=>o.jobId===jobId&&o.workerId===job.workerId&&o.status==="offered"?{...o,status:"accepted" as const,resolvedAt:new Date().toISOString()}:o):state.opportunities;return nextRevision({...state,jobs:replaceJob(state,{...job,status:next}),opportunities});}

export function declineJobSafely(state:AppState,jobId:string,reason:string):AppState{
  const worker=currentWorker(state),job=jobById(state,jobId);
  if(job.workerId!==worker.id||job.status!=="assigned")throw new Error("Only the assigned worker can safely decline an unaccepted offer");
  const cleanReason=reason.trim();if(!cleanReason)throw new Error("Choose or describe a safe-decline reason");
  const excluded=[...(job.declinedWorkerIds||[]),worker.id];
  const assignment=resolveAssignment(state,job.service,job.locality,excluded);
  const receiptId=assignment.worker&&assignment.cooperative?id("DEC",state.revision):undefined;
  const nextJob:Job={...job,status:assignment.worker?"assigned":"requested",workerId:assignment.worker?.id,cooperativeId:assignment.cooperative?.id,homeCooperativeId:assignment.home?.id,receiptId,declinedWorkerIds:excluded};
  const candidates=assignment.cooperative?state.workers.filter(w=>w.cooperativeId===assignment.cooperative!.id&&!excluded.includes(w.id)&&w.skills.includes(job.service)&&w.verified&&w.active&&w.available&&w.workloadTodayMinutes<workerDailyLimit(w)).map(w=>w.id):[];
  const receipt=assignment.worker&&assignment.cooperative&&receiptId?receiptFor(state,{jobId:job.id,service:job.service,protectedPayout:job.amount,cooperativeId:assignment.cooperative.id,workerId:assignment.worker.id,receiptId,federated:assignment.federated,candidateWorkerIds:candidates}):undefined;
  const decline={id:id("REF",state.revision),jobId:job.id,workerId:worker.id,reason:cleanReason,penalty:0 as const,createdAt:new Date().toISOString()};
  const resolved=state.opportunities.map(o=>o.jobId===jobId&&o.workerId===worker.id&&o.status==="offered"?{...o,status:"declined" as const,resolvedAt:new Date().toISOString()}:o);
  const nextOpportunity=assignment.worker?{id:id("OPP",state.revision+1),jobId:job.id,workerId:assignment.worker.id,status:"offered" as const,hardEligible:true as const,opportunityPenalty:0 as const,createdAt:new Date().toISOString()}:undefined;
  return nextRevision({...state,jobs:replaceJob(state,nextJob),receipts:receipt?[receipt,...state.receipts]:state.receipts,safeDeclines:[decline,...state.safeDeclines],opportunities:nextOpportunity?[nextOpportunity,...resolved]:resolved});
}

export function cancelBookingProtected(state:AppState,jobId:string,reason:string):AppState{requireRole(state,"customer");const job=jobById(state,jobId);if(job.customerId!==state.session!.userId)throw new Error("Booking customer required");if(!["requested","assigned","accepted","travelling"].includes(job.status))throw new Error("Cancellation is unavailable after arrival; use support or Scope Lock instead");if(state.cancellations.some(c=>c.jobId===jobId))throw new Error("Cancellation already recorded");const workerPayout=["accepted","travelling"].includes(job.status)?Math.round(state.policy.minimumPayout*.25):0;const customerRefund=Math.max(0,job.amount-workerPayout);const record={id:id("CAN",state.revision),jobId,cancelledBy:state.session!.userId,reason:reason.trim()||"Customer cancellation",workerPayout,customerRefund,createdAt:new Date().toISOString()};return nextRevision({...state,jobs:replaceJob(state,{...job,status:"cancelled"}),cancellations:[record,...state.cancellations]});}

export function recordOtpIssued(state:AppState,jobId:string,challenge:OtpChallenge):AppState{const job=jobById(state,jobId);if(challenge.purpose==="start"){if(state.session?.role!=="customer"||state.session.userId!==job.customerId)throw new Error("Customer who booked the job must issue start OTP");if(job.status!=="arrived")throw new Error("Start OTP is available only after worker arrival");return nextRevision({...state,jobs:replaceJob(state,{...job,startOtp:challenge})});}if(state.session?.role!=="customer"||state.session.userId!==job.customerId)throw new Error("Customer who booked the job must issue completion OTP");if(!["started","change_pending"].includes(job.status))throw new Error("Completion OTP is available only while work is active");if(!job.evidence.length)throw new Error("Review at least one work proof before issuing completion OTP");if(job.changeOrders.some(c=>c.approved===undefined))throw new Error("Resolve pending change orders first");return nextRevision({...state,jobs:replaceJob(state,{...job,completionOtp:challenge})});}
export function recordOtpFailure(state:AppState,jobId:string,purpose:"start"|"completion"):AppState{const job=jobById(state,jobId),field=purpose==="start"?"startOtp":"completionOtp",challenge=job[field];if(!challenge)throw new Error("OTP was not issued");return nextRevision({...state,jobs:replaceJob(state,{...job,[field]:{...challenge,attemptsLeft:Math.max(0,challenge.attemptsLeft-1)}})});}
export function recordOtpVerified(state:AppState,jobId:string,purpose:"start"|"completion"):AppState{const worker=currentWorker(state),job=jobById(state,jobId);if(job.workerId!==worker.id)throw new Error("Only the assigned worker can verify this OTP");const field=purpose==="start"?"startOtp":"completionOtp",challenge=job[field];if(!challenge)throw new Error("OTP was not issued");if(challenge.usedAt)throw new Error("OTP already used");if(challenge.expiresAt<Date.now())throw new Error("OTP expired");if(challenge.attemptsLeft<=0)throw new Error("OTP locked");if(purpose==="start"&&job.status!=="arrived")throw new Error("Worker must be marked arrived before start OTP");if(purpose==="completion"&&!["started","change_pending"].includes(job.status))throw new Error("Job must be in progress before completion OTP");return nextRevision({...state,jobs:replaceJob(state,{...job,[field]:{...challenge,usedAt:Date.now()},status:purpose==="start"?"started":"completed"})});}

export function addEvidence(state:AppState,jobId:string,label:string):AppState{const worker=currentWorker(state),job=jobById(state,jobId);if(job.workerId!==worker.id)throw new Error("Assigned worker required");if(!["started","change_pending"].includes(job.status))throw new Error("Work must be started before adding evidence");const evidence={id:id("EV",state.revision),label:label.trim()||"Before/after work proof",createdAt:new Date().toISOString(),uploadedBy:worker.id};return nextRevision({...state,jobs:replaceJob(state,{...job,evidence:[...job.evidence,evidence]})});}
export function requestChangeOrder(state:AppState,jobId:string,description:string,amountDelta:number):AppState{const worker=currentWorker(state),job=jobById(state,jobId);if(job.workerId!==worker.id||job.status!=="started")throw new Error("Change order requires an active assigned job");if(!description.trim()||amountDelta<0)throw new Error("Describe the scope change and use a non-negative amount");const change={id:id("CHG",state.revision),description:description.trim(),amountDelta,requestedBy:worker.id};return nextRevision({...state,jobs:replaceJob(state,{...job,status:"change_pending",changeOrders:[...job.changeOrders,change]})});}
export function decideChangeOrder(state:AppState,jobId:string,changeId:string,approved:boolean):AppState{requireRole(state,"customer");const job=jobById(state,jobId);if(job.customerId!==state.session!.userId||job.status!=="change_pending")throw new Error("Booking customer approval required");const target=job.changeOrders.find(c=>c.id===changeId&&c.approved===undefined);if(!target)throw new Error("Pending change order not found");const changeOrders=job.changeOrders.map(c=>c.id===changeId?{...c,approved,decidedAt:new Date().toISOString()}:c),amount=approved?Math.max(state.policy.minimumPayout,job.amount+target.amountDelta):job.amount;return nextRevision({...state,jobs:replaceJob(state,{...job,status:"started",changeOrders,amount})});}
export function settleJob(state:AppState,jobId:string):AppState{requireRole(state,"customer");const job=jobById(state,jobId);if(job.customerId!==state.session!.userId||job.status!=="completed")throw new Error("Completed booking customer required");if(state.settlements.some(s=>s.jobId===jobId))throw new Error("Job already settled");const workerPayout=Math.max(state.policy.minimumPayout,job.amount),settlement={id:id("SET",state.revision),jobId,amount:job.amount,workerPayout,platformFee:0,invoiceNumber:`INV-${job.id}`,settledAt:new Date().toISOString()};return nextRevision({...state,jobs:replaceJob(state,{...job,status:"settled"}),settlements:[settlement,...state.settlements]});}
export function addFeedback(state:AppState,jobId:string,rating:number,note:string):AppState{requireRole(state,"customer");const job=jobById(state,jobId);if(job.customerId!==state.session!.userId||job.status!=="settled")throw new Error("Feedback is available after settlement");if(rating<1||rating>5)throw new Error("Rating must be 1–5");if(state.feedback.some(f=>f.jobId===jobId&&f.customerId===state.session!.userId))throw new Error("Feedback already submitted");const feedback={id:id("FB",state.revision),jobId,customerId:state.session!.userId,rating,note:note.trim(),createdAt:new Date().toISOString()};const issues=rating<=2?[{id:id("RATE",state.revision),jobId,openedBy:state.session!.userId,category:"Low rating review",status:"open" as const,notes:["Rating Firewall: low feedback requires human cooperative review; worker status and work access are unchanged."]},...state.issues]:state.issues;return nextRevision({...state,feedback:[feedback,...state.feedback],issues});}

export function openIssue(state:AppState,openedBy:string,category:string,jobId?:string):AppState{if(!state.session)throw new Error("Signed-in session required");const clean=category.trim();if(!clean)throw new Error("Issue category is required");return nextRevision({...state,issues:[{id:id("ISS",state.revision),jobId,openedBy,category:clean,status:"open",notes:[]},...state.issues]});}
export function addIssueNote(state:AppState,issueId:string,note:string):AppState{if(!state.session)throw new Error("Signed-in session required");const clean=note.trim();if(!clean)throw new Error("Write a short note first");const issue=state.issues.find(i=>i.id===issueId);if(!issue)throw new Error("Issue not found");const prefix=state.session.role==="admin"?"Cooperative":state.session.role==="worker"?`Worker ${state.session.userId}`:`Customer ${state.session.userId}`;return nextRevision({...state,issues:state.issues.map(i=>i.id===issueId?{...i,status:"responded",notes:[...i.notes,`${prefix}: ${clean}`]}:i)});}
export function reviewIssue(state:AppState,issueId:string,status:"responded"|"closed"):AppState{requireRole(state,"admin");if(!state.issues.some(i=>i.id===issueId))throw new Error("Issue not found");return nextRevision({...state,issues:state.issues.map(i=>i.id===issueId?{...i,status}:i)});}

function snapshotFromReceipt(receipt:DecisionReceipt){
  return{
    receiptId:receipt.id,jobId:receipt.jobId,policyVersion:receipt.policyVersion,selectedWorkerId:receipt.workerId,cooperativeId:receipt.cooperativeId,
    hardChecks:{...receipt.hardChecks},protectedPayout:receipt.protectedPayout,protectionFloor:receipt.protectionFloor??receipt.protectedPayout,
    estimatedCost:receipt.estimatedCost,estimatedNet:receipt.estimatedNet,reason:receipt.reason,federationReason:receipt.federationReason,
    candidateSnapshot:(receipt.candidateSnapshot??[]).map(c=>({...c})),receiptCreatedAt:receipt.createdAt
  };
}

export function openChallenge(state:AppState,jobId:string,input:string|{receiptId?:string;category:ChallengeCategory;statement:string;desiredOutcome:string}):AppState{
  const worker=currentWorker(state); jobById(state,jobId);
  const requestedReceipt=typeof input==="string"?undefined:input.receiptId;
  const receipt=(requestedReceipt?state.receipts.find(r=>r.id===requestedReceipt):undefined)??state.receipts.find(r=>r.jobId===jobId&&(r.workerId===worker.id||r.candidateWorkerIds?.includes(worker.id)||r.candidateSnapshot?.some(c=>c.workerId===worker.id)));
  if(!receipt)throw new Error("No replayable decision receipt includes this worker");
  const participated=receipt.workerId===worker.id||receipt.candidateWorkerIds?.includes(worker.id)||receipt.candidateSnapshot?.some(c=>c.workerId===worker.id);
  if(!participated)throw new Error("This worker was not part of the frozen decision");
  const reason=(typeof input==="string"?input:input.statement).trim()||"Allocation review";
  const category:ChallengeCategory=typeof input==="string"?"other":input.category;
  const desiredOutcome=typeof input==="string"?"Explain and verify this allocation":input.desiredOutcome.trim();
  if(state.challenges.some(c=>c.workerId===worker.id&&c.jobId===jobId&&c.status!=="closed"))throw new Error("An open Replay Court case already exists for this decision");
  const decisionSnapshot=snapshotFromReceipt(receipt);
  return nextRevision({...state,challenges:[{
    id:id("RPL",state.revision),jobId,workerId:worker.id,reason,category,desiredOutcome,status:"open",decisionSnapshot,
    replaySummary:`Frozen ${receipt.policyVersion} receipt captured with ${decisionSnapshot.candidateSnapshot.length||receipt.candidateWorkerIds?.length||1} decision participant(s).`,
    createdAt:new Date().toISOString()
  },...state.challenges]});
}

export function replayChallenge(state:AppState,challengeId:string):AppState{
  requireRole(state,"admin");
  const challenge=state.challenges.find(c=>c.id===challengeId);if(!challenge)throw new Error("Challenge not found");
  if(challenge.status!=="open")throw new Error("Only an open Replay Court case can be replayed");
  const receipt=state.receipts.find(r=>r.jobId===challenge.jobId&&(r.workerId===challenge.workerId||r.candidateWorkerIds?.includes(challenge.workerId)||r.candidateSnapshot?.some(c=>c.workerId===challenge.workerId)))??state.receipts.find(r=>r.jobId===challenge.jobId);
  const snap=challenge.decisionSnapshot??(receipt?snapshotFromReceipt(receipt):undefined);if(!snap)throw new Error("Frozen decision snapshot unavailable");
  const candidates=snap.candidateSnapshot;
  const eligible=[...candidates].filter(c=>c.eligible).sort((a,b)=>a.workloadTodayMinutes-b.workloadTodayMinutes||a.workerId.localeCompare(b.workerId));
  const expectedWorkerId=eligible[0]?.workerId;
  const checksPassed=Object.values(snap.hardChecks).every(Boolean);
  const protectionPreserved=snap.protectedPayout>=snap.protectionFloor;
  let outcome:ChallengeOutcome="human-review";
  if(candidates.length&&expectedWorkerId){outcome=checksPassed&&protectionPreserved&&expectedWorkerId===snap.selectedWorkerId?"confirmed":"violation";}
  const summary=outcome==="confirmed"?`Frozen replay reproduced ${snap.selectedWorkerId} under ${snap.policyVersion}: hard checks passed, ₹${snap.protectedPayout} met the ₹${snap.protectionFloor} floor, and the original workload ordering selected the same member.`:outcome==="violation"?`Frozen replay did not reproduce the original result. Expected ${expectedWorkerId??"no eligible member"}, original selection ${snap.selectedWorkerId}. No current worker state or newer constitution was substituted.`:`This legacy receipt does not contain enough frozen candidate facts for an automated replay. The case requires human review rather than guessing from today's state.`;
  const replayedAt=new Date().toISOString();
  return nextRevision({...state,challenges:state.challenges.map(c=>c.id===challengeId?{...c,status:"replayed",decisionSnapshot:snap,replayedAt,replaySummary:summary,replayResult:{outcome,expectedWorkerId,selectedWorkerId:snap.selectedWorkerId,checksPassed,protectionPreserved,summary,replayedAt}}:c)});
}

export function resolveChallenge(state:AppState,challengeId:string,outcome:ChallengeOutcome,adminNote:string):AppState{
  requireRole(state,"admin");
  const challenge=state.challenges.find(c=>c.id===challengeId);if(!challenge)throw new Error("Challenge not found");
  if(challenge.status!=="replayed"||!challenge.replayResult)throw new Error("Replay this case before recording an outcome");
  const note=adminNote.trim();if(!note)throw new Error("Add a short cooperative note for the worker");
  const allowed=outcome===challenge.replayResult.outcome||outcome==="human-review";
  if(!allowed)throw new Error("The recorded outcome must follow the frozen replay or be escalated to human review");
  return nextRevision({...state,challenges:state.challenges.map(c=>c.id===challengeId?{...c,status:outcome,adminNote:note,resolvedAt:new Date().toISOString()}:c)});
}

export function remedyChallenge(state:AppState,challengeId:string,remedy:string):AppState{
  requireRole(state,"admin");const challenge=state.challenges.find(c=>c.id===challengeId);if(!challenge)throw new Error("Challenge not found");
  if(!["violation","human-review","upheld"].includes(challenge.status))throw new Error("Only a violation or human-review case can receive a remedy");
  const clean=remedy.trim();if(clean.length<5)throw new Error("Describe the remedy for the worker");
  return nextRevision({...state,challenges:state.challenges.map(c=>c.id===challengeId?{...c,status:"remedied",remedy:clean,resolvedAt:new Date().toISOString()}:c)});
}

export function closeChallenge(state:AppState,challengeId:string):AppState{
  requireRole(state,"admin");const challenge=state.challenges.find(c=>c.id===challengeId);if(!challenge)throw new Error("Challenge not found");
  if(!["confirmed","remedied","dismissed"].includes(challenge.status))throw new Error("Confirm the replay or record a remedy before closing this case");
  return nextRevision({...state,challenges:state.challenges.map(c=>c.id===challengeId?{...c,status:"closed",closedAt:new Date().toISOString()}:c)});
}

export function submitPolicySuggestion(state:AppState,input:{category:SuggestionCategory;title:string;details:string}):AppState{const worker=currentWorker(state);const title=input.title.trim(),details=input.details.trim();if(title.length<4||details.length<10)throw new Error("Add a short title and explain the suggestion in a little more detail");const suggestion={id:id("SUG",state.revision),workerId:worker.id,category:input.category,title,details,status:"submitted" as const,createdAt:new Date().toISOString()};return nextRevision({...state,suggestions:[suggestion,...state.suggestions]});}
export function reviewPolicySuggestion(state:AppState,suggestionId:string,status:"under-review"|"accepted"|"declined"):AppState{requireRole(state,"admin");if(!state.suggestions.some(s=>s.id===suggestionId))throw new Error("Suggestion not found");return nextRevision({...state,suggestions:state.suggestions.map(s=>s.id===suggestionId?{...s,status,reviewedAt:new Date().toISOString()}:s)});}
export function updateWorkability(state:AppState,input:{available:boolean;maxDailyMinutes:number;minRestMinutes:number}):AppState{const worker=currentWorker(state);const maxDailyMinutes=Math.max(240,Math.min(600,Math.round(input.maxDailyMinutes))),minRestMinutes=Math.max(15,Math.min(120,Math.round(input.minRestMinutes)));return nextRevision({...state,workers:state.workers.map(w=>w.id===worker.id?{...w,available:input.available,maxDailyMinutes,minRestMinutes}:w)});}

export function reviewPolicyImpact(state:AppState,proposalId:string,memberId:string):AppState{const worker=currentWorker(state);if(worker.id!==memberId)throw new Error("Workers can review only their own impact");const proposal=state.proposals.find(p=>p.id===proposalId);if(!proposal||proposal.status!=="voting")throw new Error("This proposal is not open for voting");if(state.policyReviews.some(r=>r.proposalId===proposalId&&r.memberId===memberId))return state;return nextRevision({...state,policyReviews:[...state.policyReviews,{proposalId,memberId,reviewedAt:new Date().toISOString()}]});}
export function castVote(state:AppState,proposalId:string,memberId:string,choice:"yes"|"no",reason?:string):AppState{const worker=currentWorker(state);if(worker.id!==memberId)throw new Error("One member can vote only for themselves");const proposal=state.proposals.find(p=>p.id===proposalId);if(!proposal||proposal.status!=="voting")throw new Error("This proposal is not open for voting");if(!state.policyReviews.some(r=>r.proposalId===proposalId&&r.memberId===memberId))throw new Error("Review your personal policy impact before voting");if(state.votes.some(v=>v.proposalId===proposalId&&v.memberId===memberId))throw new Error("One member can vote only once on a proposal");if(choice==="no"&&!reason?.trim())throw new Error("Add a short reason so member dissent stays attached to the ballot");return nextRevision({...state,votes:[...state.votes,{proposalId,memberId,choice,reason:reason?.trim()}]});}

export function validatePolicyChange(state:AppState,input:{minimumPayout:number;maxAddedWaitMinutes:number;paidPriority?:boolean;reverseAuction?:boolean}){const violations:string[]=[];if(input.minimumPayout<state.policy.minimumPayout)violations.push("Worker Protection Floor cannot be reduced by a member constitution.");if(input.paidPriority)violations.push("Paid ranking / boost priority is prohibited.");if(input.reverseAuction)violations.push("Reverse bidding is prohibited.");if(input.maxAddedWaitMinutes<0||input.maxAddedWaitMinutes>30)violations.push("Fair-wait allowance must stay between 0 and 30 minutes.");return{valid:violations.length===0,violations};}
export function activatePolicyProposal(state:AppState,proposalId:string):AppState{requireRole(state,"admin");const proposal=state.proposals.find(p=>p.id===proposalId);if(!proposal||proposal.status!=="voting")throw new Error("Voting proposal required");const validation=validatePolicyChange(state,{minimumPayout:proposal.proposedMinimumPayout,maxAddedWaitMinutes:proposal.proposedMaxAddedWaitMinutes});if(!validation.valid)throw new Error(validation.violations[0]);const votes=state.votes.filter(v=>v.proposalId===proposalId),yes=votes.filter(v=>v.choice==="yes").length;if(votes.length<9)throw new Error(`Quorum requires 9 members; ${votes.length} have voted`);if(yes<7)throw new Error(`Approval requires 7 support votes; ${yes} support`);const currentNumber=Number(state.policy.version.match(/\d+/)?.[0]??2),version=`constitution-v${currentNumber+1}`,activatedAt=new Date().toISOString();return nextRevision({...state,policy:{version,minimumPayout:proposal.proposedMinimumPayout,maxAddedWaitMinutes:proposal.proposedMaxAddedWaitMinutes,activeFrom:activatedAt},proposals:state.proposals.map(p=>p.id===proposalId?{...p,status:"active",activatedAt}:p),cooperatives:state.cooperatives.map(c=>({...c,policyVersion:version}))});}

export function createFederationDemo(state:AppState):AppState{requireRole(state,"admin");const match=matchFederationCooperative({homeCooperativeId:"coop-kharadi",service:"electrician",sla:35,workerPayout:state.policy.minimumPayout,capacities:goldenFederationCapacity});if(!match.selectedCooperativeId)throw new Error("Protected federation scenario did not find an eligible cooperative");const worker=selectWorkerInCooperative(state,match.selectedCooperativeId,"electrician");if(!worker)throw new Error("Receiving cooperative has no eligible worker");const opportunityId=id("FED",state.revision),now=new Date().toISOString();const opportunity:FederationOpportunity={id:opportunityId,homeCooperativeId:"coop-kharadi",service:"electrician",slaMinutes:35,workerPayout:state.policy.minimumPayout,status:"accepted",selectedCooperativeId:match.selectedCooperativeId,workerId:worker.id,candidates:match.candidates,federationReceiptId:`${opportunityId}-coop`,workerReceiptId:`${opportunityId}-worker`,createdAt:now};const snapshot:FederationSnapshot={id:`${opportunityId}-snapshot`,opportunityId,homeCooperativeId:"coop-kharadi",service:"electrician",slaMinutes:35,workerPayout:state.policy.minimumPayout,capacities:goldenFederationCapacity,selectedCooperativeId:match.selectedCooperativeId,workerId:worker.id,createdAt:now};const workerAmount=state.policy.minimumPayout,welfareAmount=40,fulfillingCooperativeAmount=100,customerTotal=workerAmount+welfareAmount+fulfillingCooperativeAmount;const settlement={id:`${opportunityId}-settlement`,opportunityId,customerTotal,workerAmount,welfareAmount,fulfillingCooperativeAmount,reconciles:customerTotal===workerAmount+welfareAmount+fulfillingCooperativeAmount,createdAt:now};return nextRevision({...state,federation:{...state.federation,opportunities:[opportunity,...state.federation.opportunities],snapshots:[snapshot,...state.federation.snapshots],settlements:[settlement,...state.federation.settlements]}});}
export function replayFederationDecision(state:AppState,snapshotId:string):AppState{requireRole(state,"admin");const snapshot=state.federation.snapshots.find(s=>s.id===snapshotId);if(!snapshot)throw new Error("Frozen federation snapshot not found");const match=matchFederationCooperative({homeCooperativeId:snapshot.homeCooperativeId,service:snapshot.service,sla:snapshot.slaMinutes,workerPayout:snapshot.workerPayout,capacities:snapshot.capacities});const confirmed=match.selectedCooperativeId===snapshot.selectedCooperativeId;const replay={id:id("FED-REPLAY",state.revision),snapshotId:snapshot.id,opportunityId:snapshot.opportunityId,status:confirmed?"confirmed" as const:"violation" as const,summary:confirmed?`Frozen capacity, protection and SLA inputs reproduce ${snapshot.selectedCooperativeId}. Current worker state was not substituted.`:`Replay selected ${match.selectedCooperativeId??"no cooperative"}; frozen decision requires human review.`,createdAt:new Date().toISOString()};return nextRevision({...state,federation:{...state.federation,replays:[replay,...state.federation.replays]}});}
export function simulatePolicy(state:AppState,minimumPayout:number){const floor=Math.max(state.policy.minimumPayout,minimumPayout);return{policyVersion:`sim-${state.revision+1}`,currentFloor:state.policy.minimumPayout,simulatedFloor:floor,affectedJobs:state.jobs.filter(j=>j.amount<floor).length,workerProtectionDelta:floor-state.policy.minimumPayout,note:"Counterfactual only. No dispatch, receipt, settlement or active policy is mutated."};}
