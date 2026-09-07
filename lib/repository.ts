"use client";

import { AppState, initialState } from "./domain";

const STORAGE_KEY = "kaamsabha2:state:v1";
const SESSION_KEY = "kaamsabha2:session:v1";

export interface StateRepository {
  load(): AppState;
  save(next: AppState): void;
  clearSession(): void;
}

function isState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AppState>;
  return v.schema === 1 && Array.isArray(v.workers) && Array.isArray(v.jobs) && Array.isArray(v.receipts);
}

export class BrowserStateRepository implements StateRepository {
  load(): AppState {
    if (typeof window === "undefined") return initialState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const base = isState(parsed) ? parsed : initialState();
      const sessionRaw = window.sessionStorage.getItem(SESSION_KEY);
      const session = sessionRaw ? JSON.parse(sessionRaw) as AppState["session"] : null;
      return { ...base, session };
    } catch {
      this.resetCorruptState();
      return initialState();
    }
  }

  save(next: AppState) {
    if (typeof window === "undefined") return;
    const persisted = { ...next, session: null };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    if (next.session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next.session));
    else window.sessionStorage.removeItem(SESSION_KEY);
  }

  clearSession() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
  }

  private resetCorruptState() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export const stateRepository = new BrowserStateRepository();
