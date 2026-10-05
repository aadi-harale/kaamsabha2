export type BallotSimulation={yes:number;no:number;participants:number;members:number;quorumThreshold:number;approvalThreshold:number;quorumMet:boolean;approvalMet:boolean;activationEligible:boolean;summary:string};

export const BALLOT_REQUIREMENTS = { participants: 9, support: 7 } as const;

export function simulateBallot(input:{yes:number;no:number;members?:number;quorumThreshold?:number;approvalThreshold?:number}):BallotSimulation{
  const members=input.members??9,quorumThreshold=input.quorumThreshold??BALLOT_REQUIREMENTS.participants,approvalThreshold=input.approvalThreshold??BALLOT_REQUIREMENTS.support;
  const yes=Math.max(0,Math.floor(input.yes)),no=Math.max(0,Math.floor(input.no));
  if(yes+no>members)throw new Error("Simulated votes cannot exceed cooperative membership");
  const participants=yes+no,quorumMet=participants>=quorumThreshold,approvalMet=yes>=approvalThreshold,activationEligible=quorumMet&&approvalMet;
  return{yes,no,participants,members,quorumThreshold,approvalThreshold,quorumMet,approvalMet,activationEligible,summary:activationEligible?"This simulated ballot could proceed to activation after protection validation.":!quorumMet?"This simulated ballot fails because quorum is not met.":"This simulated ballot meets quorum but does not meet the support threshold."};
}
