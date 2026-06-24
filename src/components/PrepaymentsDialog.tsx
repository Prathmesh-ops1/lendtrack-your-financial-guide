import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/finance";
import { Trash2 } from "lucide-react";

interface Prepayment {
  id: string;
  amount: number;
  paid_date: string;
  note: string | null;
  part_payment_charge_pct: number | null;
  gst_pct: number | null;
}

interface LoanDetails {
  principal_amount: number | null;
  emi_amount: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  start_date: string | null;
}

interface Props {
  loanId: string;
  loanLabel: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Months between two YYYY-MM-DD-ish dates, floored at 0. */
function monthsBetween(start: Date, target: Date): number {
  let m = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
  if (target.getDate() < start.getDate()) m -= 1;
  return Math.max(0, m);
}

/**
 * Simulate amortization. Returns balance after `untilMonths` months,
 * applying prepayments at their respective month offsets (principal reductions).
 * If untilMonths is undefined, runs to payoff and returns months-to-payoff.
 */
function simulate(
  principal: number,
  annualRatePct: number,
  emi: number,
  prepayments: { monthOffset: number; amount: number }[],
  untilMonths?: number,
): { balance: number; monthsToPayoff: number; totalInterest: number } {
  const r = annualRatePct / 12 / 100;
  let bal = principal;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 12 * 100; // safety cap
  // Index prepayments by month
  const ppByMonth = new Map<number, number>();
  for (const p of prepayments) {
    ppByMonth.set(p.monthOffset, (ppByMonth.get(p.monthOffset) ?? 0) + p.amount);
  }
  while (bal > 0.5 && months < maxMonths) {
    if (untilMonths !== undefined && months >= untilMonths) break;
    const interest = bal * r;
    const principalPart = Math.min(bal, Math.max(0, emi - interest));
    totalInterest += interest;
    bal = bal - principalPart;
    months += 1;
    const pp = ppByMonth.get(months);
    if (pp) bal = Math.max(0, bal - pp);
    if (emi <= interest) break; // EMI doesn't cover interest — avoid infinite loop
  }
  return { balance: Math.max(0, bal), monthsToPayoff: months, totalInterest };
}

/** EMI given principal, monthly rate, tenure months. */
function computeEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export function PrepaymentsDialog({
  loanId,
  loanLabel,
  userId,
  open,
  onOpenChange,
  onSaved,
}: Props) {
  const [items, setItems] = useState<Prepayment[]>([]);
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [chargePct, setChargePct] = useState("");
  const [gstPct, setGstPct] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: prepayments }, { data: loanRow }] = await Promise.all([
      supabase
        .from("loan_prepayments")
        .select("id, amount, paid_date, note, part_payment_charge_pct, gst_pct")
        .eq("loan_id", loanId)
        .order("paid_date", { ascending: false }),
      supabase
        .from("loans")
        .select("principal_amount, emi_amount, interest_rate, tenure_months, start_date")
        .eq("id", loanId)
        .maybeSingle(),
    ]);
    setItems((prepayments ?? []) as Prepayment[]);
    setLoan((loanRow ?? null) as LoanDetails | null);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loanId]);

  /** Current outstanding principal (before this new prepayment), and remaining-tenure projections. */
  const projection = useMemo(() => {
    if (!loan || !loan.principal_amount || !loan.emi_amount || !loan.interest_rate || !loan.tenure_months || !loan.start_date) {
      return null;
    }
    const principal = Number(loan.principal_amount);
    const rate = Number(loan.interest_rate);
    const emi = Number(loan.emi_amount);
    const tenure = Number(loan.tenure_months);
    const start = new Date(loan.start_date);
    if (isNaN(start.getTime())) return null;

    const today = new Date();
    const monthsElapsed = Math.min(tenure, monthsBetween(start, today));

    // Existing prepayments as month offsets from start_date
    const existing = items.map((p) => ({
      monthOffset: Math.max(1, monthsBetween(start, new Date(p.paid_date)) + 1),
      amount: Number(p.amount),
    }));

    // Outstanding right now (after existing prepayments, before the new one)
    const nowSim = simulate(principal, rate, emi, existing, monthsElapsed);
    const outstandingNow = nowSim.balance;

    // Baseline: continue with EMI to payoff WITHOUT the new prepayment
    const baseline = simulate(outstandingNow, rate, emi, [], undefined);

    // Parse inputs
    const amt = Number(amount);
    const cPct = Number(chargePct);
    const gPct = Number(gstPct);
    const charges = Number.isFinite(amt) && amt > 0 && Number.isFinite(cPct) && cPct > 0 ? (amt * cPct) / 100 : 0;
    const gstAmount = charges > 0 && Number.isFinite(gPct) && gPct > 0 ? (charges * gPct) / 100 : 0;
    // Charges/GST are paid out of pocket; full prepayment amount reduces principal.
    const netPrincipalReduced = Number.isFinite(amt) && amt > 0 ? Math.min(amt, outstandingNow) : 0;

    let scenario: null | {
      newOutstanding: number;
      interestSaved: number;
      newClosureDate: Date;
      newEmiSameTenure: number;
      monthsSaved: number;
    } = null;

    if (netPrincipalReduced > 0) {
      const newOutstanding = Math.max(0, outstandingNow - netPrincipalReduced);
      const withPrepay = simulate(newOutstanding, rate, emi, [], undefined);
      const interestSaved = Math.max(0, baseline.totalInterest - withPrepay.totalInterest);
      const monthsSaved = Math.max(0, baseline.monthsToPayoff - withPrepay.monthsToPayoff);
      const newClosureDate = new Date(today.getFullYear(), today.getMonth() + withPrepay.monthsToPayoff, today.getDate());
      const remainingTenure = Math.max(1, tenure - monthsElapsed);
      const newEmiSameTenure = computeEmi(newOutstanding, rate, remainingTenure);
      scenario = { newOutstanding, interestSaved, newClosureDate, newEmiSameTenure, monthsSaved };
    }

    return { outstandingNow, charges, gstAmount, netPrincipalReduced, scenario };
  }, [loan, items, amount, chargePct, gstPct]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    if (!paidDate) return toast.error("Pick a date.");
    const cPct = chargePct === "" ? null : Number(chargePct);
    const gPct = gstPct === "" ? null : Number(gstPct);
    if (cPct !== null && (!Number.isFinite(cPct) || cPct < 0)) return toast.error("Invalid charge %.");
    if (gPct !== null && (!Number.isFinite(gPct) || gPct < 0)) return toast.error("Invalid GST %.");
    setSubmitting(true);
    const { error } = await supabase.from("loan_prepayments").insert({
      user_id: userId,
      loan_id: loanId,
      amount: amt,
      paid_date: paidDate,
      note: note.trim() || null,
      part_payment_charge_pct: cPct,
      gst_pct: gPct,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Prepayment added.");
    setAmount("");
    setNote("");
    setChargePct("");
    setGstPct("");
    setPaidDate(new Date().toISOString().slice(0, 10));
    await load();
    onSaved();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("loan_prepayments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed.");
    await load();
    onSaved();
  }

  const total = items.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prepayments — {loanLabel}</DialogTitle>
          <DialogDescription>
            Record extra/lump-sum payments toward this loan. They reduce your remaining principal.
          </DialogDescription>
        </DialogHeader>

        {projection && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="mb-1 font-semibold">Current Outstanding</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outstanding Principal</span>
              <span className="font-semibold tabular-nums">{formatCurrency(projection.outstandingNow)}</span>
            </div>
          </div>
        )}

        <form onSubmit={add} className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pamount">Prepayment Amount *</Label>
              <Input
                id="pamount" type="number" min="0" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdate">Date *</Label>
              <Input
                id="pdate" type="date"
                value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pcharge">Part Payment Charge (%)</Label>
              <Input
                id="pcharge" type="number" min="0" step="0.01"
                value={chargePct} onChange={(e) => setChargePct(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pgst">GST on Charge (%)</Label>
              <Input
                id="pgst" type="number" min="0" step="0.01"
                value={gstPct} onChange={(e) => setGstPct(e.target.value)}
                placeholder="e.g. 18"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pnote">Note (optional)</Label>
            <Input
              id="pnote" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bonus payment"
              maxLength={120}
            />
          </div>

          {projection && Number(amount) > 0 && (
            <div className="rounded-md border border-border/60 bg-background p-3 text-sm space-y-1">
              <div className="font-semibold">Prepayment Summary</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prepayment Amount</span><span>{formatCurrency(Number(amount))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Part Payment Charges</span><span>{formatCurrency(projection.charges)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(projection.gstAmount)}</span></div>
              <div className="flex justify-between font-medium"><span>Net Principal Reduced</span><span>{formatCurrency(projection.netPrincipalReduced)}</span></div>
              {projection.scenario && (
                <>
                  <div className="my-1 border-t border-border/60" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Updated Outstanding</span><span>{formatCurrency(projection.scenario.newOutstanding)}</span></div>
                  <div className="flex justify-between text-success"><span className="text-muted-foreground">Estimated Interest Saved</span><span>{formatCurrency(projection.scenario.interestSaved)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">New Closure Date (EMI unchanged)</span><span>{formatDate(projection.scenario.newClosureDate)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">New EMI (tenure unchanged)</span><span>{formatCurrency(projection.scenario.newEmiSameTenure)}</span></div>
                  {projection.scenario.monthsSaved > 0 && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      You'd close ~{projection.scenario.monthsSaved} month{projection.scenario.monthsSaved === 1 ? "" : "s"} earlier.
                    </p>
                  )}
                </>
              )}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Charges & GST are paid separately and don't affect principal reduction. BPI, processing & foreclosure fees are excluded.
              </p>
            </div>
          )}

          <Button type="submit" disabled={submitting} size="sm" className="bg-gradient-primary">
            {submitting ? "Adding…" : "Add prepayment"}
          </Button>
        </form>

        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">History</span>
            <span className="text-muted-foreground">
              Total prepaid:{" "}
              <span className="font-semibold text-success">{formatCurrency(total)}</span>
            </span>
          </div>
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              No prepayments yet.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border/60">
              {items.map((p) => {
                const amt = Number(p.amount);
                const c = p.part_payment_charge_pct ? (amt * Number(p.part_payment_charge_pct)) / 100 : 0;
                const g = c > 0 && p.gst_pct ? (c * Number(p.gst_pct)) / 100 : 0;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold tabular-nums">{formatCurrency(amt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(new Date(p.paid_date))}
                        {p.note ? ` • ${p.note}` : ""}
                        {c > 0 ? ` • Charges ${formatCurrency(c)}` : ""}
                        {g > 0 ? ` + GST ${formatCurrency(g)}` : ""}
                      </div>
                    </div>
                    <Button
                      size="icon" variant="ghost" onClick={() => remove(p.id)}
                      aria-label="Remove prepayment"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
