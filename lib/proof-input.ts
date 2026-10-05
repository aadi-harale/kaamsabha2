import type { Job } from "./domain.ts";
/** Only approved scope is evidence of what the customer agreed to. */
export function proofInput(job: Job) {
  return { jobId:job.id, service:job.service, scope:job.intakeNote || job.service, workerId:job.workerId,
    approvedChanges:job.changeOrders.filter(c=>c.approved===true).map(c=>({id:c.id,description:c.description,amount:c.amountDelta})),
    evidence:job.evidence.map(e=>({id:e.id,phase:e.phase??"legacy",uploadedBy:e.uploadedBy,explanation:e.explanation??e.label,partsUsed:e.partsUsed??"",checksDone:e.checksDone??"",mediaDigest:e.media?.digest??null})) };
}
