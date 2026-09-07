export type Role = "customer" | "worker" | "admin";
export type Locale = "en" | "hi" | "mr";
export type JobStatus = "requested" | "assigned" | "accepted" | "travelling" | "arrived" | "started" | "change_pending" | "completed" | "settled" | "cancelled";

export interface Worker {
  id: string;
  name: string;
  cooperativeId: string;
  skills: string[];
  verified: boolean;
  active: boolean;
  available: boolean;
  radiusKm: number;
  workloadTodayMinutes: number;
  rating: number;
}

export interface DecisionReceipt {
  id: string;
  jobId: string;
  policyVersion: string;
  workerId: string;
  cooperativeId: string;
  hardChecks: Record<string, boolean>;
  protectedPayout: number;
  estimatedCost: number;
  estimatedNet: number;
  reason: string;
  createdAt: string;
}

export interface OtpChallenge {
  purpose: "start" | "completion";
  digest: string;
  expiresAt: number;
  attemptsLeft: number;
  usedAt?: number;
}

export interface Job {
  id: string;
  customerId: string;
  service: string;
  locality: string;
  scheduledAt: string;
  emergency: boolean;
  status: JobStatus;
  workerId?: string;
  cooperativeId?: string;
  receiptId?: string;
  amount: number;
  startOtp?: OtpChallenge;
  completionOtp?: OtpChallenge;
  evidence: { id: string; label: string; createdAt: string }[];
  changeOrders: { id: string; description: string; amountDelta: number; approved?: boolean }[];
}

export interface AppState {
  schema: 1;
  revision: number;
  locale: Locale;
  session: { userId: string; role: Role } | null;
  workers: Worker[];
  jobs: Job[];
  receipts: DecisionReceipt[];
  issues: { id: string; jobId?: string; openedBy: string; category: string; status: "open" | "responded" | "closed"; notes: string[] }[];
  votes: { proposalId: string; memberId: string; choice: "yes" | "no" }[];
  policy: { version: string; minimumPayout: number; maxAddedWaitMinutes: number; activeFrom: string };
}

export const POLICY = { version: "constitution-v2", minimumPayout: 760, maxAddedWaitMinutes: 12, activeFrom: "2026-09-01T00:00:00.000Z" } as const;

export function initialState(): AppState {
  return {
    schema: 1,
    revision: 0,
    locale: "en",
    session: null,
    policy: { ...POLICY },
    workers: [
      { id: "W01", name: "Meena Jadhav", cooperativeId: "coop-yerawada", skills: ["electrician"], verified: true, active: true, available: true, radiusKm: 9, workloadTodayMinutes: 160, rating: 4.8 },
      { id: "W02", name: "Ravi Shinde", cooperativeId: "coop-kharadi", skills: ["electrician", "appliance"], verified: true, active: true, available: true, radiusKm: 8, workloadTodayMinutes: 210, rating: 4.7 },
      { id: "W03", name: "Asha Kamble", cooperativeId: "coop-kharadi", skills: ["cleaning"], verified: true, active: true, available: true, radiusKm: 7, workloadTodayMinutes: 130, rating: 4.9 }
    ],
    jobs: [], receipts: [], issues: [], votes: []
  };
}

export function eligible(worker: Worker, service: string) {
  return worker.verified && worker.active && worker.available && worker.skills.includes(service) && worker.workloadTodayMinutes < 480;
}

export function selectWorker(state: AppState, service: string): Worker | undefined {
  return state.workers.filter((w) => eligible(w, service)).sort((a, b) => a.workloadTodayMinutes - b.workloadTodayMinutes || a.id.localeCompare(b.id))[0];
}
