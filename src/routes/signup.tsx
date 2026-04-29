import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Create account — LendTrack" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    const pwChecks = [
      { ok: password.length >= 8, msg: "Password must be at least 8 characters." },
      { ok: /[A-Z]/.test(password), msg: "Password must include an uppercase letter (A-Z)." },
      { ok: /[a-z]/.test(password), msg: "Password must include a lowercase letter (a-z)." },
      { ok: /[0-9]/.test(password), msg: "Password must include a digit (0-9)." },
      { ok: /[@$!%*?&#^()_\-+=]/.test(password), msg: "Password must include a special character (@$!%*?&)." },
    ];
    const failed = pwChecks.find((c) => !c.ok);
    if (failed) {
      toast.error(failed.msg);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { first_name: firstName.trim(), last_name: lastName.trim() || null, mobile: mobile.trim() || null },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // Create profile row (works whether session exists or email confirmation required)
    if (data.user) {
      const { error: pErr } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        mobile: mobile.trim() || null,
      });
      if (pErr && !pErr.message.includes("duplicate")) {
        console.warn("Profile insert failed:", pErr.message);
      }
    }
    setSubmitting(false);
    toast.success("Account created! You're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold">LendTrack</span>
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start tracking your liabilities in seconds.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  maxLength={20}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  maxLength={20}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                type="tel"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Min 8 chars, with uppercase, lowercase, number & special character (@$!%*?&).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-primary shadow-elegant"
            >
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
