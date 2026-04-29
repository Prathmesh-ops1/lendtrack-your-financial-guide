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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Landmark, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  currentBalance: number;
  onSaved: () => void;
}

// Deterministic pseudo-random balance based on account number
function mockFetchBalance(accountNumber: string): number {
  let seed = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    seed = (seed * 31 + accountNumber.charCodeAt(i)) % 1_000_000;
  }
  // Range: ₹5,000 – ₹2,50,000
  return Math.round(5000 + (seed % 245000));
}

export function UpdateBalanceDialog({ userId, currentBalance, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentBalance ?? ""));
  const [submitting, setSubmitting] = useState(false);

  // Bank fetch fields
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchedBalance, setFetchedBalance] = useState<number | null>(null);

  async function saveBalance(amt: number) {
    const { error } = await supabase
      .from("balances")
      .upsert({ user_id: userId, amount: amt, updated_at: new Date().toISOString() });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Balance updated.");
    setOpen(false);
    onSaved();
    return true;
  }

  async function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(value);
    if (!Number.isFinite(amt) || amt < 0) return toast.error("Enter a valid balance.");
    setSubmitting(true);
    await saveBalance(amt);
    setSubmitting(false);
  }

  async function onFetchFromBank() {
    if (!bankName.trim()) return toast.error("Enter bank name.");
    if (!/^\d{6,18}$/.test(accountNumber.trim()))
      return toast.error("Account number must be 6–18 digits.");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc.trim()))
      return toast.error("Enter a valid IFSC code (e.g. HDFC0001234).");

    setFetching(true);
    setFetchedBalance(null);
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 1200));
    const bal = mockFetchBalance(accountNumber.trim());
    setFetchedBalance(bal);
    setFetching(false);
    toast.success(`Balance fetched from ${bankName.trim()}`);
  }

  async function onUseFetched() {
    if (fetchedBalance == null) return;
    setSubmitting(true);
    await saveBalance(fetchedBalance);
    setSubmitting(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setValue(String(currentBalance ?? ""));
          setFetchedBalance(null);
        }
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
            Enter your balance manually or fetch it from your bank account.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
            <TabsTrigger value="bank">Fetch from bank</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={onManualSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="bal">Balance (₹)</Label>
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
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-primary shadow-elegant"
                >
                  {submitting ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bank">
            <div className="space-y-4 pt-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted-foreground">
                Demo mode: this uses a mock API. No real bank connection is made.
              </div>
              <div className="space-y-2">
                <Label htmlFor="bn">Bank name</Label>
                <Input
                  id="bn"
                  placeholder="HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acc">Account number</Label>
                <Input
                  id="acc"
                  inputMode="numeric"
                  placeholder="123456789012"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc">IFSC code</Label>
                <Input
                  id="ifsc"
                  placeholder="HDFC0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  maxLength={11}
                />
              </div>

              {fetchedBalance != null && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Fetched balance</div>
                  <div className="font-display text-2xl font-bold">
                    ₹{fetchedBalance.toLocaleString("en-IN")}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onFetchFromBank}
                  disabled={fetching || submitting}
                  className="gap-2"
                >
                  {fetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                  {fetching ? "Fetching…" : "Fetch balance"}
                </Button>
                <Button
                  type="button"
                  onClick={onUseFetched}
                  disabled={fetchedBalance == null || submitting}
                  className="bg-gradient-primary shadow-elegant"
                >
                  {submitting ? "Saving…" : "Use this balance"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
