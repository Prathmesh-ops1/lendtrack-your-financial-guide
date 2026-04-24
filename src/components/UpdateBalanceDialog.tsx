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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Props {
  userId: string;
  currentBalance: number;
  onSaved: () => void;
}

export function UpdateBalanceDialog({ userId, currentBalance, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentBalance ?? ""));
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(value);
    if (!Number.isFinite(amt) || amt < 0) return toast.error("Enter a valid balance.");
    setSubmitting(true);
    const { error } = await supabase
      .from("balances")
      .upsert({ user_id: userId, amount: amt, updated_at: new Date().toISOString() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Balance updated.");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setValue(String(currentBalance ?? ""));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1">
          <Pencil className="h-3.5 w-3.5" /> Update
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update current balance</DialogTitle>
          <DialogDescription>
            Enter the balance currently available in your bank account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bal">Balance</Label>
            <Input
              id="bal"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-gradient-primary shadow-elegant">
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
