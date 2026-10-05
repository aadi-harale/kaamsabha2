/** Shared by actual bookings, frozen receipts and the read-only policy comparison. */
export function protectedJobPay(quotedAmount: number | undefined, minimumPayout: number) {
  return Math.max(quotedAmount ?? minimumPayout, minimumPayout);
}
