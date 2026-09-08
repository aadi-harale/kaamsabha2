"use client";

import { AppState, initialState } from "./domain";

const STORAGE_KEY="kaamsabha2:state:v1";
const SESSION_KEY="kaamsabha2:session:v1";
const REMOTE_WORKSPACE="shared-demo";

export interface StateRepository { load():AppState; loadRemote():Promise<AppState|null>; save(next:AppState):void; clearSession():void; }

function isState(value:unknown):value is AppState{if(!value||typeof value!=="object")return false;const v=value as Partial<AppState>;return v.schema===1&&Array.isArray(v.workers)&&Array.isArray(v.jobs)&&Array.isArray(v.receipts);}

export function normalizeState(value:AppState):AppState{
 const seed=initialState();
 const persistedWorkers=Array.isArray(value.workers)?value.workers:[];
 const workers=[...seed.workers.map(base=>({...base,...persistedWorkers.find(w=>w.id===base.id),maxDailyMinutes:persistedWorkers.find(w=>w.id===base.id)?.maxDailyMinutes??base.maxDailyMinutes??480,minRestMinutes:persistedWorkers.find(w=>w.id===base.id)?.minRestMinutes??base.minRestMinutes??30})),...persistedWorkers.filter(w=>!seed.workers.some(base=>base.id===w.id))];
 const persistedCoops=Array.isArray(value.cooperatives)?value.cooperatives:[];
 const cooperatives=[...seed.cooperatives.map(base=>({...base,...persistedCoops.find(c=>c.id===base.id)})),...persistedCoops.filter(c=>!seed.cooperatives.some(base=>base.id===c.id))];
 return{...seed,...value,cooperatives,workers,
  jobs:Array.isArray(value.jobs)?value.jobs.map(j=>({...j,evidence:Array.isArray(j.evidence)?j.evidence:[],changeOrders:Array.isArray(j.changeOrders)?j.changeOrders:[],intakeNote:j.intakeNote||"",referenceName:j.referenceName||"",declinedWorkerIds:Array.isArray(j.declinedWorkerIds)?j.declinedWorkerIds:[]})):[],
  receipts:Array.isArray(value.receipts)?value.receipts.map(r=>({...r,federationReason:r.federationReason||"Legacy receipt: cooperative routing reason was not recorded."})):[],
  settlements:Array.isArray(value.settlements)?value.settlements:[],cancellations:Array.isArray(value.cancellations)?value.cancellations:[],safeDeclines:Array.isArray(value.safeDeclines)?value.safeDeclines:[],feedback:Array.isArray(value.feedback)?value.feedback:[],challenges:Array.isArray(value.challenges)?value.challenges:[],issues:Array.isArray(value.issues)?value.issues.map(i=>({...i,notes:Array.isArray(i.notes)?i.notes:[]})):[],suggestions:Array.isArray(value.suggestions)?value.suggestions:[],policyReviews:Array.isArray(value.policyReviews)?value.policyReviews:[],votes:Array.isArray(value.votes)?value.votes:[],session:null};
}

function remoteEnabled(){return typeof window!=="undefined"&&process.env.NEXT_PUBLIC_KAAMSABHA_REMOTE_SYNC==="true";}

export class BrowserStateRepository implements StateRepository{
 load():AppState{if(typeof window==="undefined")return initialState();try{const raw=window.localStorage.getItem(STORAGE_KEY),parsed:unknown=raw?JSON.parse(raw):null,base=isState(parsed)?normalizeState(parsed):initialState(),sessionRaw=window.sessionStorage.getItem(SESSION_KEY),session=sessionRaw?JSON.parse(sessionRaw) as AppState["session"]:null;return{...base,session};}catch{this.resetCorruptState();return initialState();}}
 async loadRemote():Promise<AppState|null>{if(!remoteEnabled())return null;try{const response=await fetch(`/api/state?workspace=${encodeURIComponent(REMOTE_WORKSPACE)}`,{cache:"no-store"});if(!response.ok)return null;const payload=await response.json() as {state?:unknown};return isState(payload.state)?normalizeState(payload.state):null;}catch{return null;}}
 save(next:AppState){if(typeof window==="undefined")return;const persisted={...next,session:null};window.localStorage.setItem(STORAGE_KEY,JSON.stringify(persisted));if(next.session)window.sessionStorage.setItem(SESSION_KEY,JSON.stringify(next.session));else window.sessionStorage.removeItem(SESSION_KEY);if(remoteEnabled()){void fetch("/api/state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workspace:REMOTE_WORKSPACE,state:persisted})}).catch(()=>undefined);}}
 clearSession(){if(typeof window!=="undefined")window.sessionStorage.removeItem(SESSION_KEY);}
 private resetCorruptState(){if(typeof window==="undefined")return;window.localStorage.removeItem(STORAGE_KEY);window.sessionStorage.removeItem(SESSION_KEY);}
}

export const stateRepository=new BrowserStateRepository();
