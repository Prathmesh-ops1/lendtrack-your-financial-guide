// Helpers to compute progress/insights for loans with extra metadata.

export interface LoanWithDetails {
  id: string;
  bank_name: string;
  emi_amount: number;
  due_day: number;
  principal_amount: number | null;
  start_date: string | null;
  interest_rate: number | null;
  tenure_months: number | null;
}

export interface LoanProgress {
  emisPaid: number;
  emisRemaining: number;
  monthsElapsed: number;
  percentComplete: number; // 0-100
  totalPayable: number; // emi * tenure
  totalInterest: number; // totalPayable - principal
  amountPaidApprox: number; // emi * emisPaid
  amountRemainingApprox: number; // emi * emisRemaining
  endDate: Date | null;
}

export function computeLoanProgress(
  l: LoanWithDetails,
  now: Date = new Date(),
): LoanProgress | null {
  if (!l.start_date || !l.tenure_months || !l.principal_amount) return null;

  const start = new Date(l.start_date);
  if (isNaN(start.getTime())) return null;

  const tenure = l.tenure_months;
  const monthsElapsed = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth()) +
      (now.getDate() >= start.getDate() ? 0 : -1) +
      1, // count current month if start day passed
  );
  const emisPaid = Math.min(tenure, Math.max(0, monthsElapsed));
  const emisRemaining = Math.max(0, tenure - emisPaid);
  const percentComplete = tenure > 0 ? (emisPaid / tenure) * 100 : 0;

  const totalPayable = Number(l.emi_amount) * tenure;
  const totalInterest = Math.max(0, totalPayable - Number(l.principal_amount));
  const amountPaidApprox = Number(l.emi_amount) * emisPaid;
  const amountRemainingApprox = Number(l.emi_amount) * emisRemaining;

  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + tenure);

  return {
    emisPaid,
    emisRemaining,
    monthsElapsed,
    percentComplete,
    totalPayable,
    totalInterest,
    amountPaidApprox,
    amountRemainingApprox,
    endDate,
  };
}
