import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function EmiCalculator() {
  const [principal, setPrincipal] = useState(1000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(60);

  const { emi, totalInterest, totalPayable } = useMemo(() => {
    const r = rate / 12 / 100;
    const n = tenure;
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayable = emi * n;
    return { emi, totalPayable, totalInterest: totalPayable - principal };
  }, [principal, rate, tenure]);

  const principalPct = (principal / totalPayable) * 100;

  return (
    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-elegant backdrop-blur">
      <CardContent className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">EMI Calculator</h3>
              <p className="text-xs text-muted-foreground">Try the math behind your loans</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Loan amount</span>
              <span className="font-semibold tabular-nums">{formatINR(principal)}</span>
            </div>
            <Slider value={[principal]} onValueChange={(v) => setPrincipal(v[0])} min={50000} max={10000000} step={50000} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Interest rate</span>
              <span className="font-semibold tabular-nums">{rate.toFixed(1)}% p.a.</span>
            </div>
            <Slider value={[rate]} onValueChange={(v) => setRate(v[0])} min={5} max={20} step={0.1} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tenure</span>
              <span className="font-semibold tabular-nums">{tenure} months</span>
            </div>
            <Slider value={[tenure]} onValueChange={(v) => setTenure(v[0])} min={6} max={360} step={6} />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Monthly EMI</p>
            <p className="font-display text-4xl font-bold tabular-nums">{formatINR(emi)}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="opacity-80">Principal</span>
              <span className="font-semibold tabular-nums">{formatINR(principal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="opacity-80">Total interest</span>
              <span className="font-semibold tabular-nums">{formatINR(totalInterest)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/20 pt-3">
              <span className="opacity-80">Total payable</span>
              <span className="font-semibold tabular-nums">{formatINR(totalPayable)}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs opacity-80">
              <span>Principal vs Interest</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/20">
              <div className="bg-white transition-all duration-500" style={{ width: `${principalPct}%` }} />
              <div className="bg-warning transition-all duration-500" style={{ width: `${100 - principalPct}%` }} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
