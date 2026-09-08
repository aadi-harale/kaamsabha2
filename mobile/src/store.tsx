import React, { createContext, useContext, useMemo, useReducer } from "react";
import { workers } from "./data";
import type { Booking, GovernanceProposal, Role, Service } from "./types";

type State = {
  role: Role | null;
  identity: string | null;
  booking: Booking | null;
  supportCases: number;
  replayCases: number;
  suggestionSubmitted: boolean;
  proposal: GovernanceProposal;
  federationReceiver: string | null;
};

type Action =
  | { type: "login"; role: Role; identity: string }
  | { type: "logout" }
  | { type: "book"; service: Service }
  | { type: "advance"; status: Booking["status"] }
  | { type: "scope_propose" }
  | { type: "scope_approve" }
  | { type: "issue_start_otp" }
  | { type: "submit_proof" }
  | { type: "issue_completion_otp" }
  | { type: "pay" }
  | { type: "support" }
  | { type: "replay" }
  | { type: "suggest" }
  | { type: "vote_sim"; yes: number; no: number }
  | { type: "activate_policy" }
  | { type: "federate"; receiver: string };

const initialState: State = {
  role: null,
  identity: null,
  booking: null,
  supportCases: 0,
  replayCases: 0,
  suggestionSubmitted: false,
  proposal: {
    id: "P-2026-09",
    title: "Raise protected payout floor",
    currentFloor: 760,
    proposedFloor: 860,
    yes: 7,
    no: 2,
    quorum: 9,
    approval: 7,
    active: false,
  },
  federationReceiver: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "login": return { ...state, role: action.role, identity: action.identity };
    case "logout": return { ...state, role: null, identity: null };
    case "book": {
      const worker = workers.find((w) => w.skills.includes(action.service) && w.available) ?? workers[0];
      return {
        ...state,
        booking: {
          id: "KS-26089-041",
          service: action.service,
          locality: "Kharadi",
          problem: action.service === "Electrical" ? "Switchboard intermittently tripping" : `${action.service} service request`,
          amount: state.proposal.active ? state.proposal.proposedFloor : 760,
          protectedFloor: state.proposal.active ? state.proposal.proposedFloor : 760,
          workerId: worker.id,
          status: "assigned",
          originalScope: action.service === "Electrical" ? "Inspect and repair switchboard fault" : `${action.service} service`,
          proofReady: false,
          paid: false,
        },
      };
    }
    case "advance": return state.booking ? { ...state, booking: { ...state.booking, status: action.status } } : state;
    case "scope_propose": return state.booking ? { ...state, booking: { ...state.booking, status: "scope_pending", addedScope: "Replace damaged socket", addedAmount: 240, startOtp: undefined } } : state;
    case "scope_approve": return state.booking ? { ...state, booking: { ...state.booking, status: "scope_approved", amount: state.booking.amount + (state.booking.addedAmount ?? 0), startOtp: undefined } } : state;
    case "issue_start_otp": return state.booking ? { ...state, booking: { ...state.booking, startOtp: "482913" } } : state;
    case "submit_proof": return state.booking ? { ...state, booking: { ...state.booking, status: "proof_ready", proofReady: true } } : state;
    case "issue_completion_otp": return state.booking?.proofReady ? { ...state, booking: { ...state.booking, completionOtp: "731204" } } : state;
    case "pay": return state.booking ? { ...state, booking: { ...state.booking, status: "paid", paid: true } } : state;
    case "support": return { ...state, supportCases: state.supportCases + 1 };
    case "replay": return { ...state, replayCases: state.replayCases + 1 };
    case "suggest": return { ...state, suggestionSubmitted: true };
    case "vote_sim": return { ...state, proposal: { ...state.proposal, yes: action.yes, no: action.no } };
    case "activate_policy": {
      const participation = state.proposal.yes + state.proposal.no;
      const valid = participation >= state.proposal.quorum && state.proposal.yes >= state.proposal.approval && state.proposal.proposedFloor >= 760;
      return valid ? { ...state, proposal: { ...state.proposal, active: true, currentFloor: state.proposal.proposedFloor } } : state;
    }
    case "federate": return { ...state, federationReceiver: action.receiver };
    default: return state;
  }
}

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
