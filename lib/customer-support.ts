import type { AppState } from "./domain.ts";

export type CustomerHelpCategory=
  |"Track my booking"
  |"Scope / extra charge"
  |"Payment / invoice"
  |"Service quality"
  |"Safety concern"
  |"Worker delayed / no-show"
  |"Something else";

function clean(value:string,max:number){return value.replace(/\s+/g," ").trim().slice(0,max);}

export function createCustomerHelpCase(state:AppState,input:{
  category:CustomerHelpCategory;
  message:string;
  jobId?:string;
  attachmentName?:string;
  assistantReply?:string;
  aiMode?:string;
}):AppState{
  if(state.session?.role!=="customer")throw new Error("Customer session required");
  const message=clean(input.message,1200);
  if(!message)throw new Error("Tell us what you need help with");
  if(input.jobId){
    const job=state.jobs.find(j=>j.id===input.jobId);
    if(!job||job.customerId!==state.session.userId)throw new Error("This booking does not belong to the signed-in customer");
  }
  const attachment=clean(input.attachmentName||"",180);
  const reply=clean(input.assistantReply||"",900);
  const now=new Date().toISOString();
  const notes=[
    `Customer request: ${message}`,
    input.jobId?`Linked booking: ${input.jobId}`:"Linked booking: General help",
    attachment?`Customer attachment: ${attachment}`:"Customer attachment: none",
    reply?`Help assistant guidance: ${reply}`:"Help assistant guidance: not available",
    `Assistant mode: ${clean(input.aiMode||"manual-fallback",60)}`,
    `Submitted: ${now}`,
    "Customer Help cases always enter cooperative review; assistant guidance cannot penalize, refund, dispatch, or change worker access."
  ];
  const issue={
    id:`HELP-${String(state.revision+1).padStart(5,"0")}`,
    jobId:input.jobId,
    openedBy:state.session.userId,
    category:`Customer Help · ${input.category}`,
    status:"open" as const,
    notes
  };
  return{...state,revision:state.revision+1,issues:[issue,...state.issues]};
}
