import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">LendTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-gradient-primary shadow-elegant">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 text-center sm:pt-20">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Smart alerts • Recurring EMI tracking • Shortfall detection
        </div>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Never miss an{" "}
          <span className="text-gradient">EMI</span> again.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          LendTrack is your intelligent debt &amp; liability manager. Track loans, credit cards, and insurance in one place and get alerted before your balance falls short.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg" className="bg-gradient-primary shadow-elegant">Create free account</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">I already have an account</Button>
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-20 grid gap-5 text-left sm:grid-cols-3">
          {[
            {
              icon: Bell,
              title: "Smart reminders",
              desc: "Get notified before every EMI — never miss a due date.",
            },
            {
              icon: TrendingUp,
              title: "Shortfall alerts",
              desc: "Know instantly if your balance won’t cover upcoming payments.",
            },
            {
              icon: ShieldCheck,
              title: "Private & secure",
              desc: "Your financial data stays completely under your control.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card-soft backdrop-blur"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: f.desc }} />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LendTrack. Built for clarity.
      </footer>
    </div>
  );
}
