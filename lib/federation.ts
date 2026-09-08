import type { AppState, Cooperative, FederationCandidate, FederationCapacity } from "./domain.ts";
import { eligible, workerDailyLimit } from "./domain.ts";

export const federationCovenant={
  payoutFloor:760,
  reverseBiddingBlocked:true,
  welfareContributionRequired:true,
  scopeLockRequired:true,
  cancellationProtectionRequired:true,
  ratingFirewallRequired:true,
  workloadSafetyRequired:true,
  safeRefusalRequired:true,
  challengeRightsRequired:true,
} as const;

export const goldenFederationCapacity:FederationCapacity[]=[
  {cooperativeId:"coop-kharadi",service:"electrician",availableWorkers:0,activeWorkers:4,workloadBlocked:2,earliestEta:52,demand:"high"},
  {cooperativeId:"coop-yerawada",service:"electrician",availableWorkers:2,activeWorkers:4,workloadBlocked:1,earliestEta:24,demand:"balanced"},
  {cooperativeId:"coop-hadapsar",service:"electrician",availableWorkers:1,activeWorkers:3,workloadBlocked:0,earliestEta:39,demand:"balanced"},
  {cooperativeId:"coop-viman",service:"electrician",availableWorkers:0,activeWorkers:2,workloadBlocked:1,earliestEta:21,demand:"low"},
];

function radians(value:number){return value*Math.PI/180;}
function distanceKm(a:Cooperative,b:Cooperative){
  const earth=6371,dLat=radians(b.lat-a.lat),dLng=radians(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dLng/2)**2;
  return earth*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function planningEtaMinutes(state:AppState,homeCooperativeId:string,targetCooperativeId:string){
  if(homeCooperativeId===targetCooperativeId)return 0;
  const home=state.cooperatives.find(c=>c.id===homeCooperativeId),target=state.cooperatives.find(c=>c.id===targetCooperativeId);
  if(!home||!target)return 999;
  const roadAdjustedKm=distanceKm(home,target)*1.32;
  const baseTravel=Math.ceil(roadAdjustedKm/24*60)+6;
  const activeLoad=state.jobs.filter(j=>j.cooperativeId===target.id&&!['settled','cancelled'].includes(j.status)).length;
  return Math.max(8,baseTravel+Math.min(10,activeLoad*2));
}

export function matchFederationCooperative(input:{homeCooperativeId:string;service:string;sla:number;workerPayout:number;capacities:FederationCapacity[];incompatibleCooperatives?:string[]}):{selectedCooperativeId:string|null;candidates:FederationCandidate[]}{
  const incompatible=new Set(input.incompatibleCooperatives??[]);
  const cooperativeIds=[...new Set(input.capacities.filter(c=>c.service===input.service).map(c=>c.cooperativeId))];
  const candidates=cooperativeIds.filter(cooperativeId=>cooperativeId!==input.homeCooperativeId).map((cooperativeId):FederationCandidate=>{
    const capacity=input.capacities.find(c=>c.cooperativeId===cooperativeId&&c.service===input.service);
    const protectionCompatible=input.workerPayout>=federationCovenant.payoutFloor&&!incompatible.has(cooperativeId);
    const availableWorkers=capacity?.availableWorkers??0;
    const eta=capacity?.earliestEta??999;
    const slaCompatible=eta<=input.sla;
    let exclusionReason:string|null=null;
    if(!capacity)exclusionReason="Required service capacity is unavailable.";
    else if(!availableWorkers&&capacity.workloadBlocked>0)exclusionReason="Workload protection is active.";
    else if(!availableWorkers)exclusionReason="No qualified member is safely available.";
    else if(!protectionCompatible)exclusionReason="Federation protection covenant is not compatible.";
    else if(!slaCompatible)exclusionReason=`The ${eta}-minute planning arrival is outside the customer promise.`;
    return{cooperativeId,availableWorkers,eta,protectionCompatible,slaCompatible,eligible:exclusionReason===null,exclusionReason};
  }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.eta-b.eta||b.availableWorkers-a.availableWorkers||a.cooperativeId.localeCompare(b.cooperativeId));
  return{selectedCooperativeId:candidates.find(c=>c.eligible)?.cooperativeId??null,candidates};
}

export function liveFederationCapacity(state:AppState,homeCooperativeId:string,service:string):FederationCapacity[]{
  return state.cooperatives.filter(c=>c.active).map(cooperative=>{
    const relevant=state.workers.filter(w=>w.cooperativeId===cooperative.id&&w.verified&&w.active&&w.skills.includes(service));
    const availableWorkers=relevant.filter(w=>eligible(w,service)).length;
    const workloadBlocked=relevant.filter(w=>w.available&&w.workloadTodayMinutes>=workerDailyLimit(w)).length;
    const waiting=state.jobs.filter(j=>j.homeCooperativeId===cooperative.id&&j.service===service&&j.status==="requested").length;
    const earliestEta=planningEtaMinutes(state,homeCooperativeId,cooperative.id);
    const demand=waiting>0||availableWorkers===0?"high":availableWorkers>=2?"low":"balanced";
    return{cooperativeId:cooperative.id,service,availableWorkers,activeWorkers:relevant.length,workloadBlocked,earliestEta,demand};
  });
}

export type FederationTwinMetrics={served:number;unfilled:number;averageEta:number;p90Eta:number;slaViolations:number;crossCooperative:number;protectionViolations:number};

export function simulateFederationTwin():{localOnly:FederationTwinMetrics;mesh:FederationTwinMetrics}{
  const scenarios=Array.from({length:12},(_,index)=>({sla:index%4===0?22:35,localEta:38+(index%5)*4,payout:760,capacities:goldenFederationCapacity.map(capacity=>({...capacity,earliestEta:capacity.cooperativeId==="coop-yerawada"?20+(index%7):capacity.earliestEta}))}));
  const localEtas=scenarios.filter(s=>s.localEta<=s.sla).map(s=>s.localEta);
  const meshEtas=scenarios.flatMap(s=>{if(s.localEta<=s.sla)return[s.localEta];const match=matchFederationCooperative({homeCooperativeId:"coop-kharadi",service:"electrician",sla:s.sla,workerPayout:s.payout,capacities:s.capacities});const selected=match.candidates.find(c=>c.cooperativeId===match.selectedCooperativeId);return selected?[selected.eta]:[];});
  const metric=(etas:number[],crossCooperative:number):FederationTwinMetrics=>({served:etas.length,unfilled:scenarios.length-etas.length,averageEta:Math.round((etas.reduce((sum,eta)=>sum+eta,0)/Math.max(etas.length,1))*10)/10,p90Eta:[...etas].sort((a,b)=>a-b)[Math.max(0,Math.ceil(etas.length*.9)-1)]??0,slaViolations:0,crossCooperative,protectionViolations:0});
  return{localOnly:metric(localEtas,0),mesh:metric(meshEtas,meshEtas.length-localEtas.length)};
}
