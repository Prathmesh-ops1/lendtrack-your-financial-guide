import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password — LendTrack" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent! Check your inbox.");
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We've sent a password reset link to <strong>{email}</strong>. Click the link in the
                email to choose a new password.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Didn't get it? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-primary hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send you a secure link to reset it.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-primary shadow-elegant"
                >
                  {submitting ? "Sending link…" : "Send reset link"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
