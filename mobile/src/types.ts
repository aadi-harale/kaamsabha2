export type Role = "customer" | "worker" | "admin";
export type Service = "Electrical" | "Cleaning" | "Appliance Repair" | "Plumbing" | "Carpentry";
export type JobStatus = "idle" | "booked" | "assigned" | "accepted" | "travelling" | "arrived" | "scope_pending" | "scope_approved" | "started" | "proof_ready" | "completed" | "paid";

export type Worker = {
  id: string;
  name: string;
  cooperative: string;
  locality: string;
  skills: Service[];
  rating: number;
  verified: boolean;
  available: boolean;
  workloadMinutes: number;
};

export type Booking = {
  id: string;
  service: Service;
  locality: string;
  problem: string;
  amount: number;
  protectedFloor: number;
  workerId: string;
  status: JobStatus;
  originalScope: string;
  addedScope?: string;
  addedAmount?: number;
  startOtp?: string;
  completionOtp?: string;
  proofReady: boolean;
  paid: boolean;
};

export type GovernanceProposal = {
  id: string;
  title: string;
  currentFloor: number;
  proposedFloor: number;
  yes: number;
  no: number;
  quorum: number;
  approval: number;
  active: boolean;
};

export type FederationCandidate = {
  cooperative: string;
  locality: string;
  safeWorkers: number;
  eta: number;
  eligible: boolean;
  reason?: string;
};
