import type { AppState, WorkerEarningEntry } from "./domain.ts";

export interface WorkerEarningsSummary {
  total:number;
  completedJobs:number;
  cancellationProtection:number;
  averageJobPayout:number;
  last30Days:number;
  bestPayout:number;
}

export function workerEarningEntries(state:AppState,workerId:string):WorkerEarningEntry[]{
  const historical=(state.earningsHistory??[]).filter(e=>e.workerId===workerId);
  const liveJobs=state.jobs.filter(j=>j.workerId===workerId);
  const liveSettlements=state.settlements
    .filter(s=>liveJobs.some(j=>j.id===s.jobId))
    .map<WorkerEarningEntry>(s=>({
      id:`LIVE-${s.id}`,workerId,service:liveJobs.find(j=>j.id===s.jobId)?.service??"service",
      amount:s.workerPayout,earnedAt:s.settledAt,type:"job",label:`${liveJobs.find(j=>j.id===s.jobId)?.service??"Service"} settlement`
    }));
  const liveCancellations=state.cancellations
    .filter(c=>c.workerPayout>0&&liveJobs.some(j=>j.id===c.jobId))
    .map<WorkerEarningEntry>(c=>({
      id:`LIVE-${c.id}`,workerId,service:liveJobs.find(j=>j.id===c.jobId)?.service??"service",
      amount:c.workerPayout,earnedAt:c.createdAt,type:"cancellation",label:"Protected cancellation payout"
    }));
  return [...historical,...liveSettlements,...liveCancellations]
    .filter((entry,index,all)=>all.findIndex(other=>other.id===entry.id)===index)
    .sort((a,b)=>new Date(b.earnedAt).getTime()-new Date(a.earnedAt).getTime());
}

export function summarizeWorkerEarnings(state:AppState,workerId:string,now=new Date("2026-09-08T12:00:00.000Z")):WorkerEarningsSummary{
  const entries=workerEarningEntries(state,workerId);
  const jobs=entries.filter(e=>e.type==="job");
  const total=entries.reduce((sum,e)=>sum+e.amount,0);
  const cancellationProtection=entries.filter(e=>e.type==="cancellation").reduce((sum,e)=>sum+e.amount,0);
  const cutoff=now.getTime()-30*24*60*60*1000;
  return {
    total,
    completedJobs:jobs.length,
    cancellationProtection,
    averageJobPayout:jobs.length?Math.round(jobs.reduce((sum,e)=>sum+e.amount,0)/jobs.length):0,
    last30Days:entries.filter(e=>new Date(e.earnedAt).getTime()>=cutoff).reduce((sum,e)=>sum+e.amount,0),
    bestPayout:entries.reduce((max,e)=>Math.max(max,e.amount),0)
  };
}

export function weeklyWorkerEarnings(state:AppState,workerId:string,weeks=6){
  const entries=workerEarningEntries(state,workerId);
  const end=new Date("2026-09-08T23:59:59.999Z");
  const result:{label:string;amount:number}[]=[];
  for(let offset=weeks-1;offset>=0;offset--){
    const weekEnd=new Date(end);weekEnd.setUTCDate(end.getUTCDate()-offset*7);
    const weekStart=new Date(weekEnd);weekStart.setUTCDate(weekEnd.getUTCDate()-6);weekStart.setUTCHours(0,0,0,0);
    result.push({
      label:`${weekStart.getUTCDate()}/${weekStart.getUTCMonth()+1}`,
      amount:entries.filter(e=>{const t=new Date(e.earnedAt).getTime();return t>=weekStart.getTime()&&t<=weekEnd.getTime();}).reduce((sum,e)=>sum+e.amount,0)
    });
  }
  return result;
}
