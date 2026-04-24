import { useState } from "react";
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
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Kind = "loan" | "credit_card" | "insurance";

interface Props {
  kind: Kind;
  userId: string;
  onSaved: () => void;
}

const TABLE_BY_KIND: Record<Kind, "loans" | "credit_cards" | "insurance"> = {
  loan: "loans",
  credit_card: "credit_cards",
  insurance: "insurance",
};

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
  const [submitting, setSubmitting] = useState(false);

  const cfg = LABEL_BY_KIND[kind];

  function reset() {
    setName("");
    setAmount("");
    setDueDay("5");
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
      ({ error } = await supabase
        .from("loans")
        .insert({ user_id: userId, bank_name: name.trim(), emi_amount: amt, due_day: day }));
    } else if (kind === "credit_card") {
      ({ error } = await supabase
        .from("credit_cards")
        .insert({ user_id: userId, bank_name: name.trim(), outstanding_amount: amt, due_day: day }));
    } else {
      ({ error } = await supabase
        .from("insurance")
        .insert({ user_id: userId, insurance_type: name.trim(), premium_amount: amt, due_day: day }));
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription>
            We'll automatically calculate the next due date each month.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{cfg.nameLabel}</Label>
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
              <Label htmlFor="amount">{cfg.amountLabel}</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Due day of month</Label>
              <Input
                id="due"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>

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
