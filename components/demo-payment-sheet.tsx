"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Method = "upi" | "card" | "netbanking";

export function DemoPaymentSheet({
  amount,
  jobId,
  onSettle,
}: {
  amount: number;
  jobId: string;
  onSettle: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("upi");
  const [paid, setPaid] = useState(false);
  const [settlementError, setSettlementError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex='0']") ?? []).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      const inside = dialog.current?.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (!inside || document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      const target = trigger.current?.isConnected ? trigger.current : document.getElementById("workspace-title");
      target?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => { if (open && paid) successHeading.current?.focus(); }, [open, paid]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaid(true);
  }

  function finish() {
    if (onSettle()) { setOpen(false); setPaid(false); }
    else setSettlementError("Settlement was not saved. Close this checkout, review the booking message, and retry.");
  }

  return (
    <>
      <button ref={trigger} className="payDemoButton" onClick={() => { setSettlementError(""); setOpen(true); }}>
        Pay ₹{amount} · Demo checkout
      </button>
      {open && (
        <div className="paymentBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section ref={dialog} tabIndex={-1} className="paymentSheet" role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <header className="paymentHeader">
              <div>
                <span className="paymentBrand">KaamSabha checkout</span>
                <strong id="payment-title">Demo payment</strong>
                <small>No real transaction or Razorpay API call occurs.</small>
              </div>
              <button className="paymentClose" onClick={() => setOpen(false)} aria-label="Close demo payment">×</button>
            </header>

            {!paid ? (
              <form className="paymentBody" onSubmit={submit}>
                <div className="paymentAmount">
                  <span>Amount payable</span>
                  <strong>₹{amount}</strong>
                  <small>{jobId}</small>
                </div>

                <div className="paymentMethods" role="group" aria-label="Demo payment methods">
                  <button type="button" aria-pressed={method === "upi"} className={method === "upi" ? "active" : ""} onClick={() => setMethod("upi")}>UPI</button>
                  <button type="button" aria-pressed={method === "card"} className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}>Card</button>
                  <button type="button" aria-pressed={method === "netbanking"} className={method === "netbanking" ? "active" : ""} onClick={() => setMethod("netbanking")}>Netbanking</button>
                </div>

                {method === "upi" && (
                  <label className="field paymentField"><span>UPI ID</span><input defaultValue="customer@upi" required /></label>
                )}
                {method === "card" && (
                  <div className="paymentCardFields">
                    <label className="field paymentField"><span>Card number</span><input inputMode="numeric" defaultValue="4111 1111 1111 1111" required /></label>
                    <label className="field paymentField"><span>Expiry</span><input defaultValue="12/30" required /></label>
                    <label className="field paymentField"><span>CVV</span><input inputMode="numeric" defaultValue="123" required /></label>
                  </div>
                )}
                {method === "netbanking" && (
                  <label className="field paymentField"><span>Bank</span><select defaultValue="demo-bank"><option value="demo-bank">Demo Cooperative Bank</option><option value="sbi">State Bank of India</option><option value="hdfc">HDFC Bank</option></select></label>
                )}

                <div className="paymentProtection">
                  <span>🔒</span>
                  <div><strong>Demo payment only</strong><small>This UI simulates checkout for the local demo. No money, card data, UPI request, or Razorpay transaction is created.</small></div>
                </div>
                <button className="paymentConfirm">Simulate payment of ₹{amount}</button>
              </form>
            ) : (
              <div className="paymentSuccess" role="status">
                <span className="paymentSuccessIcon">✓</span>
                <h3 ref={successHeading} tabIndex={-1}>Demo payment successful</h3>
                <p>Checkout simulation completed. Posting settlement will now create the KaamSabha invoice and protected worker payout.</p>
                <div className="paymentSuccessFacts"><span>Job</span><strong>{jobId}</strong><span>Amount</span><strong>₹{amount}</strong></div>
                <button onClick={finish}>Post settlement & close</button>
                {settlementError && <p role="alert">{settlementError}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
