import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet } from "lucide-react";
import { computeLoanProgress, type LoanWithDetails } from "@/lib/loanInsights";
import { formatCurrency, formatDate } from "@/lib/finance";

interface Props {
  userId: string;
  refreshKey?: number;
}

export function LoanProgressSection({ userId, refreshKey }: Props) {
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("loans")
        .select(
          "id, bank_name, emi_amount, due_day, principal_amount, start_date, interest_rate, tenure_months",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (active) {
        setLoans((data ?? []) as LoanWithDetails[]);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  const detailed = loans.filter((l) => l.principal_amount && l.tenure_months && l.start_date);

  if (loading) return null;
  if (detailed.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">Loan progress & insights</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {detailed.map((l) => {
          const p = computeLoanProgress(l);
          if (!p) return null;
          return (
            <Card key={l.id} className="shadow-card-soft">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base font-semibold">{l.bank_name} EMI</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {l.interest_rate}% p.a.
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {p.emisPaid} of {l.tenure_months} EMIs paid
                    </span>
                    <span className="font-medium text-foreground">
                      {p.percentComplete.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={p.percentComplete} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Principal" value={formatCurrency(Number(l.principal_amount))} />
                  <Stat label="EMI" value={formatCurrency(Number(l.emi_amount))} />
                  <Stat label="Total payable" value={formatCurrency(p.totalPayable)} />
                  <Stat
                    label="Total interest"
                    value={formatCurrency(p.totalInterest)}
                    tone="warning"
                  />
                  <Stat label="Paid so far" value={formatCurrency(p.amountPaidApprox)} tone="success" />
                  <Stat label="Remaining" value={formatCurrency(p.amountRemainingApprox)} />
                  <Stat label="EMIs left" value={`${p.emisRemaining}`} />
                  <Stat
                    label="Ends on"
                    value={p.endDate ? formatDate(p.endDate) : "—"}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const cls =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
