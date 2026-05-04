import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ShieldCheck, TrendingUp, Wallet, UserPlus, ListPlus, BellRing, CheckCircle2, AlertTriangle, CreditCard, Sparkles, ArrowRight, Star, Quote } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/landing/Reveal";
import { CountUp } from "@/components/landing/CountUp";
import { EmiCalculator } from "@/components/landing/EmiCalculator";

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-hero">
      {/* Animated background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/30" />
        <div className="animate-blob absolute right-0 top-96 h-80 w-80 rounded-full bg-gold/30" style={{ animationDelay: "3s" }} />
        <div className="animate-blob absolute bottom-40 left-1/3 h-72 w-72 rounded-full bg-primary-glow/25" style={{ animationDelay: "6s" }} />
      </div>
      <div className="relative">
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
        <Reveal>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-card-soft backdrop-blur transition-transform hover:scale-105">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            Smart alerts • Recurring EMI tracking • Shortfall detection
          </div>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Never miss an{" "}
            <span className="text-gradient">EMI</span> again.
          </h1>
        </Reveal>
        <Reveal delay={220}>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            LendTrack is your intelligent debt &amp; liability manager. Track loans, credit cards, and insurance in one place and get alerted before your balance falls short.
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="group bg-gradient-primary shadow-elegant transition-transform hover:scale-105">
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="transition-transform hover:scale-105">I already have an account</Button>
            </Link>
          </div>
        </Reveal>

        {/* Animated stats strip */}
        <Reveal delay={420}>
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-card/70 p-6 shadow-card-soft backdrop-blur sm:grid-cols-4">
            {[
              { v: 12500, suffix: "+", label: "EMIs tracked" },
              { v: 98, suffix: "%", label: "On-time rate" },
              { v: 45, prefix: "₹", suffix: "Cr+", label: "Liabilities managed" },
              { v: 4.9, decimals: 1, suffix: "/5", label: "User rating" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl font-bold text-gradient sm:text-3xl">
                  <CountUp end={s.v} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>

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
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 120}>
              <div className="hover-lift group h-full rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card-soft backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant transition-transform group-hover:scale-110 group-hover:rotate-6">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* EMI Calculator */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Play with the <span className="text-gradient">numbers</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Drag the sliders to instantly see your EMI, total interest, and payable amount.
            </p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <EmiCalculator />
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by mindful borrowers
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Real stories from people who took control of their EMIs.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { name: "Rohan S.", role: "Software Engineer", quote: "I used to forget my credit card due dates every other month. LendTrack's alerts saved me from late fees thrice already." },
            { name: "Priya M.", role: "Marketing Lead", quote: "The shortfall alert is a game-changer. I now plan my salary days around my EMIs, not the other way around." },
            { name: "Arjun K.", role: "Freelancer", quote: "Tracking my home loan progress visually makes me feel in control. Prepayments tracking is just *chef's kiss*." },
          ].map((t, i) => (
            <Reveal key={t.name} delay={i * 120}>
              <div className="hover-lift group h-full rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card-soft backdrop-blur">
                <Quote className="h-6 w-6 text-primary/40" />
                <p className="mt-3 text-sm text-foreground/90">{t.quote}</p>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your finances, <span className="text-gradient">at a glance</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            A clean, focused dashboard that shows what you owe, what's due, and what's at risk.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-elegant backdrop-blur sm:p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Total balance
              </div>
              <p className="mt-2 font-display text-2xl font-bold">₹1,24,500</p>
              <p className="mt-1 text-xs text-success">Sufficient for next 30 days</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" /> Due this month
              </div>
              <p className="mt-2 font-display text-2xl font-bold">₹42,800</p>
              <p className="mt-1 text-xs text-muted-foreground">Across 4 EMIs</p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Next 5 days
              </div>
              <p className="mt-2 font-display text-2xl font-bold">₹18,200</p>
              <p className="mt-1 text-xs text-muted-foreground">2 payments upcoming</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { name: "Home Loan EMI", bank: "HDFC Bank", amount: "₹24,500", due: "Due in 2 days", warn: true },
              { name: "Credit Card", bank: "ICICI Bank", amount: "₹8,200", due: "Due in 4 days", warn: true },
              { name: "Car Loan EMI", bank: "Axis Bank", amount: "₹10,100", due: "Due in 12 days", warn: false },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.bank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{item.amount}</p>
                  <p className={`text-xs ${item.warn ? "text-warning" : "text-muted-foreground"}`}>{item.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Get set up in under 2 minutes — no bank linking required.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: UserPlus, step: "01", title: "Create your account", desc: "Sign up with your email — no credit card, no bank login." },
            { icon: ListPlus, step: "02", title: "Add your liabilities", desc: "Enter your loans, EMIs, credit cards and insurance in seconds." },
            { icon: BellRing, step: "03", title: "Stay ahead with alerts", desc: "Get reminders before each payment and shortfall warnings instantly." },
          ].map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card-soft backdrop-blur"
            >
              <span className="absolute right-5 top-5 font-display text-2xl font-bold text-primary/15">{s.step}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Everything you need to know before you get started.
          </p>
        </div>
        <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card/80 px-5 shadow-card-soft backdrop-blur">
          {[
            { q: "Is LendTrack free to use?", a: "Yes — LendTrack is completely free for personal use. No credit card required to sign up." },
            { q: "Do I need to connect my bank account?", a: "No. LendTrack never connects to your bank. You manually enter your liabilities and balance, keeping full control over your data." },
            { q: "How is my data secured?", a: "Your data is stored securely with bank-grade encryption and protected by row-level security. Only you can access your records." },
            { q: "What types of liabilities can I track?", a: "Home loans, personal loans, car loans, credit cards, insurance premiums, and any recurring EMI or due payment." },
            { q: "Will I get alerts before payments are due?", a: "Yes. LendTrack surfaces every upcoming payment and warns you if your balance won't cover what's due." },
            { q: "Can I delete my account and data anytime?", a: "Absolutely. You can remove your liabilities or delete your account at any time — your data is yours." },
          ].map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/60 last:border-0">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline sm:text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-3xl border border-border/60 bg-gradient-primary p-10 text-center text-primary-foreground shadow-elegant">
          <CheckCircle2 className="mx-auto h-10 w-10 opacity-90" />
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Take control of your EMIs today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm opacity-90 sm:text-base">
            Join LendTrack and never let another payment slip through the cracks.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="shadow-elegant">
                Create free account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/40 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="font-display text-base font-bold">LendTrack</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Intelligent debt &amp; liability manager built for clarity.
              </p>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold">Product</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><Link to="/signup" className="hover:text-foreground">Get started</Link></li>
                <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
                <li><a href="#" className="hover:text-foreground">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold">Company</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
                <li><a href="#" className="hover:text-foreground">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold">Legal</h4>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of service</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} LendTrack. Built for clarity.
          </div>
        </div>
      </footer>
    </div>
  );
}
