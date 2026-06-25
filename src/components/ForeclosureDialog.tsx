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
import { formatCurrency } from "@/lib/finance";

interface LoanDetails {
  principal_amount: number | null;
  emi_amount: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  start_date: string | null;
}

interface Prepayment {
  amount: number;
  paid_date: string;
}

interface Props {
  loanId: string;
  loanLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function monthsBetween(start: Date, target: Date): number {
  let m = (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth());
  if (target.getDate() < start.getDate()) m -= 1;
  return Math.max(0, m);
}

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
  const maxMonths = 12 * 100;
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
    if (emi <= interest) break;
  }
  return { balance: Math.max(0, bal), monthsToPayoff: months, totalInterest };
}

export function ForeclosureDialog({ loanId, loanLabel, open, onOpenChange }: Props) {
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [chargePct, setChargePct] = useState("");
  const [fixedFee, setFixedFee] = useState("");
  const [gstPct, setGstPct] = useState("18");

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: loanRow }, { data: pps }] = await Promise.all([
        supabase
          .from("loans")
          .select("principal_amount, emi_amount, interest_rate, tenure_months, start_date")
          .eq("id", loanId)
          .maybeSingle(),
        supabase
          .from("loan_prepayments")
          .select("amount, paid_date")
          .eq("loan_id", loanId),
      ]);
      if (!active) return;
      setLoan((loanRow ?? null) as LoanDetails | null);
      setPrepayments((pps ?? []) as Prepayment[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, loanId]);

  const result = useMemo(() => {
    if (
      !loan ||
      !loan.principal_amount ||
      !loan.emi_amount ||
      !loan.interest_rate ||
      !loan.tenure_months ||
      !loan.start_date
    ) {
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
    const existing = prepayments.map((p) => ({
      monthOffset: Math.max(1, monthsBetween(start, new Date(p.paid_date)) + 1),
      amount: Number(p.amount),
    }));
    const nowSim = simulate(principal, rate, emi, existing, monthsElapsed);
    const outstanding = nowSim.balance;

    // Baseline: continue paying EMIs until loan ends → total interest from today onwards
    const baseline = simulate(outstanding, rate, emi, [], undefined);
    const interestSaved = baseline.totalInterest;

    const cPct = Number(chargePct);
    const fFee = Number(fixedFee);
    const gPct = Number(gstPct);
    const pctCharges = Number.isFinite(cPct) && cPct > 0 ? (outstanding * cPct) / 100 : 0;
    const fixed = Number.isFinite(fFee) && fFee > 0 ? fFee : 0;
    const baseCharges = pctCharges + fixed;
    const gst = baseCharges > 0 && Number.isFinite(gPct) && gPct > 0 ? (baseCharges * gPct) / 100 : 0;
    const totalCharges = baseCharges + gst;
    const totalPayable = outstanding + totalCharges;

    return { outstanding, pctCharges, fixed, baseCharges, gst, totalCharges, totalPayable, interestSaved };
  }, [loan, prepayments, chargePct, fixedFee, gstPct]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foreclosure Calculator — {loanLabel}</DialogTitle>
          <DialogDescription>
            Estimate the total amount required to close this loan today. Separate from part-payment.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !result ? (
          <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
            Loan details are incomplete.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Outstanding Principal</span>
                <span className="font-semibold tabular-nums">{formatCurrency(result.outstanding)}</span>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fcharge">Foreclosure Charge (%)</Label>
                  <Input
                    id="fcharge" type="number" min="0" step="0.01"
                    value={chargePct} onChange={(e) => setChargePct(e.target.value)}
                    placeholder="e.g. 4"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ffixed">Fixed Foreclosure Fee (optional)</Label>
                  <Input
                    id="ffixed" type="number" min="0" step="0.01"
                    value={fixedFee} onChange={(e) => setFixedFee(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fgst">GST on Foreclosure Charges (%)</Label>
                <Input
                  id="fgst" type="number" min="0" step="0.01"
                  value={gstPct} onChange={(e) => setGstPct(e.target.value)}
                  placeholder="e.g. 18"
                />
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-background p-3 text-sm space-y-1">
              <div className="font-semibold">Closure Summary</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Outstanding Principal</span><span>{formatCurrency(result.outstanding)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Foreclosure Charges ({chargePct || 0}%)</span><span>{formatCurrency(result.pctCharges)}</span></div>
              {result.fixed > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Fixed Foreclosure Fee</span><span>{formatCurrency(result.fixed)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(result.gst)}</span></div>
              <div className="flex justify-between font-medium"><span>Total Foreclosure Charges</span><span>{formatCurrency(result.totalCharges)}</span></div>
              <div className="my-1 border-t border-border/60" />
              <div className="flex justify-between text-base font-semibold"><span>Total Payable Amount</span><span className="tabular-nums">{formatCurrency(result.totalPayable)}</span></div>
              <div className="my-1 border-t border-border/60" />
              <div className="flex justify-between text-success"><span className="text-muted-foreground">Estimated Interest Saved by Closing Today</span><span>{formatCurrency(result.interestSaved)}</span></div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Foreclosure is separate from part-payment. BPI, processing & insurance fees are excluded.
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
