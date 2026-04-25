// Core financial logic for LendTrack: recurring due dates, alerts, totals.

export type LiabilityKind = "loan" | "credit_card" | "insurance";

export interface UpcomingPayment {
  id: string;
  kind: LiabilityKind;
  label: string; // e.g. "HDFC EMI" or "ICICI Credit Card"
  amount: number;
  dueDate: Date;
  daysUntil: number;
}

/**
 * Given a "due day of month" (1-31), return the next upcoming Date.
 * If the day has already passed this month, roll to next month.
 * Clamps to the last day of the target month if needed (e.g. 31 in Feb).
 */
export function nextDueDate(dueDay: number, from: Date = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let year = today.getFullYear();
  let month = today.getMonth();

  // If due day already passed this month, move to next month
  if (dueDay < today.getDate()) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dueDay, lastDayOfMonth);
  return new Date(year, month, day);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export interface RawLoan { id: string; bank_name: string; emi_amount: number; due_day: number; last_paid_for_month?: string | null }
export interface RawCard { id: string; bank_name: string; outstanding_amount: number; due_day: number; last_paid_for_month?: string | null }
export interface RawInsurance { id: string; insurance_type: string; premium_amount: number; due_day: number; last_paid_for_month?: string | null }

/**
 * Returns the "for_month" key (YYYY-MM-01) representing the cycle a given due date belongs to.
 */
export function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Compute the active due date for a recurring liability, taking into account
 * what cycle was last paid. If the current cycle is paid, roll forward.
 */
export function activeDueDate(
  dueDay: number,
  lastPaidForMonth: string | null | undefined,
  from: Date = new Date(),
): Date {
  const due = nextDueDate(dueDay, from);
  if (lastPaidForMonth && monthKey(due) === lastPaidForMonth) {
    // Current cycle paid — roll to next month
    const nextMonthFrom = new Date(due.getFullYear(), due.getMonth() + 1, 1);
    return nextDueDate(dueDay, nextMonthFrom);
  }
  return due;
}

export function buildUpcoming(
  loans: RawLoan[],
  cards: RawCard[],
  insurance: RawInsurance[],
  from: Date = new Date(),
): UpcomingPayment[] {
  const items: UpcomingPayment[] = [];

  for (const l of loans) {
    const due = activeDueDate(l.due_day, l.last_paid_for_month, from);
    items.push({
      id: l.id,
      kind: "loan",
      label: `${l.bank_name} EMI`,
      amount: Number(l.emi_amount),
      dueDate: due,
      daysUntil: daysBetween(from, due),
    });
  }
  for (const c of cards) {
    const due = activeDueDate(c.due_day, c.last_paid_for_month, from);
    items.push({
      id: c.id,
      kind: "credit_card",
      label: `${c.bank_name} Credit Card`,
      amount: Number(c.outstanding_amount),
      dueDate: due,
      daysUntil: daysBetween(from, due),
    });
  }
  for (const i of insurance) {
    const due = activeDueDate(i.due_day, i.last_paid_for_month, from);
    items.push({
      id: i.id,
      kind: "insurance",
      label: `${i.insurance_type} Insurance`,
      amount: Number(i.premium_amount),
      dueDate: due,
      daysUntil: daysBetween(from, due),
    });
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
