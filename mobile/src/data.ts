import type { FederationCandidate, Service, Worker } from "./types";

export const services: { name: Service; icon: string; from: number; description: string }[] = [
  { name: "Electrical", icon: "⚡", from: 760, description: "Repairs, switches & fittings" },
  { name: "Cleaning", icon: "✨", from: 820, description: "Home & deep cleaning" },
  { name: "Appliance Repair", icon: "🛠️", from: 900, description: "AC, fridge & washer support" },
  { name: "Plumbing", icon: "🚿", from: 780, description: "Leaks, taps & installations" },
  { name: "Carpentry", icon: "🪚", from: 860, description: "Furniture & fixture repairs" },
];

export const workers: Worker[] = [
  { id: "W01", name: "Ravi Shinde", cooperative: "Kharadi Cooperative", locality: "Kharadi", skills: ["Electrical"], rating: 4.9, verified: true, available: true, workloadMinutes: 180 },
  { id: "W02", name: "Meena Jadhav", cooperative: "Yerawada Cooperative", locality: "Yerawada", skills: ["Electrical", "Appliance Repair"], rating: 4.8, verified: true, available: true, workloadMinutes: 120 },
  { id: "W03", name: "Anil Kulkarni", cooperative: "Kharadi Cooperative", locality: "Kharadi", skills: ["Plumbing", "Appliance Repair"], rating: 4.8, verified: true, available: true, workloadMinutes: 210 },
  { id: "W04", name: "Asha Kamble", cooperative: "Viman Nagar Cooperative", locality: "Viman Nagar", skills: ["Cleaning"], rating: 4.9, verified: true, available: true, workloadMinutes: 150 },
  { id: "W05", name: "Sagar Pawar", cooperative: "Hadapsar Cooperative", locality: "Hadapsar", skills: ["Carpentry"], rating: 4.7, verified: true, available: true, workloadMinutes: 240 },
  { id: "W06", name: "Nikita More", cooperative: "Yerawada Cooperative", locality: "Yerawada", skills: ["Cleaning"], rating: 4.8, verified: true, available: true, workloadMinutes: 90 },
  { id: "W07", name: "Priya Gaikwad", cooperative: "Viman Nagar Cooperative", locality: "Viman Nagar", skills: ["Appliance Repair"], rating: 4.7, verified: true, available: true, workloadMinutes: 200 },
  { id: "W08", name: "Imran Shaikh", cooperative: "Hadapsar Cooperative", locality: "Hadapsar", skills: ["Electrical"], rating: 4.9, verified: true, available: true, workloadMinutes: 190 },
  { id: "W09", name: "Kavita Bhosale", cooperative: "Kharadi Cooperative", locality: "Kharadi", skills: ["Cleaning"], rating: 4.8, verified: true, available: true, workloadMinutes: 130 },
  { id: "W10", name: "Manoj Patil", cooperative: "Yerawada Cooperative", locality: "Yerawada", skills: ["Carpentry", "Plumbing"], rating: 4.7, verified: true, available: true, workloadMinutes: 170 },
];

export const federationCandidates: FederationCandidate[] = [
  { cooperative: "Yerawada Cooperative", locality: "Yerawada", safeWorkers: 2, eta: 24, eligible: true },
  { cooperative: "Viman Nagar Cooperative", locality: "Viman Nagar", safeWorkers: 0, eta: 21, eligible: false, reason: "Workload protection" },
  { cooperative: "Hadapsar Cooperative", locality: "Hadapsar", safeWorkers: 1, eta: 39, eligible: false, reason: "Outside 35 min SLA" },
];

export const earnings = [
  { label: "Electrical repair", date: "06 Sep", amount: 920 },
  { label: "Switchboard installation", date: "03 Sep", amount: 1080 },
  { label: "Cancellation protection", date: "01 Sep", amount: 190 },
  { label: "Emergency electrical visit", date: "29 Aug", amount: 1160 },
  { label: "Fan repair", date: "26 Aug", amount: 840 },
  { label: "Wiring inspection", date: "22 Aug", amount: 980 },
];
