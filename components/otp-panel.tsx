"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Job, OtpChallenge } from "@/lib/domain";
import { otpIsLive, otpIsStale } from "@/lib/job-flow";

type Purpose = "start" | "completion";

const WORDS: Record<Purpose, { noun: string; customerAction: string; workerAction: string }> = {
  start: { noun: "start code", customerAction: "Issue the start code", workerAction: "Verify and begin work" },
  completion: { noun: "finish code", customerAction: "Approve the proof and issue the finish code", workerAction: "Verify and finish" },
};

function useCountdown(expiresAt?: number) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const remaining = Math.max(0, expiresAt - Date.now());
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return { remaining, label: `${minutes}:${String(seconds).padStart(2, "0")}` };
}

function challengeOf(job: Job, purpose: Purpose): OtpChallenge | undefined {
  return purpose === "start" ? job.startOtp : job.completionOtp;
}

/**
 * Customer side. The code is held on the job rather than in screen memory, so it survives a
 * reload and a sign-out — losing it used to make the job impossible to finish.
 */
export function CustomerOtpPanel({
  job, purpose, onIssue, disabled,
}: {
  job: Job; purpose: Purpose; onIssue: (jobId: string, purpose: Purpose) => Promise<void>; disabled?: boolean;
}) {
  const challenge = challengeOf(job, purpose);
  const words = WORDS[purpose];
  const live = otpIsLive(challenge);
  const stale = otpIsStale(challenge);
  const countdown = useCountdown(live ? challenge?.expiresAt : undefined);
  const [busy, setBusy] = useState(false);

  async function issue() {
    setBusy(true);
    try { await onIssue(job.id, purpose); } finally { setBusy(false); }
  }

  if (challenge?.usedAt) {
    return (
      <div className="otpPanel done">
        <p className="eyebrow">{words.noun.toUpperCase()} USED</p>
        <strong>Confirmed at {new Date(challenge.usedAt).toLocaleTimeString()}</strong>
        <span>A code works once. It cannot be reused on this job.</span>
      </div>
    );
  }

  return (
    <div className="otpPanel">
      <p className="eyebrow">{words.noun.toUpperCase()}</p>
      {live && challenge ? (
        <>
          {challenge.demoCode ? (
            <>
              <p className="otpCodeLine">
                <span className="srOnly">Your {words.noun} is</span>
                <strong className="otpCode">{challenge.demoCode}</strong>
              </p>
              <span>
                Read this out to the member when you are ready. Valid for {countdown?.label ?? "a few minutes"}
                {" · "}{challenge.attemptsLeft} attempt{challenge.attemptsLeft === 1 ? "" : "s"} left.
              </span>
            </>
          ) : (
            <>
              <strong>Code issued, but this deployment has no way to deliver it.</strong>
              <span>
                A signed {words.noun} is live for {countdown?.label ?? "a few minutes"}, but no SMS provider is
                wired up, so nothing was sent. Set KAAMSABHA_DEMO_MODE=true to show codes on screen, or connect a
                delivery provider.
              </span>
            </>
          )}
          {challenge.demoCode && (
            <small className="otpDemoNote">
              Demo delivery: in a live cooperative this arrives by SMS and is never shown on screen.
              The check itself is a real server-side signature either way.
            </small>
          )}
          <button className="secondary" type="button" onClick={() => void issue()} disabled={busy || disabled}>
            Replace with a new code
          </button>
        </>
      ) : (
        <>
          <span>
            {stale
              ? "The last code is no longer valid. Issue a fresh one when you are ready."
              : `Work cannot begin until you issue this code, so nothing starts without you.`}
          </span>
          <button type="button" onClick={() => void issue()} disabled={busy || disabled}>
            {busy ? "Issuing…" : words.customerAction}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Worker side. Shows plainly whether there is anything to type yet, how many tries are
 * left, and how long the code lasts, instead of failing silently on an empty box.
 */
export function WorkerOtpPanel({
  job, purpose, onVerify,
}: {
  job: Job; purpose: Purpose; onVerify: (jobId: string, purpose: Purpose, code: string) => Promise<void>;
}) {
  const challenge = challengeOf(job, purpose);
  const words = WORDS[purpose];
  const live = otpIsLive(challenge);
  const stale = otpIsStale(challenge);
  const countdown = useCountdown(live ? challenge?.expiresAt : undefined);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onVerify(job.id, purpose, code);
      setCode("");
    } finally { setBusy(false); }
  }

  if (!challenge || stale) {
    return (
      <div className="otpPanel waiting">
        <p className="eyebrow">{words.noun.toUpperCase()}</p>
        <strong>
          {stale
            ? "That code expired. Ask the customer to issue a new one."
            : "The customer has not issued this code yet."}
        </strong>
        <span>Nothing is wrong and nothing counts against you. Ask them when they are ready.</span>
      </div>
    );
  }

  return (
    <form className="otpPanel otpForm" onSubmit={submit}>
      <p className="eyebrow">{words.noun.toUpperCase()}</p>
      <label className="field">
        <span>Enter the {words.noun} the customer gives you</span>
        <input
          name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
          pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          placeholder="6 digits"
        />
      </label>
      <button disabled={busy || code.length !== 6}>{busy ? "Checking…" : words.workerAction}</button>
      <small>
        {challenge.attemptsLeft} attempt{challenge.attemptsLeft === 1 ? "" : "s"} left
        {countdown ? ` · expires in ${countdown.label}` : ""}. A wrong code costs an attempt; waiting does not.
      </small>
      {challenge.demoCode && (
        <small className="otpDemoNote">
          Demo delivery: the customer&apos;s code for this job is <b>{challenge.demoCode}</b>, shown here only
          because this prototype runs both roles in one browser.
        </small>
      )}
    </form>
  );
}
