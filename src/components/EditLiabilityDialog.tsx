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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EditKind = "loan" | "credit_card" | "insurance";

interface Props {
  kind: EditKind;
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditLiabilityDialog({ kind, id, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Common
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("5");

  // Loan
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");

  // Card
  const [creditLimit, setCreditLimit] = useState("");
  const [cardInterestRate, setCardInterestRate] = useState("");

  // Insurance
  const [sumAssured, setSumAssured] = useState("");
  const [policyStartDate, setPolicyStartDate] = useState("");
  const [policyTermYears, setPolicyTermYears] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      if (kind === "loan") {
        const { data } = await supabase.from("loans").select("*").eq("id", id).maybeSingle();
        if (active && data) {
          setName(data.bank_name ?? "");
          setAmount(String(data.emi_amount ?? ""));
          setDueDay(String(data.due_day ?? "5"));
          setPrincipal(data.principal_amount ? String(data.principal_amount) : "");
          setStartDate(data.start_date ?? "");
          setInterestRate(data.interest_rate ? String(data.interest_rate) : "");
          setTenureMonths(data.tenure_months ? String(data.tenure_months) : "");
        }
      } else if (kind === "credit_card") {
        const { data } = await supabase.from("credit_cards").select("*").eq("id", id).maybeSingle();
        if (active && data) {
          setName(data.bank_name ?? "");
          setAmount(String(data.outstanding_amount ?? ""));
          setDueDay(String(data.due_day ?? "5"));
          setCreditLimit(data.credit_limit ? String(data.credit_limit) : "");
          setCardInterestRate(data.interest_rate ? String(data.interest_rate) : "");
        }
      } else {
        const { data } = await supabase.from("insurance").select("*").eq("id", id).maybeSingle();
        if (active && data) {
          setName(data.insurance_type ?? "");
          setAmount(String(data.premium_amount ?? ""));
          setDueDay(String(data.due_day ?? "5"));
          setSumAssured(data.sum_assured ? String(data.sum_assured) : "");
          setPolicyStartDate(data.policy_start_date ?? "");
          setPolicyTermYears(data.policy_term_years ? String(data.policy_term_years) : "");
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [open, id, kind]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    const day = Number(dueDay);
    if (!name.trim()) return toast.error("Name is required.");
    if (!Number.isFinite(amt) || amt < 0) return toast.error("Enter a valid amount.");
    if (!Number.isInteger(day) || day < 1 || day > 31) return toast.error("Due day must be 1–31.");

    setSubmitting(true);
    let error;
    if (kind === "loan") {
      ({ error } = await supabase
        .from("loans")
        .update({
          bank_name: name.trim(),
          emi_amount: amt,
          due_day: day,
          principal_amount: principal ? Number(principal) : null,
          start_date: startDate || null,
          interest_rate: interestRate ? Number(interestRate) : null,
          tenure_months: tenureMonths ? Number(tenureMonths) : null,
        })
        .eq("id", id));
    } else if (kind === "credit_card") {
      ({ error } = await supabase
        .from("credit_cards")
        .update({
          bank_name: name.trim(),
          outstanding_amount: amt,
          due_day: day,
          credit_limit: creditLimit ? Number(creditLimit) : null,
          interest_rate: cardInterestRate ? Number(cardInterestRate) : null,
        })
        .eq("id", id));
    } else {
      ({ error } = await supabase
        .from("insurance")
        .update({
          insurance_type: name.trim(),
          premium_amount: amt,
          due_day: day,
          sum_assured: sumAssured ? Number(sumAssured) : null,
          policy_start_date: policyStartDate || null,
          policy_term_years: policyTermYears ? Number(policyTermYears) : null,
        })
        .eq("id", id));
    }
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Updated.");
    onOpenChange(false);
    onSaved();
  }

  const title =
    kind === "loan" ? "Edit Loan / EMI" : kind === "credit_card" ? "Edit Credit Card" : "Edit Insurance";
  const nameLabel = kind === "insurance" ? "Insurance type" : "Bank name";
  const amountLabel =
    kind === "loan" ? "EMI amount" : kind === "credit_card" ? "Outstanding amount" : "Premium amount";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Update details for this entry.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ename">{nameLabel} *</Label>
              <Input id="ename" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="eamount">{amountLabel} *</Label>
                <Input
                  id="eamount" type="number" min="0" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edue">Due day *</Label>
                <Input
                  id="edue" type="number" min="1" max="31"
                  value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                />
              </div>
            </div>

            {kind === "loan" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="eprincipal">Total loan amount</Label>
                    <Input id="eprincipal" type="number" min="0" step="0.01"
                      value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="erate">Interest rate (% p.a.)</Label>
                    <Input id="erate" type="number" min="0" step="0.01"
                      value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="estart">EMI start date</Label>
                    <Input id="estart" type="date"
                      value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="etenure">Tenure (months)</Label>
                    <Input id="etenure" type="number" min="1" step="1"
                      value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {kind === "credit_card" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="elimit">Credit limit</Label>
                  <Input id="elimit" type="number" min="0" step="0.01"
                    value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecrate">Interest rate (% p.a.)</Label>
                  <Input id="ecrate" type="number" min="0" step="0.01"
                    value={cardInterestRate} onChange={(e) => setCardInterestRate(e.target.value)} />
                </div>
              </div>
            )}

            {kind === "insurance" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="esum">Sum assured</Label>
                  <Input id="esum" type="number" min="0" step="0.01"
                    value={sumAssured} onChange={(e) => setSumAssured(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="epstart">Policy start date</Label>
                    <Input id="epstart" type="date"
                      value={policyStartDate} onChange={(e) => setPolicyStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="epterm">Policy term (years)</Label>
                    <Input id="epterm" type="number" min="1" step="1"
                      value={policyTermYears} onChange={(e) => setPolicyTermYears(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="submit" disabled={submitting} className="bg-gradient-primary shadow-elegant">
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
