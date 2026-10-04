import type { AppState, Role } from "@/lib/domain";

export const DEMO_PASSWORD = "12345";

export type DemoAccount = {
  username: string;
  userId: string;
  displayName: string;
  role: Role;
  subtitle: string;
};

const fixedAccounts: DemoAccount[] = [
  {
    username: "customer",
    userId: "customer01",
    displayName: "Aarav Customer",
    role: "customer",
    subtitle: "Book, track, approve scope and pay",
  },
  {
    username: "admin",
    userId: "admin01",
    displayName: "Kharadi Cooperative Admin",
    role: "admin",
    subtitle: "Operations, cases, governance and federation",
  },
];

export function demoAccounts(state: AppState): DemoAccount[] {
  const workerAccounts = state.workers.map((worker) => {
    const coop = state.cooperatives.find((item) => item.id === worker.cooperativeId);
    return {
      username: worker.name.split(" ")[0].toLowerCase(),
      userId: worker.id,
      displayName: worker.name,
      role: "worker" as const,
      subtitle: `${coop?.name ?? "Cooperative member"} · ${worker.skills.map((skill) => skill.replaceAll("_", " ")).join(", ")}`,
    };
  });
  return [fixedAccounts[0], ...workerAccounts, fixedAccounts[1]];
}

export function authenticateDemoAccount(state: AppState, username: string, password: string): DemoAccount | null {
  if (password !== DEMO_PASSWORD) return null;
  const clean = username.trim().toLowerCase();
  return demoAccounts(state).find((account) => account.username === clean) ?? null;
}

export function roleTitle(role: Role) {
  return role === "customer" ? "Customer" : role === "worker" ? "Worker member" : "Cooperative admin";
}

export const rolePermissions: Record<Role, string[]> = {
  customer: [
    "Book and track household services",
    "Approve or reject Scope Lock changes",
    "Issue start and completion confirmation",
    "Pay, rate and open support cases",
  ],
  worker: [
    "Accept or safely decline assigned opportunities",
    "Manage travel, arrival, scope and proof",
    "Open Replay Court challenges",
    "Review policy impact and vote",
  ],
  admin: [
    "Operate the cooperative register",
    "Review support and Replay Court cases",
    "Run governance and activate approved policy",
    "Route federation opportunities between cooperatives",
  ],
};
