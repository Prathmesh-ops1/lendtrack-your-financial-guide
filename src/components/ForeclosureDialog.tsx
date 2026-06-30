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
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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

interface SavedForeclosure {
  id: string;
  outstanding_principal: number;
  charge_pct: number;
  fixed_fee: number;
  gst_pct: number;
  pct_charges: number;
  gst_amount: number;
  total_charges: number;
  total_payable: number;
  interest_saved: number;
  notes: string | null;
  created_at: string;
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
  const [history, setHistory] = useState<SavedForeclosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chargePct, setChargePct] = useState("");
  const [fixedFee, setFixedFee] = useState("");
  const [gstPct, setGstPct] = useState("18");
  const [notes, setNotes] = useState("");

  const loadHistory = async () => {
    const { data } = await supabase
      .from("loan_foreclosures")
      .select("*")
      .eq("loan_id", loanId)
      .order("created_at", { ascending: false });
    setHistory((data ?? []) as SavedForeclosure[]);
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: loanRow }, { data: pps }, { data: hist }] = await Promise.all([
        supabase
          .from("loans")
          .select("principal_amount, emi_amount, interest_rate, tenure_months, start_date")
          .eq("id", loanId)
          .maybeSingle(),
        supabase
          .from("loan_prepayments")
          .select("amount, paid_date")
          .eq("loan_id", loanId),
        supabase
          .from("loan_foreclosures")
          .select("*")
          .eq("loan_id", loanId)
          .order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      setLoan((loanRow ?? null) as LoanDetails | null);
      setPrepayments((pps ?? []) as Prepayment[]);
      setHistory((hist ?? []) as SavedForeclosure[]);
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
    const existingAll = prepayments
      .filter((p) => new Date(p.paid_date) <= today)
      .map((p) => ({
        monthOffset: Math.max(1, monthsBetween(start, new Date(p.paid_date)) + 1),
        amount: Number(p.amount),
      }));
    const inLoop = existingAll.filter((p) => p.monthOffset <= monthsElapsed);
    const notYetApplied = existingAll
      .filter((p) => p.monthOffset > monthsElapsed)
      .reduce((s, p) => s + p.amount, 0);
    const nowSim = simulate(principal, rate, emi, inLoop, monthsElapsed);
    const outstanding = Math.max(0, nowSim.balance - notYetApplied);

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

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) {
      toast.error("You must be signed in to save.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("loan_foreclosures").insert({
      user_id: uid,
      loan_id: loanId,
      outstanding_principal: result.outstanding,
      charge_pct: Number(chargePct) || 0,
      fixed_fee: Number(fixedFee) || 0,
      gst_pct: Number(gstPct) || 0,
      pct_charges: result.pctCharges,
      gst_amount: result.gst,
      total_charges: result.totalCharges,
      total_payable: result.totalPayable,
      interest_saved: result.interestSaved,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save", { description: error.message });
      return;
    }
    toast.success("Foreclosure breakdown saved");
    setNotes("");
    loadHistory();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("loan_foreclosures").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete", { description: error.message });
      return;
    }
    setHistory((h) => h.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foreclosure Calculator — {loanLabel}</DialogTitle>
          <DialogDescription>
            Estimate and save the total amount required to close this loan today.
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
              <div className="space-y-1.5">
                <Label htmlFor="fnotes">Notes (optional)</Label>
                <Input
                  id="fnotes" type="text" maxLength={200}
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. quote from HDFC on call"
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
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save Breakdown"}
            </Button>
          </>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Saved Breakdowns</div>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="text-destructive hover:opacity-80"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <div className="text-muted-foreground">Outstanding</div>
                    <div className="text-right tabular-nums">{formatCurrency(Number(h.outstanding_principal))}</div>
                    <div className="text-muted-foreground">Charge {Number(h.charge_pct)}% + Fee</div>
                    <div className="text-right tabular-nums">{formatCurrency(Number(h.pct_charges) + Number(h.fixed_fee))}</div>
                    <div className="text-muted-foreground">GST ({Number(h.gst_pct)}%)</div>
                    <div className="text-right tabular-nums">{formatCurrency(Number(h.gst_amount))}</div>
                    <div className="font-medium">Total Payable</div>
                    <div className="text-right font-semibold tabular-nums">{formatCurrency(Number(h.total_payable))}</div>
                  </div>
                  {h.notes && <div className="pt-1 text-muted-foreground italic">"{h.notes}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
