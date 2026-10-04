"use client";

import { useEffect, useState } from "react";
import type { AppState, Job } from "@/lib/domain";
import { jobFlow, otpIsLive, waitingOnLabel, type FlowViewer } from "@/lib/job-flow";

/**
 * A live code expires on the clock, not on a click. Without this the card would keep telling
 * someone to type a code that had already run out, until something else happened to redraw.
 * It ticks only while a code is actually counting down.
 */
function useOtpClock(job: Job) {
  const live = otpIsLive(job.startOtp) || otpIsLive(job.completionOtp);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [live]);
}

/**
 * The same nine steps, on both screens, in both vocabularies. A customer and a member
 * looking at one job see the same position and the same answer to "whose move is it".
 */
export function JobFlowTrack({ job, viewer }: { job: Job; viewer: FlowViewer }) {
  useOtpClock(job);
  const flow = jobFlow(job, viewer);
  const stepNumber = flow.steps.findIndex((step) => step.id === flow.currentStepId) + 1;
  return (
    <section className="flowTrack" aria-label="Job progress">
      <div className="flowTrackHead">
        <p className="eyebrow">
          {flow.cancelled
            ? "CANCELLED"
            : flow.finished
              ? "COMPLETE"
              : `STEP ${stepNumber} OF ${flow.steps.length}`}
        </p>
        <span className={`flowWaiting ${flow.waitingOn}`}>{waitingOnLabel(flow.waitingOn)}</span>
      </div>
      <ol className="flowSteps">
        {flow.steps.map((step) => (
          <li key={step.id} className={`flowStep ${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>
            <span className="flowDot" aria-hidden="true">
              {step.state === "done" ? "✓" : step.state === "stopped" ? "×" : ""}
            </span>
            <span className="flowLabel">{viewer === "worker" ? step.workerLabel : step.customerLabel}</span>
            <span className="srOnly">
              {step.state === "done"
                ? " — done"
                : step.state === "current"
                  ? " — happening now"
                  : step.state === "stopped"
                    ? " — stopped here"
                    : " — not started"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The one card that answers "what do I do now?". Prominent when it is the reader's turn,
 * quiet when they are waiting, but never blank — a blank screen is what makes people think
 * the app is broken.
 */
export function NextStepCard({ job, viewer }: { job: Job; viewer: FlowViewer }) {
  useOtpClock(job);
  const flow = jobFlow(job, viewer);
  if (flow.finished || flow.cancelled) {
    return (
      <section className={`nextStep ${flow.cancelled ? "closed" : "finished"}`} aria-live="polite">
        <p className="eyebrow">{flow.cancelled ? "BOOKING CLOSED" : "JOB CLOSED"}</p>
        <strong>{flow.nextStep}</strong>
      </section>
    );
  }
  return (
    <section className={flow.yourMove ? "nextStep yours" : "nextStep waiting"} aria-live="polite">
      <p className="eyebrow">{flow.yourMove ? "YOUR NEXT STEP" : waitingOnLabel(flow.waitingOn).toUpperCase()}</p>
      <strong>{flow.nextStep}</strong>
      <span>{flow.otherSide}</span>
    </section>
  );
}

/** Operations view: which jobs are stuck, and on whom. */
export function WaitingOnCell({ job }: { job: Job }) {
  const flow = jobFlow(job, "admin");
  return <span className={`flowWaiting ${flow.waitingOn}`}>{waitingOnLabel(flow.waitingOn)}</span>;
}

export function flowSummary(state: AppState) {
  const open = state.jobs.filter((job) => !["settled", "cancelled"].includes(job.status));
  const counts = { customer: 0, worker: 0, cooperative: 0, nobody: 0 };
  open.forEach((job) => {
    counts[jobFlow(job, "admin").waitingOn] += 1;
  });
  return counts;
}
