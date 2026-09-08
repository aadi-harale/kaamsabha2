export type Role = "customer" | "worker" | "admin";
export type Service = "Electrical" | "Cleaning" | "Appliance Repair" | "Plumbing" | "Carpentry";
export type JobStatus = "assigned" | "accepted" | "travelling" | "arrived" | "scope_pending" | "scope_approved" | "started" | "proof_ready" | "completed" | "paid";

export type Worker = {
  id: string;
  name: string;
  cooperative: string;
  locality: string;
  skills: Service[];
  rating: number;
  jobs: number;
  verified: boolean;
  available: boolean;
  workloadMinutes: number;
  maxWorkloadMinutes: number;
};

export type ServiceCard = {
  name: Service;
  icon: string;
  description: string;
  from: number;
  eta: string;
};

export type BookingDraft = {
  service: Service;
  problem: string;
  locality: string;
  schedule: string;
  emergency: boolean;
  referenceAttached: boolean;
};

export type ScopeChange = {
  description: string;
  amount: number;
  status: "pending" | "approved" | "declined";
};

export type Booking = BookingDraft & {
  id: string;
  workerId: string;
  amount: number;
  protectedFloor: number;
  status: JobStatus;
  originalScope: string;
  scopeChange?: ScopeChange;
  startOtp?: string;
  completionOtp?: string;
  proofReady: boolean;
  paid: boolean;
  rating?: number;
  createdAt: string;
};

export type EarningEntry = {
  id: string;
  workerId: string;
  service: Service | "Cancellation protection";
  amount: number;
  date: string;
  protected: boolean;
};

export type SupportCase = {
  id: string;
  openedBy: "customer" | "worker";
  category: string;
  summary: string;
  bookingId?: string;
  status: "Open" | "In review" | "Resolved";
  createdAt: string;
};

export type ReplayCase = {
  id: string;
  workerName: string;
  bookingId: string;
  reason: string;
  explanation: string;
  status: "Open" | "Replayed" | "Confirmed" | "Violation" | "Human Review" | "Remedied" | "Closed";
  finding?: string;
  remedy?: string;
};

export type Suggestion = {
  id: string;
  workerName: string;
  category: string;
  title: string;
  detail: string;
  status: "Submitted" | "Under Review" | "Accepted" | "Declined";
};

export type Proposal = {
  id: string;
  title: string;
  currentFloor: number;
  proposedFloor: number;
  currentWait: number;
  proposedWait: number;
  yes: number;
  no: number;
  quorum: number;
  approval: number;
  active: boolean;
  version: number;
};

export type FederationCandidate = {
  cooperative: string;
  locality: string;
  safeWorkers: number;
  eta: number;
  eligible: boolean;
  reason?: string;
};

export type FederationReceipt = {
  id: string;
  service: Service;
  origin: string;
  receiver: string;
  workerName: string;
  eta: number;
  status: "Transferred";
  reason: string;
};

export const services: ServiceCard[] = [
  { name: "Electrical", icon: "⚡", description: "Switches, wiring & electrical faults", from: 760, eta: "20–35 min" },
  { name: "Cleaning", icon: "✦", description: "Home and deep cleaning services", from: 760, eta: "30–45 min" },
  { name: "Appliance Repair", icon: "▣", description: "AC, washing machine & appliance repair", from: 760, eta: "30–50 min" },
  { name: "Plumbing", icon: "◉", description: "Leaks, fittings and water systems", from: 760, eta: "20–40 min" },
  { name: "Carpentry", icon: "⌂", description: "Furniture, doors and fixture repairs", from: 760, eta: "35–55 min" },
];

export const workers: Worker[] = [
  { id: "W01", name: "Ravi Shinde", cooperative: "Kharadi Kaam Sabha", locality: "Kharadi", skills: ["Electrical", "Appliance Repair"], rating: 4.9, jobs: 184, verified: true, available: true, workloadMinutes: 180, maxWorkloadMinutes: 480 },
  { id: "W02", name: "Meena Jadhav", cooperative: "Yerawada Kaam Sabha", locality: "Yerawada", skills: ["Electrical", "Cleaning"], rating: 4.8, jobs: 162, verified: true, available: true, workloadMinutes: 120, maxWorkloadMinutes: 480 },
  { id: "W03", name: "Anil Kulkarni", cooperative: "Kharadi Kaam Sabha", locality: "Kharadi", skills: ["Plumbing", "Appliance Repair"], rating: 4.8, jobs: 147, verified: true, available: true, workloadMinutes: 210, maxWorkloadMinutes: 480 },
  { id: "W04", name: "Asha Kamble", cooperative: "Hadapsar Kaam Sabha", locality: "Hadapsar", skills: ["Cleaning", "Carpentry"], rating: 4.9, jobs: 201, verified: true, available: true, workloadMinutes: 90, maxWorkloadMinutes: 450 },
  { id: "W05", name: "Sagar Pawar", cooperative: "Viman Nagar Kaam Sabha", locality: "Viman Nagar", skills: ["Electrical", "Plumbing"], rating: 4.7, jobs: 139, verified: true, available: true, workloadMinutes: 470, maxWorkloadMinutes: 480 },
  { id: "W06", name: "Nikita More", cooperative: "Kharadi Kaam Sabha", locality: "Kharadi", skills: ["Cleaning"], rating: 4.9, jobs: 178, verified: true, available: true, workloadMinutes: 140, maxWorkloadMinutes: 480 },
  { id: "W07", name: "Priya Gaikwad", cooperative: "Yerawada Kaam Sabha", locality: "Yerawada", skills: ["Appliance Repair", "Electrical"], rating: 4.8, jobs: 155, verified: true, available: true, workloadMinutes: 150, maxWorkloadMinutes: 480 },
  { id: "W08", name: "Imran Shaikh", cooperative: "Hadapsar Kaam Sabha", locality: "Hadapsar", skills: ["Plumbing", "Carpentry"], rating: 4.7, jobs: 126, verified: true, available: true, workloadMinutes: 170, maxWorkloadMinutes: 480 },
  { id: "W09", name: "Kavita Bhosale", cooperative: "Viman Nagar Kaam Sabha", locality: "Viman Nagar", skills: ["Cleaning", "Appliance Repair"], rating: 4.8, jobs: 169, verified: true, available: true, workloadMinutes: 200, maxWorkloadMinutes: 480 },
  { id: "W10", name: "Manoj Patil", cooperative: "Kharadi Kaam Sabha", locality: "Kharadi", skills: ["Carpentry", "Electrical"], rating: 4.8, jobs: 144, verified: true, available: true, workloadMinutes: 260, maxWorkloadMinutes: 480 },
];

export const seededEarnings: EarningEntry[] = workers.flatMap((worker, wi) => {
  const amounts = [820, 940, 760, 1120, 890, 1040, 780, 960];
  return amounts.map((amount, i) => ({
    id: `${worker.id}-E${i + 1}`,
    workerId: worker.id,
    service: (worker.skills[i % worker.skills.length] ?? "Electrical") as Service,
    amount: amount + wi * 15,
    date: `2026-0${i < 3 ? 8 : 9}-${String(20 + (i % 9)).padStart(2, "0")}`,
    protected: true,
  }));
});

export const federationCandidates: FederationCandidate[] = [
  { cooperative: "Yerawada Kaam Sabha", locality: "Yerawada", safeWorkers: 2, eta: 24, eligible: true },
  { cooperative: "Viman Nagar Kaam Sabha", locality: "Viman Nagar", safeWorkers: 0, eta: 21, eligible: false, reason: "Workload protection" },
  { cooperative: "Hadapsar Kaam Sabha", locality: "Hadapsar", safeWorkers: 1, eta: 39, eligible: false, reason: "Outside 35 min SLA" },
];
