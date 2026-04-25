import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  buildUpcoming,
  formatCurrency,
  formatDate,
  monthKey,
  type RawCard,
  type RawInsurance,
  type RawLoan,
  type UpcomingPayment,
} from "@/lib/finance";
import { playAlertSound } from "@/lib/alertSound";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddLiabilityDialog } from "@/components/AddLiabilityDialog";
import { UpdateBalanceDialog } from "@/components/UpdateBalanceDialog";
import { InsightsPanel } from "@/components/InsightsPanel";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Flame,
  HeartPulse,
  LogOut,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — LendTrack" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loans, setLoans] = useState<RawLoan[]>([]);
  const [cards, setCards] = useState<RawCard[]>([]);
  const [insurance, setInsurance] = useState<RawInsurance[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [firstName, setFirstName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const alertedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [l, c, i, b, p] = await Promise.all([
      supabase
        .from("loans")
        .select("id, bank_name, emi_amount, due_day, last_paid_for_month")
        .order("due_day"),
      supabase
        .from("credit_cards")
        .select("id, bank_name, outstanding_amount, due_day, last_paid_for_month")
        .order("due_day"),
      supabase
        .from("insurance")
        .select("id, insurance_type, premium_amount, due_day, last_paid_for_month")
        .order("due_day"),
      supabase.from("balances").select("amount").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("first_name").eq("user_id", user.id).maybeSingle(),
    ]);
    if (l.data) setLoans(l.data as RawLoan[]);
    if (c.data) setCards(c.data as RawCard[]);
    if (i.data) setInsurance(i.data as RawInsurance[]);
    setBalance(Number(b.data?.amount ?? 0));
    if (p.data?.first_name) setFirstName(p.data.first_name);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const upcoming: UpcomingPayment[] = useMemo(
    () => buildUpcoming(loans, cards, insurance),
    [loans, cards, insurance],
  );

  // Paid items in the current cycle (so we can show them as "Paid ✔")
  const paidThisCycle = useMemo(() => {
    const today = new Date();
    const currentKey = monthKey(today);
    const items: Array<{
      id: string;
      kind: UpcomingPayment["kind"];
      label: string;
      amount: number;
      forMonth: string;
    }> = [];
    for (const l of loans) {
      if (l.last_paid_for_month && l.last_paid_for_month <= currentKey) {
        items.push({ id: l.id, kind: "loan", label: `${l.bank_name} EMI`, amount: Number(l.emi_amount), forMonth: l.last_paid_for_month });
      }
    }
    for (const c of cards) {
      if (c.last_paid_for_month && c.last_paid_for_month <= currentKey) {
        items.push({ id: c.id, kind: "credit_card", label: `${c.bank_name} Credit Card`, amount: Number(c.outstanding_amount), forMonth: c.last_paid_for_month });
      }
    }
    for (const i of insurance) {
      if (i.last_paid_for_month && i.last_paid_for_month <= currentKey) {
        items.push({ id: i.id, kind: "insurance", label: `${i.insurance_type} Insurance`, amount: Number(i.premium_amount), forMonth: i.last_paid_for_month });
      }
    }
    return items;
  }, [loans, cards, insurance]);

  const totalUpcoming = useMemo(
    () => upcoming.reduce((s, p) => s + p.amount, 0),
    [upcoming],
  );

  const dueSoon = useMemo(() => upcoming.filter((p) => p.daysUntil <= 5), [upcoming]);
  const overdue = useMemo(() => upcoming.filter((p) => p.daysUntil < 0), [upcoming]);
  const dueSoonTotal = dueSoon.reduce((s, p) => s + p.amount, 0);
  const shortfall = Math.max(0, totalUpcoming - balance);
  const dueSoonShortfall = Math.max(0, dueSoonTotal - balance);

  function scrollToUpcoming() {
    const el = document.getElementById("upcoming-payments");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Play alert sound once per session if anything is due in <=5 days
  useEffect(() => {
    if (loading || alertedRef.current) return;
    if (dueSoon.length > 0) {
      alertedRef.current = true;
      playAlertSound();
      toast.warning(
        `${dueSoon.length} payment${dueSoon.length === 1 ? "" : "s"} due within 5 days`,
        { description: `Total ${formatCurrency(dueSoonTotal)}` },
      );
    }
  }, [loading, dueSoon.length, dueSoonTotal]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function handleDelete(kind: UpcomingPayment["kind"], id: string) {
    const table = kind === "loan" ? "loans" : kind === "credit_card" ? "credit_cards" : "insurance";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed.");
    loadAll();
  }

  async function handleMarkPaid(p: UpcomingPayment) {
    if (!user) return;
    const table = p.kind === "loan" ? "loans" : p.kind === "credit_card" ? "credit_cards" : "insurance";
    const forMonth = monthKey(p.dueDate);
    const today = new Date().toISOString().slice(0, 10);

    const { error: upErr } = await supabase
      .from(table)
      .update({ last_paid_date: today, last_paid_for_month: forMonth })
      .eq("id", p.id);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }

    const { error: hErr } = await supabase.from("payment_history").insert({
      user_id: user.id,
      liability_kind: p.kind,
      liability_id: p.id,
      label: p.label,
      amount: p.amount,
      paid_date: today,
      for_month: forMonth,
    });
    if (hErr) console.warn("History insert failed:", hErr.message);

    toast.success(`${p.label} marked as paid. Next cycle will appear automatically.`);
    loadAll();
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">LendTrack</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {firstName ? `Welcome, ${firstName}` : "Your dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : "An overview of your liabilities and balance."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-8">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Current balance"
                value={formatCurrency(balance)}
                icon={Wallet}
                tone="primary"
                action={
                  <UpdateBalanceDialog userId={user.id} currentBalance={balance} onSaved={loadAll} />
                }
              />
              <StatCard
                label="Total upcoming payments"
                value={formatCurrency(totalUpcoming)}
                sub={`${upcoming.length} item${upcoming.length === 1 ? "" : "s"} this cycle`}
                icon={Calendar}
                tone="gold"
              />
              <StatCard
                label={shortfall > 0 ? "Potential shortfall" : "All covered"}
                value={shortfall > 0 ? formatCurrency(shortfall) : formatCurrency(0)}
                sub={
                  shortfall > 0
                    ? "Upcoming exceeds balance"
                    : "Balance covers upcoming payments"
                }
                icon={shortfall > 0 ? TrendingDown : Wallet}
                tone={shortfall > 0 ? "destructive" : "success"}
              />
            </div>

            {/* Alerts */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold">Alerts</h2>
              </div>
              <div className="space-y-2">
                {dueSoon.length === 0 && shortfall === 0 && overdue.length === 0 && (
                  <div className="rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground shadow-card-soft">
                    You're all set — no urgent alerts.
                  </div>
                )}

                {overdue.map((p) => (
                  <Alert
                    key={`overdue-${p.id}`}
                    tone="destructive"
                    title={`${p.label} is overdue — ${formatCurrency(p.amount)}`}
                    desc={`Was due on ${formatDate(p.dueDate)}. Mark as paid below to roll to the next cycle.`}
                  />
                ))}

                {dueSoonShortfall > 0 && (
                  <Alert
                    tone="destructive"
                    title="Shortfall in next 5 days"
                    desc={`Payments of ${formatCurrency(dueSoonTotal)} are due within 5 days, but your balance is only ${formatCurrency(balance)}. You're short by ${formatCurrency(dueSoonShortfall)}.`}
                  />
                )}

                {dueSoon
                  .filter((p) => p.daysUntil >= 0)
                  .map((p) => (
                    <Alert
                      key={`reminder-${p.id}`}
                      tone="warning"
                      title={`${p.label} — ${formatCurrency(p.amount)} due ${
                        p.daysUntil === 0
                          ? "today"
                          : p.daysUntil === 1
                            ? "tomorrow"
                            : `in ${p.daysUntil} days`
                      }`}
                      desc={`Due on ${formatDate(p.dueDate)}.`}
                    />
                  ))}

                {dueSoon.length === 0 && shortfall > 0 && (
                  <Alert
                    tone="warning"
                    title="Cycle shortfall"
                    desc={`Your total upcoming liabilities exceed your balance by ${formatCurrency(shortfall)}.`}
                  />
                )}
              </div>
            </section>

            {/* Upcoming list */}
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Upcoming payments</h2>
              <Card className="shadow-card-soft">
                <CardContent className="p-0">
                  {upcoming.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No liabilities tracked yet. Add a loan, credit card, or insurance below.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {upcoming.map((p) => {
                        const isOverdue = p.daysUntil < 0;
                        const isDueSoon = p.daysUntil >= 0 && p.daysUntil <= 5;
                        return (
                          <li
                            key={`${p.kind}-${p.id}`}
                            className="flex flex-wrap items-center justify-between gap-3 p-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <KindIcon kind={p.kind} />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{p.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(p.dueDate)} •{" "}
                                  {isOverdue
                                    ? `overdue by ${Math.abs(p.daysUntil)} day${Math.abs(p.daysUntil) === 1 ? "" : "s"}`
                                    : p.daysUntil === 0
                                      ? "due today"
                                      : p.daysUntil === 1
                                        ? "in 1 day"
                                        : `in ${p.daysUntil} days`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isOverdue && (
                                <Badge variant="secondary" className="bg-destructive/15 text-destructive">
                                  Overdue
                                </Badge>
                              )}
                              {isDueSoon && (
                                <Badge variant="secondary" className="bg-warning/15 text-warning-foreground">
                                  Due soon
                                </Badge>
                              )}
                              <span className="font-semibold tabular-nums">
                                {formatCurrency(p.amount)}
                              </span>
                              {(isOverdue || isDueSoon) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkPaid(p)}
                                  className="gap-1 border-success/40 text-success hover:bg-success/10 hover:text-success"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Mark paid
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(p.kind, p.id)}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Add forms */}
            <section className="grid gap-4 sm:grid-cols-3">
              <ManageCard
                kind="loan"
                title="Loans / EMIs"
                icon={Wallet}
                count={loans.length}
                userId={user.id}
                onSaved={loadAll}
              />
              <ManageCard
                kind="credit_card"
                title="Credit cards"
                icon={CreditCard}
                count={cards.length}
                userId={user.id}
                onSaved={loadAll}
              />
              <ManageCard
                kind="insurance"
                title="Insurance"
                icon={HeartPulse}
                count={insurance.length}
                userId={user.id}
                onSaved={loadAll}
              />
            </section>
          </div>

          {/* Right side: insights */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <InsightsPanel />
          </aside>
        </div>

        <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground">
          LendTrack • Your liabilities, in one place.
        </footer>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "gold" | "destructive" | "success";
  action?: React.ReactNode;
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "gold"
        ? "bg-gold/20 text-gold-foreground"
        : tone === "destructive"
          ? "bg-destructive/10 text-destructive"
          : "bg-success/15 text-success";

  return (
    <Card className="shadow-card-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{sub}</span>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}

function Alert({
  tone,
  title,
  desc,
}: {
  tone: "destructive" | "warning";
  title: string;
  desc: string;
}) {
  const cls =
    tone === "destructive"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : "border-warning/30 bg-warning/5 text-warning-foreground";
  const Icon = tone === "destructive" ? AlertTriangle : Bell;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-card-soft ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-sm">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function KindIcon({ kind }: { kind: UpcomingPayment["kind"] }) {
  const Icon = kind === "loan" ? Wallet : kind === "credit_card" ? CreditCard : HeartPulse;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
  );
}

function ManageCard({
  kind,
  title,
  icon: Icon,
  count,
  userId,
  onSaved,
}: {
  kind: "loan" | "credit_card" | "insurance";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  userId: string;
  onSaved: () => void;
}) {
  return (
    <Card className="shadow-card-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        <AddLiabilityDialog kind={kind} userId={userId} onSaved={onSaved} />
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {count} {count === 1 ? "entry" : "entries"} tracked
        </div>
      </CardContent>
    </Card>
  );
}
