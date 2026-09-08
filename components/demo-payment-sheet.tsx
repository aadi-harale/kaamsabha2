"use client";

import { FormEvent, useEffect, useState } from "react";

type Method = "upi" | "card" | "netbanking";

export function DemoPaymentSheet({
  amount,
  jobId,
  onSettle,
}: {
  amount: number;
  jobId: string;
  onSettle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("upi");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaid(true);
  }

  function finish() {
    onSettle();
    setOpen(false);
    setPaid(false);
  }

  return (
    <>
      <button className="payDemoButton" onClick={() => setOpen(true)}>
        Pay ₹{amount} · Demo checkout
      </button>
      {open && (
        <div className="paymentBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="paymentSheet" role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <header className="paymentHeader">
              <div>
                <span className="paymentBrand">Razorpay-style checkout</span>
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

                <div className="paymentMethods" role="tablist" aria-label="Demo payment methods">
                  <button type="button" role="tab" aria-selected={method === "upi"} className={method === "upi" ? "active" : ""} onClick={() => setMethod("upi")}>UPI</button>
                  <button type="button" role="tab" aria-selected={method === "card"} className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}>Card</button>
                  <button type="button" role="tab" aria-selected={method === "netbanking"} className={method === "netbanking" ? "active" : ""} onClick={() => setMethod("netbanking")}>Netbanking</button>
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
                  <div><strong>Demo payment only</strong><small>This UI simulates checkout for the SIH flow. No money, card data, UPI request, or Razorpay transaction is created.</small></div>
                </div>
                <button className="paymentConfirm">Simulate payment of ₹{amount}</button>
              </form>
            ) : (
              <div className="paymentSuccess" role="status">
                <span className="paymentSuccessIcon">✓</span>
                <h3>Demo payment successful</h3>
                <p>Checkout simulation completed. Posting settlement will now create the KaamSabha invoice and protected worker payout.</p>
                <div className="paymentSuccessFacts"><span>Job</span><strong>{jobId}</strong><span>Amount</span><strong>₹{amount}</strong></div>
                <button onClick={finish}>Post settlement & close</button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
