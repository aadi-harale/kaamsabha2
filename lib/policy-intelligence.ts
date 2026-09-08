import type { AppState } from "./domain.ts";

export type PolicySignalTheme={label:string;count:number;severity:"low"|"medium"|"high";evidence:string};
export type PolicyAnalysis={mode:"ai-assisted"|"manual-fallback";analyzedCount:number;themes:PolicySignalTheme[];recommendedAction:string;draftTitle:string;draftDescription:string;notice:string};

const PREFIX="POLICY_INSIGHT_JSON:";
function nextRevision(state:AppState):AppState{return{...state,revision:state.revision+1};}
function id(revision:number){return`POLICY-AI-${String(revision+1).padStart(5,"0")}`;}
function requireAdmin(state:AppState){if(state.session?.role!=="admin")throw new Error("admin session required");}

export function recordPolicyAnalysis(state:AppState,analysis:PolicyAnalysis,sourceIssueIds:string[],sourceSuggestionIds:string[]):AppState{
 requireAdmin(state);
 if(analysis.analyzedCount<1)throw new Error("No member voice records were analyzed");
 const clean:PolicyAnalysis={...analysis,themes:analysis.themes.slice(0,6).map(t=>({...t,label:t.label.slice(0,80),evidence:t.evidence.slice(0,220)})),recommendedAction:analysis.recommendedAction.slice(0,400),draftTitle:analysis.draftTitle.slice(0,120),draftDescription:analysis.draftDescription.slice(0,700),notice:analysis.notice.slice(0,300)};
 const payload={analysis:clean,sourceIssueIds:[...new Set(sourceIssueIds)].slice(0,100),sourceSuggestionIds:[...new Set(sourceSuggestionIds)].slice(0,100),createdAt:new Date().toISOString()};
 const record={id:id(state.revision),openedBy:"policy-ai",category:"Collective policy signal",status:"responded" as const,notes:["AI-assisted policy pattern analysis. Human review required; no worker ranking, penalty, vote or policy activation occurred.",PREFIX+JSON.stringify(payload)]};
 return nextRevision({...state,issues:[record,...state.issues]});
}

export function readPolicyAnalyses(state:AppState){
 return state.issues.filter(i=>i.openedBy==="policy-ai"&&i.category==="Collective policy signal").flatMap(issue=>{
  const raw=issue.notes.find(note=>note.startsWith(PREFIX));
  if(!raw)return[];
  try{return[{id:issue.id,...JSON.parse(raw.slice(PREFIX.length)) as {analysis:PolicyAnalysis;sourceIssueIds:string[];sourceSuggestionIds:string[];createdAt:string}}];}catch{return[];}
 });
}
