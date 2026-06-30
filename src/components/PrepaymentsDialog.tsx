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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/finance";
import { Trash2, AlertTriangle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function formatDMY(d: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

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

function computeEmi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

type ChargeMethod = "separate" | "deduct";
type RecalcMethod = "reduce_tenure" | "reduce_emi";

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
  const [chargeMethod, setChargeMethod] = useState<ChargeMethod>("separate");
  const [recalcMethod, setRecalcMethod] = useState<RecalcMethod>("reduce_tenure");
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

    const prepayDate = paidDate ? new Date(paidDate) : new Date();
    // Existing prepayments on/before the selected prepay date (offsets from loan start)
    const priorExistingAll = items
      .filter((p) => new Date(p.paid_date) <= prepayDate)
      .map((p) => ({
        monthOffset: Math.max(1, monthsBetween(start, new Date(p.paid_date)) + 1),
        amount: Number(p.amount),
      }));

    const monthsAtPrepay = Math.min(tenure, monthsBetween(start, prepayDate));
    // Simulate EMI schedule up to today; apply prepayments inside the loop window,
    // then subtract any prepayments dated on/before today but past the loop cursor.
    const inLoop = priorExistingAll.filter((p) => p.monthOffset <= monthsAtPrepay);
    const notYetApplied = priorExistingAll
      .filter((p) => p.monthOffset > monthsAtPrepay)
      .reduce((s, p) => s + p.amount, 0);
    const nowSim = simulate(principal, rate, emi, inLoop, monthsAtPrepay);
    const outstandingNow = Math.max(0, nowSim.balance - notYetApplied);

    // Baseline: no new prepayment, continue with current EMI
    const baseline = simulate(outstandingNow, rate, emi, [], undefined);

    const amt = Number(amount);
    const cPct = Number(chargePct);
    const gPct = Number(gstPct);
    const validAmt = Number.isFinite(amt) && amt > 0;
    const charges = validAmt && Number.isFinite(cPct) && cPct > 0 ? (amt * cPct) / 100 : 0;
    const gstAmount = charges > 0 && Number.isFinite(gPct) && gPct > 0 ? (charges * gPct) / 100 : 0;
    const totalCharges = charges + gstAmount;

    // Net principal reduced depends on charge method
    const netPrincipalReduced = validAmt
      ? chargeMethod === "deduct"
        ? Math.max(0, amt - totalCharges)
        : amt
      : 0;

    const exceeds = validAmt && netPrincipalReduced > outstandingNow + 0.5;
    const equals = validAmt && Math.abs(netPrincipalReduced - outstandingNow) <= Math.max(1, outstandingNow * 0.005);

    let scenario: null | {
      newOutstanding: number;
      interestSaved: number;
      remainingInterestBaseline: number;
      remainingInterestAfter: number;
      newClosureDate: Date;
      newEmi: number;
      newTenureMonths: number;
      monthsSaved: number;
    } = null;

    if (netPrincipalReduced > 0 && !exceeds) {
      const newOutstanding = Math.max(0, outstandingNow - netPrincipalReduced);
      const remainingTenureBaseline = Math.max(1, tenure - monthsAtPrepay);

      let withPrepay: { balance: number; monthsToPayoff: number; totalInterest: number };
      let newEmi = emi;
      let newTenureMonths = baseline.monthsToPayoff;

      if (recalcMethod === "reduce_emi") {
        // Keep tenure same, lower EMI
        newEmi = computeEmi(newOutstanding, rate, remainingTenureBaseline);
        withPrepay = simulate(newOutstanding, rate, newEmi, [], undefined);
        newTenureMonths = remainingTenureBaseline;
      } else {
        // Keep EMI same, reduce tenure
        withPrepay = simulate(newOutstanding, rate, emi, [], undefined);
        newTenureMonths = withPrepay.monthsToPayoff;
      }

      const interestSaved = Math.max(0, baseline.totalInterest - withPrepay.totalInterest);
      const monthsSaved = Math.max(0, baseline.monthsToPayoff - withPrepay.monthsToPayoff);
      const newClosureDate = new Date(prepayDate.getFullYear(), prepayDate.getMonth() + newTenureMonths, prepayDate.getDate());
      scenario = {
        newOutstanding,
        interestSaved,
        remainingInterestBaseline: baseline.totalInterest,
        remainingInterestAfter: withPrepay.totalInterest,
        newClosureDate,
        newEmi,
        newTenureMonths,
        monthsSaved,
      };
    }

    return { outstandingNow, charges, gstAmount, totalCharges, netPrincipalReduced, scenario, exceeds, equals };
  }, [loan, items, amount, chargePct, gstPct, chargeMethod, recalcMethod, paidDate]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    if (!paidDate) return toast.error("Pick a date.");
    if (projection?.exceeds) {
      return toast.error("Prepayment exceeds outstanding principal. Use the Foreclosure Calculator.");
    }
    if (projection?.equals) {
      return toast.error("Amount equals outstanding. Please use the Foreclosure Calculator to close the loan.");
    }
    const cPct = chargePct === "" ? null : Number(chargePct);
    const gPct = gstPct === "" ? null : Number(gstPct);
    if (cPct !== null && (!Number.isFinite(cPct) || cPct < 0)) return toast.error("Invalid charge %.");
    if (gPct !== null && (!Number.isFinite(gPct) || gPct < 0)) return toast.error("Invalid GST %.");
    setSubmitting(true);
    const noteTag = `[${chargeMethod}/${recalcMethod}]`;
    const combinedNote = [note.trim(), noteTag].filter(Boolean).join(" ");
    const { error } = await supabase.from("loan_prepayments").insert({
      user_id: userId,
      loan_id: loanId,
      amount: amt,
      paid_date: paidDate,
      note: combinedNote || null,
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
            <div className="mb-1 font-semibold">Outstanding as of {formatDate(new Date(paidDate))}</div>
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
            <Label>Charge Collection Method</Label>
            <RadioGroup
              value={chargeMethod}
              onValueChange={(v) => setChargeMethod(v as ChargeMethod)}
              className="grid grid-cols-1 gap-1.5"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="separate" /> Paid Separately (default)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="deduct" /> Deducted from Prepayment Amount
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Recalculation Method</Label>
            <RadioGroup
              value={recalcMethod}
              onValueChange={(v) => setRecalcMethod(v as RecalcMethod)}
              className="grid grid-cols-1 gap-1.5"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="reduce_tenure" /> Keep EMI Same → Reduce Tenure (default)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="reduce_emi" /> Keep Tenure Same → Reduce EMI
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pnote">Note (optional)</Label>
            <Input
              id="pnote" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bonus payment"
              maxLength={120}
            />
          </div>

          {projection?.exceeds && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Net principal reduced exceeds the current outstanding ({formatCurrency(projection.outstandingNow)}).
                Please use the <strong>Foreclosure Calculator</strong> instead.
              </div>
            </div>
          )}
          {projection?.equals && !projection.exceeds && (
            <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                This will fully close the loan. Consider the <strong>Foreclosure Calculator</strong> to factor in foreclosure charges.
              </div>
            </div>
          )}

          {projection && Number(amount) > 0 && !projection.exceeds && (
            <div className="rounded-md border border-border/60 bg-background p-3 text-sm space-y-1">
              <div className="font-semibold">Prepayment Summary</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prepayment Amount</span><span>{formatCurrency(Number(amount))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Part Payment Charges</span><span>{formatCurrency(projection.charges)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatCurrency(projection.gstAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Charge Collection</span><span>{chargeMethod === "deduct" ? "Deducted from amount" : "Paid separately"}</span></div>
              <div className="flex justify-between font-medium"><span>Net Principal Reduced</span><span>{formatCurrency(projection.netPrincipalReduced)}</span></div>
              {projection.scenario && (
                <>
                  <div className="my-1 border-t border-border/60" />
                  <div className="flex justify-between"><span className="text-muted-foreground">Updated Outstanding</span><span>{formatCurrency(projection.scenario.newOutstanding)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Remaining Interest (Without Prepayment)</span><span>{formatCurrency(projection.scenario.remainingInterestBaseline)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Remaining Interest (After Prepayment)</span><span>{formatCurrency(projection.scenario.remainingInterestAfter)}</span></div>
                  <div className="flex justify-between text-success font-medium"><span>Total Interest Saved</span><span>{formatCurrency(projection.scenario.interestSaved)}</span></div>
                  <div className="my-1 border-t border-border/60" />
                  {recalcMethod === "reduce_tenure" ? (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">EMI (unchanged)</span><span>{formatCurrency(projection.scenario.newEmi)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">New Tenure</span><span>{projection.scenario.newTenureMonths} months</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">New Closure Date</span><span>{formatDate(projection.scenario.newClosureDate)}</span></div>
                      {projection.scenario.monthsSaved > 0 && (
                        <p className="pt-1 text-xs text-muted-foreground">
                          You'd close ~{projection.scenario.monthsSaved} month{projection.scenario.monthsSaved === 1 ? "" : "s"} earlier.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tenure (unchanged)</span><span>{projection.scenario.newTenureMonths} months</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">New EMI</span><span>{formatCurrency(projection.scenario.newEmi)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">New Closure Date</span><span>{formatDate(projection.scenario.newClosureDate)}</span></div>
                    </>
                  )}
                </>
              )}
              <p className="pt-1 text-[11px] text-muted-foreground">
                Outstanding is computed from the amortization schedule as of the selected date, including any earlier prepayments. BPI, processing & foreclosure fees are excluded.
              </p>
            </div>
          )}

          <Button type="submit" disabled={submitting || projection?.exceeds} size="sm" className="bg-gradient-primary">
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
                const deducted = p.note?.includes("[deduct/");
                const net = deducted ? Math.max(0, amt - c - g) : amt;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold tabular-nums">{formatCurrency(amt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(new Date(p.paid_date))}
                        {c > 0 ? ` • Charges ${formatCurrency(c)}` : ""}
                        {g > 0 ? ` + GST ${formatCurrency(g)}` : ""}
                        {` • Net principal ${formatCurrency(net)}`}
                        {p.note ? ` • ${p.note.replace(/\s*\[[^\]]+\]\s*$/, "")}` : ""}
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
