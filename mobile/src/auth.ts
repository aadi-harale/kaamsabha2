import { workers } from "./data";
import type { Role } from "./types";

export type DemoAccount = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  subtitle: string;
};

const workerAccounts: DemoAccount[] = workers.map((worker) => ({
  id: worker.id,
  username: worker.name.split(" ")[0].toLowerCase(),
  displayName: worker.name,
  role: "worker",
  subtitle: `${worker.cooperative} · ${worker.locality}`,
}));

export const demoAccounts: DemoAccount[] = [
  {
    id: "C01",
    username: "customer",
    displayName: "Aarav Customer",
    role: "customer",
    subtitle: "Book, track and manage household services",
  },
  ...workerAccounts,
  {
    id: "A01",
    username: "admin",
    displayName: "Kharadi Cooperative Admin",
    role: "admin",
    subtitle: "Operations, governance and federation",
  },
];

export const FEATURED_DEMO_ACCOUNTS = [
  demoAccounts.find((account) => account.username === "customer")!,
  demoAccounts.find((account) => account.username === "ravi")!,
  demoAccounts.find((account) => account.username === "admin")!,
];

export const DEMO_PASSWORD = "12345";

export function authenticateDemoUser(username: string, password: string): DemoAccount | null {
  const normalized = username.trim().toLowerCase();
  if (password !== DEMO_PASSWORD) return null;
  return demoAccounts.find((account) => account.username === normalized) ?? null;
}

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  worker: "Worker member",
  admin: "Cooperative admin",
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  customer: [
    "Book and track services",
    "Approve Scope Lock changes",
    "Issue start/completion confirmation",
    "Pay and raise support cases",
  ],
  worker: [
    "Accept or safely decline work",
    "Manage arrival, scope and work proof",
    "Open Replay Court cases",
    "Submit policy suggestions",
  ],
  admin: [
    "Run cooperative operations",
    "Review cases and governance",
    "Simulate/activate protected policy changes",
    "Route federation opportunities",
  ],
};
