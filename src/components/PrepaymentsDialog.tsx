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
import { formatCurrency, formatDate } from "@/lib/finance";
import { Trash2 } from "lucide-react";

interface Prepayment {
  id: string;
  amount: number;
  paid_date: string;
  note: string | null;
}

interface Props {
  loanId: string;
  loanLabel: string;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
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
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("loan_prepayments")
      .select("id, amount, paid_date, note")
      .eq("loan_id", loanId)
      .order("paid_date", { ascending: false });
    setItems((data ?? []) as Prepayment[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loanId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount.");
    if (!paidDate) return toast.error("Pick a date.");
    setSubmitting(true);
    const { error } = await supabase.from("loan_prepayments").insert({
      user_id: userId,
      loan_id: loanId,
      amount: amt,
      paid_date: paidDate,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Prepayment added.");
    setAmount("");
    setNote("");
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
            Record extra/lump-sum payments toward this loan. They reduce your remaining balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={add} className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pamount">Amount *</Label>
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
          <div className="space-y-1.5">
            <Label htmlFor="pnote">Note (optional)</Label>
            <Input
              id="pnote" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bonus payment"
              maxLength={120}
            />
          </div>
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
              {items.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold tabular-nums">{formatCurrency(Number(p.amount))}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(p.paid_date))}
                      {p.note ? ` • ${p.note}` : ""}
                    </div>
                  </div>
                  <Button
                    size="icon" variant="ghost" onClick={() => remove(p.id)}
                    aria-label="Remove prepayment"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
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
