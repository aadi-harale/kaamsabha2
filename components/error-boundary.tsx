"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Keeps one bad render from blanking the whole workspace.
 *
 * The register lives in this browser, so a white screen used to look exactly like lost data to
 * the person holding the phone. The recovery offered here is deliberately ordered: reload
 * first, because almost every transient failure clears that way, and only then the destructive
 * option — which says plainly what it destroys and asks before doing it.
 */

interface Props {
  children: ReactNode;
  /** Clears local state. Separate from the component so the storage key stays in one place. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
  confirmingReset: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, confirmingReset: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry endpoint is wired up, so this is the only record. A real deployment sends
    // it somewhere a maintainer will actually see.
    console.error("KaamSabha render error:", error, info.componentStack);
  }

  render() {
    const { error, confirmingReset } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="crashShell" role="alert">
        <section className="crashCard">
          <p className="eyebrow">SOMETHING BROKE ON THIS SCREEN</p>
          <h1>The workspace stopped rendering.</h1>
          <p>
            Your cooperative register is still saved on this device. Nothing was submitted or lost
            because of this screen.
          </p>

          <div className="crashActions">
            <button type="button" onClick={() => window.location.reload()}>
              Reload the workspace
            </button>
            {!confirmingReset ? (
              <button
                type="button"
                className="secondary"
                onClick={() => this.setState({ confirmingReset: true })}
              >
                Still broken? Clear this device&apos;s data
              </button>
            ) : (
              <div className="crashConfirm">
                <strong>This erases the register stored in this browser.</strong>
                <span>
                  Every booking, decision receipt, settlement and vote made on this device goes with
                  it, and it cannot be undone.
                </span>
                <div className="crashConfirmActions">
                  <button
                    type="button"
                    className="dangerGhost"
                    onClick={() => {
                      this.props.onReset?.();
                      window.location.reload();
                    }}
                  >
                    Yes, erase and start fresh
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => this.setState({ confirmingReset: false })}
                  >
                    Keep my data
                  </button>
                </div>
              </div>
            )}
          </div>

          <details className="crashDetail">
            <summary>Technical detail</summary>
            <pre>{error.message}</pre>
          </details>
        </section>
      </main>
    );
  }
}
