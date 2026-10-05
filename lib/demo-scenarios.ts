import type { AppState } from "./domain.ts";
import { initialState } from "./domain.ts";
import {
  addEvidence, cancelBookingProtected, createBooking, declineJobSafely, recordOtpIssued, recordOtpVerified,
  settleJob, signIn, signOut, transitionJob,
} from "./commands.ts";

/**
 * Puts the register into a known state so a judge can reach a screen in one click instead of
 * six, on an app with three roles and seventeen screens.
 *
 * The one rule this file holds to: a scenario may only move the register by calling the same
 * commands a person would. Nothing writes a job, a receipt or a settlement directly. So what a
 * scenario produces is not a mock-up of the product working — it is the product working, with
 * the clicking done for you. A test asserts every receipt a scenario leaves behind carries a
 * frozen candidate set, exactly as a hand-driven booking would.
 *
 * Each scenario starts from a fresh seed so repeated clicks are idempotent and two scenarios
 * cannot leave a confusing half-merged register behind.
 */

interface ScenarioDefinition {
  id: string;
  name: string;
  /** What this sets up, in one line. */
  sets: string;
  /** Where to go and what to look at once it has run. */
  then: string;
  /** Credentials to sign in with afterwards, so the card can say so. */
  signInAs: string;
  build(): AppState;
}

export interface Scenario extends Omit<ScenarioDefinition, "build"> {
  run(): AppState;
}

const CUSTOMER = "customer01";

function asCustomer(state: AppState) {
  return signIn(state, CUSTOMER, "customer");
}

function book(state: AppState, service: string, locality: string, note: string) {
  return createBooking(asCustomer(state), {
    customerId: CUSTOMER,
    service,
    locality,
    scheduledAt: new Date().toISOString(),
    intakeNote: note,
  });
}

/** Walks the assigned member up to the point the customer must issue a start code. */
function toArrived(state: AppState): AppState {
  const job = state.jobs[0];
  if (!job?.workerId) return state;
  let next = signIn(signOut(state), job.workerId, "worker");
  next = transitionJob(next, job.id, "accepted");
  next = transitionJob(next, job.id, "travelling");
  next = transitionJob(next, job.id, "arrived");
  return signOut(next);
}

const DEFINITIONS: ScenarioDefinition[] = [
  {
    id: "ravi-earnings",
    name: "Ravi's earnings and a new job",
    sets: "Adds a paid electrical job and a protected cancellation to Ravi's sample history, then offers him a new appliance job.",
    then: "Sign in as ravi. Today and My money show the same total; accept the new job to test a payment changing that total.",
    signInAs: "ravi",
    build: () => {
      let state = toArrived(book(initialState(), "electrician", "Kharadi, Pune", "Demo: repair a sparking switch"));
      const paidJob = state.jobs[0];
      if (paidJob?.workerId !== "W02") throw new Error("Ravi's demo requires an electrical job assigned to Ravi");
      // Only already-spent demo code tokens are stubbed. Every lifecycle step, receipt,
      // proof and payment is produced by the same commands used in the application.
      state = recordOtpIssued(asCustomer(state), paidJob.id, {
        purpose: "start", token: "scenario-start", issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60_000, attemptsLeft: 5, demoCode: "000000",
      });
      state = recordOtpVerified(signIn(signOut(state), "W02", "worker"), paidJob.id, "start");
      state = addEvidence(state, paidJob.id, "Demo work proof: repaired switch checked with customer");
      state = recordOtpIssued(asCustomer(state), paidJob.id, {
        purpose: "completion", token: "scenario-completion", issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60_000, attemptsLeft: 5, demoCode: "000001",
      });
      state = recordOtpVerified(signIn(signOut(state), "W02", "worker"), paidJob.id, "completion");
      state = settleJob(asCustomer(state), paidJob.id);

      state = book(state, "electrician", "Kharadi, Pune", "Demo: customer cancels after Ravi accepts");
      const cancelledJob = state.jobs[0];
      if (cancelledJob.workerId !== "W02") throw new Error("Ravi's demo cancellation must belong to Ravi");
      state = transitionJob(signIn(signOut(state), "W02", "worker"), cancelledJob.id, "accepted");
      state = cancelBookingProtected(asCustomer(state), cancelledJob.id, "Demo customer cancelled after acceptance");

      return book(state, "appliance", "Kharadi, Pune", "Demo: washing machine needs a check; accept to continue");
    },
  },
  {
    id: "why-not-me",
    name: "Why a member did not get the job",
    sets: "Books plumbing in Kharadi, where two members are free. One is chosen on turn order and one is not.",
    then: "Sign in as farhan. His home screen says why he has no job, and Fair Work shows the exact minute margin.",
    signInAs: "farhan",
    build: () => book(initialState(), "plumbing", "Kharadi, Pune", "Kitchen tap leaking at the base"),
  },
  {
    id: "protection-held",
    name: "A protection holding work back",
    sets: "Books electrical in Kharadi. Ravi is chosen; Sunita is certified but already at the daily limit she set.",
    then: "Sign in as sunita and open Fair Work. The reason names the limit, not a ranking.",
    signInAs: "sunita",
    build: () => book(initialState(), "electrician", "Kharadi, Pune", "Switch sparks when turned on"),
  },
  {
    id: "ready-for-otp",
    name: "A job waiting for the start code",
    sets: "Books electrical and walks the member through accept, travel and arrival.",
    then: "Sign in as customer, open Orders and issue the start code; then sign in as ravi to enter it.",
    signInAs: "customer",
    build: () => toArrived(book(initialState(), "electrician", "Kharadi, Pune", "Switch sparks when turned on")),
  },
  {
    id: "mid-job",
    name: "Work under way, proof added",
    sets: "Takes a job all the way through the start code and adds work proof, so the finish code is the next step.",
    then: "Sign in as customer and open Orders. Review the proof and issue the finish code.",
    signInAs: "customer",
    build: () => {
      let state = toArrived(book(initialState(), "electrician", "Kharadi, Pune", "Switch sparks when turned on"));
      const job = state.jobs[0];
      if (!job?.workerId) return state;
      // The code is issued and verified through the real commands; only the signing is stubbed,
      // because a scenario cannot reach the server.
      state = asCustomer(state);
      state = recordOtpIssued(state, job.id, {
        purpose: "start", token: "scenario", issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60_000, attemptsLeft: 5, demoCode: "000000",
      });
      state = signIn(signOut(state), job.workerId, "worker");
      state = recordOtpVerified(state, job.id, "start");
      state = addEvidence(state, job.id, "Before and after work proof");
      return signOut(state);
    },
  },
  {
    id: "federation",
    name: "A job leaving its own cooperative",
    sets: "Books carpentry in Kharadi, where no member is certified, so federation routes it to Yerawada.",
    then: "Sign in as customer to see the federation note, or as ravi to see why his cooperative lost it.",
    signInAs: "customer",
    build: () => book(initialState(), "carpentry", "Kharadi, Pune", "Cupboard door hinge broken"),
  },
  {
    id: "safe-decline",
    name: "A safe decline and the re-dispatch",
    sets: "Books electrical, then has Ravi decline it safely. Dispatch runs again without him.",
    then: "Sign in as ravi. Fair Work records the decline at zero penalty and shows where the job went.",
    signInAs: "ravi",
    build: () => {
      const state = book(initialState(), "electrician", "Kharadi, Pune", "Switch sparks when turned on");
      const job = state.jobs[0];
      if (!job?.workerId) return state;
      return signOut(declineJobSafely(signIn(signOut(state), job.workerId, "worker"), job.id, "Safety concern"));
    },
  },
];

/**
 * Every scenario ends signed out. A judge who clicks one should land on the login screen and
 * choose a role deliberately, not inherit whichever session the seeding happened to finish in.
 */
export const SCENARIOS: Scenario[] = DEFINITIONS.map(({ build, ...rest }) => ({
  ...rest,
  run: () => {
    const state = build();
    return state.session ? signOut(state) : state;
  },
}));

export function runScenario(id: string): AppState | null {
  const scenario = SCENARIOS.find((item) => item.id === id);
  return scenario ? scenario.run() : null;
}

/** Back to the seeded register with no jobs, receipts or settlements. */
export function resetRegister(): AppState {
  return initialState();
}
