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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CreditCard as CardIcon, Landmark, Loader2, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/finance";

interface Props {
  label: string;
  amount: number;
  balance: number;
  disabled?: boolean;
  trigger?: React.ReactNode;
  onPaid: (txnId: string) => Promise<void> | void;
}

const NETBANKING_BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "Punjab National Bank",
];

function genTxnId() {
  return "TXN" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function PayNowDialog({ label, amount, balance, disabled, trigger, onPaid }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // UPI
  const [upiId, setUpiId] = useState("");
  // Card
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  // Netbanking
  const [bank, setBank] = useState("");

  const insufficient = amount > balance;

  function reset() {
    setProcessing(false);
    setSuccess(null);
    setUpiId("");
    setCardNumber("");
    setCardName("");
    setExpiry("");
    setCvv("");
    setBank("");
    setMethod("upi");
  }

  function validate(): string | null {
    if (insufficient) return `Insufficient balance. Available ${formatCurrency(balance)}.`;
    if (method === "upi") {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) return "Enter a valid UPI ID (e.g. name@bank).";
    } else if (method === "card") {
      const num = cardNumber.replace(/\s/g, "");
      if (!/^\d{16}$/.test(num)) return "Card number must be 16 digits.";
      if (!cardName.trim()) return "Enter the cardholder name.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return "Expiry must be in MM/YY format.";
      if (!/^\d{3,4}$/.test(cvv)) return "CVV must be 3 or 4 digits.";
    } else {
      if (!bank) return "Select a bank.";
    }
    return null;
  }

  async function onPay() {
    const err = validate();
    if (err) return toast.error(err);

    setProcessing(true);
    // Simulate gateway latency
    await new Promise((r) => setTimeout(r, 1800));
    const txnId = genTxnId();
    setSuccess(txnId);
    setProcessing(false);

    try {
      await onPaid(txnId);
    } catch (e) {
      // surface but keep success state
      console.warn(e);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={disabled} className="gap-1 bg-gradient-primary shadow-elegant">
            <Wallet className="h-4 w-4" /> Pay Now
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <DialogTitle className="text-xl">Payment Successful</DialogTitle>
              <DialogDescription className="mt-2">
                {formatCurrency(amount)} paid for <strong>{label}</strong>
              </DialogDescription>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono">{success}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{method}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            <Button className="w-full bg-gradient-primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pay {formatCurrency(amount)}</DialogTitle>
              <DialogDescription>
                Paying for <strong>{label}</strong>. Available balance: {formatCurrency(balance)}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-muted-foreground">
              Demo mode: this is a simulated payment gateway. No real money moves.
            </div>

            {insufficient && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                Your balance is too low for this payment. Top up your balance first.
              </div>
            )}

            <Tabs value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upi" className="gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> UPI
                </TabsTrigger>
                <TabsTrigger value="card" className="gap-1">
                  <CardIcon className="h-3.5 w-3.5" /> Card
                </TabsTrigger>
                <TabsTrigger value="netbanking" className="gap-1">
                  <Landmark className="h-3.5 w-3.5" /> Netbanking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upi" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="upi">UPI ID</Label>
                  <Input
                    id="upi"
                    placeholder="yourname@okhdfc"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="card" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="cn">Card number</Label>
                  <Input
                    id="cn"
                    inputMode="numeric"
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                      setCardNumber(v.replace(/(.{4})/g, "$1 ").trim());
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnam">Cardholder name</Label>
                  <Input id="cnam" value={cardName} onChange={(e) => setCardName(e.target.value)} maxLength={50} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="exp">Expiry (MM/YY)</Label>
                    <Input
                      id="exp"
                      placeholder="12/27"
                      value={expiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                        setExpiry(v);
                      }}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="password"
                      inputMode="numeric"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="netbanking" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="bank">Select bank</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger id="bank">
                      <SelectValue placeholder="Choose your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {NETBANKING_BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    You'll be "redirected" to your bank's portal (simulated).
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                onClick={onPay}
                disabled={processing || insufficient}
                className="w-full gap-2 bg-gradient-primary shadow-elegant"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing payment…
                  </>
                ) : (
                  <>Pay {formatCurrency(amount)}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
