import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronDown, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/finance";

type Kind = "loan" | "credit_card" | "insurance";

interface Props {
  kind: Kind;
  userId: string;
  onSaved: () => void;
}

const LABEL_BY_KIND: Record<Kind, { title: string; cta: string; nameLabel: string; amountLabel: string }> = {
  loan: { title: "Add Loan / EMI", cta: "Add Loan", nameLabel: "Bank name", amountLabel: "EMI amount" },
  credit_card: {
    title: "Add Credit Card",
    cta: "Add Credit Card",
    nameLabel: "Bank name",
    amountLabel: "Outstanding amount",
  },
  insurance: {
    title: "Add Insurance",
    cta: "Add Insurance",
    nameLabel: "Insurance type",
    amountLabel: "Premium amount",
  },
};

export function AddLiabilityDialog({ kind, userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("5");

  // Loan-specific
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");

  // Loan BPI (advanced)
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [disbursementDate, setDisbursementDate] = useState("");
  const [bpiTreatment, setBpiTreatment] = useState<"" | "separate" | "added_to_first_emi" | "deducted_from_disbursed">("");

  // Credit card-specific
  const [creditLimit, setCreditLimit] = useState("");
  const [cardInterestRate, setCardInterestRate] = useState("");

  // Insurance-specific
  const [sumAssured, setSumAssured] = useState("");
  const [policyStartDate, setPolicyStartDate] = useState("");
  const [policyTermYears, setPolicyTermYears] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const cfg = LABEL_BY_KIND[kind];

  // Auto-calculate EMI from principal, interest rate, and tenure
  useEffect(() => {
    if (kind !== "loan") return;
    const p = Number(principal);
    const r = Number(interestRate);
    const n = Number(tenureMonths);
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r) || r <= 0 || !Number.isInteger(n) || n < 1) return;
    const monthly = r / 12 / 100;
    const emi = (p * monthly * Math.pow(1 + monthly, n)) / (Math.pow(1 + monthly, n) - 1);
    if (Number.isFinite(emi) && emi > 0) {
      setAmount(emi.toFixed(2));
    }
  }, [kind, principal, interestRate, tenureMonths]);

  // Broken Period Interest (BPI) calculation
  const bpi = (() => {
    if (kind !== "loan") return null;
    const p = Number(principal);
    const r = Number(interestRate);
    if (!disbursementDate || !startDate) return null;
    if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r) || r <= 0) return null;
    const d1 = new Date(disbursementDate);
    const d2 = new Date(startDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
    if (d1 > d2) return { invalid: true as const };
    const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return null;
    const interest = (p * r * days) / (365 * 100);
    const emiNum = Number(amount);
    const adjustedFirstEmi = bpiTreatment === "added_to_first_emi" && Number.isFinite(emiNum)
      ? emiNum + interest : null;
    const netDisbursed = bpiTreatment === "deducted_from_disbursed" ? p - interest : null;
    return { invalid: false as const, days, interest, adjustedFirstEmi, netDisbursed };
  })();

  function reset() {
    setName(""); setAmount(""); setDueDay("5");
    setPrincipal(""); setStartDate(""); setInterestRate(""); setTenureMonths("");
    setCreditLimit(""); setCardInterestRate("");
    setSumAssured(""); setPolicyStartDate(""); setPolicyTermYears("");
    setAdvancedOpen(false); setDisbursementDate(""); setBpiTreatment("");
  }

  function validatePositive(label: string, raw: string): number | null {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      toast.error(`Enter a valid ${label}.`);
      return null;
    }
    return n;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    const day = Number(dueDay);
    if (!name.trim()) return toast.error("Please enter a name.");
    if (!Number.isFinite(amt) || amt < 0) return toast.error("Enter a valid amount.");
    if (!Number.isInteger(day) || day < 1 || day > 31) return toast.error("Due day must be 1–31.");

    setSubmitting(true);
    let error;

    if (kind === "loan") {
      const p = validatePositive("loan amount", principal);
      const r = validatePositive("interest rate", interestRate);
      const t = Number(tenureMonths);
      if (p === null || r === null) { setSubmitting(false); return; }
      if (!Number.isInteger(t) || t < 1) { setSubmitting(false); return toast.error("Tenure must be at least 1 month."); }
      if (!startDate) { setSubmitting(false); return toast.error("Please pick an EMI start date."); }
      if (disbursementDate && new Date(disbursementDate) > new Date(startDate)) {
        setSubmitting(false); return toast.error("Disbursement Date cannot be later than First EMI Date.");
      }
      const bpiPayload = bpi && !bpi.invalid && disbursementDate ? {
        disbursement_date: disbursementDate,
        broken_period_days: bpi.days,
        broken_period_interest: bpi.interest,
        bpi_treatment: bpiTreatment || null,
        adjusted_first_emi: bpi.adjustedFirstEmi,
        net_disbursed_amount: bpi.netDisbursed,
      } : {};
      ({ error } = await supabase.from("loans").insert({
        user_id: userId,
        bank_name: name.trim(),
        emi_amount: amt,
        due_day: day,
        principal_amount: p,
        start_date: startDate,
        interest_rate: r,
        tenure_months: t,
        ...bpiPayload,
      }));
    } else if (kind === "credit_card") {
      const cl = validatePositive("credit limit", creditLimit);
      const cr = validatePositive("interest rate", cardInterestRate);
      if (cl === null || cr === null) { setSubmitting(false); return; }
      ({ error } = await supabase.from("credit_cards").insert({
        user_id: userId,
        bank_name: name.trim(),
        outstanding_amount: amt,
        due_day: day,
        credit_limit: cl,
        interest_rate: cr,
      }));
    } else {
      const sa = validatePositive("sum assured", sumAssured);
      const pt = Number(policyTermYears);
      if (sa === null) { setSubmitting(false); return; }
      if (!Number.isInteger(pt) || pt < 1) { setSubmitting(false); return toast.error("Policy term must be at least 1 year."); }
      if (!policyStartDate) { setSubmitting(false); return toast.error("Please pick a policy start date."); }
      ({ error } = await supabase.from("insurance").insert({
        user_id: userId,
        insurance_type: name.trim(),
        premium_amount: amt,
        due_day: day,
        sum_assured: sa,
        policy_start_date: policyStartDate,
        policy_term_years: pt,
      }));
    }
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved.");
    reset();
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription>
            We'll automatically calculate the next due date each month.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{cfg.nameLabel} <span className="text-destructive">*</span></Label>
            {kind === "insurance" ? (
              <Select value={name} onValueChange={setName}>
                <SelectTrigger id="name">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIC">LIC</SelectItem>
                  <SelectItem value="Term">Term</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Vehicle">Vehicle</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={kind === "loan" ? "e.g. HDFC Bank" : "e.g. ICICI"}
                maxLength={80}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {cfg.amountLabel} <span className="text-destructive">*</span>
                {kind === "loan" && <span className="ml-1 text-xs text-muted-foreground">(auto)</span>}
              </Label>
              <Input
                id="amount" type="number" inputMode="decimal" min="0" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                readOnly={kind === "loan"}
                className={kind === "loan" ? "bg-muted/40" : undefined}
              />
              {kind === "loan" && (
                <p className="text-xs text-muted-foreground">
                  Calculated from loan amount, interest rate & tenure.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Due day of month <span className="text-destructive">*</span></Label>
              <Input
                id="due" type="number" min="1" max="31"
                value={dueDay} onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>

          {kind === "loan" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="principal">Total loan amount <span className="text-destructive">*</span></Label>
                  <Input
                    id="principal" type="number" inputMode="decimal" min="0" step="0.01"
                    value={principal} onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="e.g. 1000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest">Interest rate (% p.a.) <span className="text-destructive">*</span></Label>
                  <Input
                    id="interest" type="number" inputMode="decimal" min="0" step="0.01"
                    value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="e.g. 8.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start">EMI start date <span className="text-destructive">*</span></Label>
                  <Input
                    id="start" type="date"
                    value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenure">Tenure (months) <span className="text-destructive">*</span></Label>
                  <Input
                    id="tenure" type="number" min="1" step="1"
                    value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)}
                    placeholder="e.g. 60"
                  />
                </div>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-md border">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40"
                  >
                    <span>Advanced Loan Settings</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 border-t p-3">
                  <p className="text-xs text-muted-foreground">
                    Optional: Broken Period Interest (BPI) is charged for days between disbursement and the first EMI.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="disb">Loan Disbursement Date</Label>
                      <Input
                        id="disb" type="date"
                        value={disbursementDate}
                        onChange={(e) => setDisbursementDate(e.target.value)}
                        max={startDate || undefined}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bpitreat">BPI Treatment</Label>
                      <Select value={bpiTreatment} onValueChange={(v) => setBpiTreatment(v as typeof bpiTreatment)}>
                        <SelectTrigger id="bpitreat">
                          <SelectValue placeholder="Select treatment" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="separate">Collected Separately</SelectItem>
                          <SelectItem value="added_to_first_emi">Added to First EMI</SelectItem>
                          <SelectItem value="deducted_from_disbursed">Deducted From Disbursed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {bpi?.invalid && (
                    <p className="text-xs text-destructive">
                      Disbursement Date cannot be later than First EMI Date.
                    </p>
                  )}

                  {bpi && !bpi.invalid && (
                    <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                      <div className="font-medium">Loan Summary</div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Loan Amount</span><span>{formatCurrency(Number(principal))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span>{interestRate}% p.a.</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Disbursement Date</span><span>{disbursementDate}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">First EMI Date</span><span>{startDate}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Broken Period Days</span><span>{bpi.days}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Broken Period Interest</span><span>{formatCurrency(bpi.interest)}</span></div>
                      {bpiTreatment && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">BPI Treatment</span>
                          <span>
                            {bpiTreatment === "separate" && "Collected Separately"}
                            {bpiTreatment === "added_to_first_emi" && "Added to First EMI"}
                            {bpiTreatment === "deducted_from_disbursed" && "Deducted From Disbursed"}
                          </span>
                        </div>
                      )}
                      {bpi.adjustedFirstEmi !== null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Adjusted First EMI</span><span>{formatCurrency(bpi.adjustedFirstEmi)}</span></div>
                      )}
                      {bpi.netDisbursed !== null && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Net Disbursed Amount</span><span>{formatCurrency(bpi.netDisbursed)}</span></div>
                      )}
                      <p className="text-xs text-muted-foreground pt-1">
                        EMI, amortization, and prepayment calculations continue to use the original loan amount.
                      </p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {kind === "credit_card" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="limit">Credit limit <span className="text-destructive">*</span></Label>
                <Input
                  id="limit" type="number" inputMode="decimal" min="0" step="0.01"
                  value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="e.g. 200000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardrate">Interest rate (% p.a.) <span className="text-destructive">*</span></Label>
                <Input
                  id="cardrate" type="number" inputMode="decimal" min="0" step="0.01"
                  value={cardInterestRate} onChange={(e) => setCardInterestRate(e.target.value)}
                  placeholder="e.g. 36"
                />
              </div>
            </div>
          )}

          {kind === "insurance" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sum">Sum assured <span className="text-destructive">*</span></Label>
                <Input
                  id="sum" type="number" inputMode="decimal" min="0" step="0.01"
                  value={sumAssured} onChange={(e) => setSumAssured(e.target.value)}
                  placeholder="e.g. 500000"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pstart">Policy start date <span className="text-destructive">*</span></Label>
                  <Input
                    id="pstart" type="date"
                    value={policyStartDate} onChange={(e) => setPolicyStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pterm">Policy term (years) <span className="text-destructive">*</span></Label>
                  <Input
                    id="pterm" type="number" min="1" step="1"
                    value={policyTermYears} onChange={(e) => setPolicyTermYears(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-primary shadow-elegant"
            >
              {submitting ? "Saving…" : cfg.cta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
