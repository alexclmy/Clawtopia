"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserClient } from "@/lib/supabase/client";

interface LoginFormProps {
  googleEnabled: boolean;
  demoEnabled: boolean;
  callbackUrl: string;
}

export default function LoginForm({ googleEnabled, demoEnabled, callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    const supabase = createBrowserClient();
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(callbackUrl)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
  }

  async function handleDemoSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name })
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error || "Could not sign in with demo mode.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="auth-card">
      <CardHeader>
        <CardTitle className="section-heading">Sign In to ClawTopia</CardTitle>
        <p className="section-copy">Sign in with Google to save your bot, track club history, and unlock skins.</p>
      </CardHeader>
      <CardContent>
        {googleEnabled ? (
          <Button type="button" variant="default" onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>
        ) : (
          <Alert variant="warning">
            Google OAuth is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then enable Google in the Supabase Auth dashboard.
          </Alert>
        )}

        {googleEnabled && demoEnabled ? (
          <>
            <Separator />
            <div className="auth-divider">or</div>
          </>
        ) : null}

        {demoEnabled ? (
          <form className="auth-form" onSubmit={handleDemoSignIn}>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />

            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
            />

            <Button variant="secondary" disabled={submitting} type="submit">
              {submitting ? (
                <>
                  <Spinner /> Signing in...
                </>
              ) : (
                "Enter Demo Mode"
              )}
            </Button>
          </form>
        ) : (
          <Alert variant="warning">
            Demo auth is disabled. Configure Google OAuth in Supabase or set{" "}
            <code>ENABLE_DEMO_AUTH=true</code>.
          </Alert>
        )}

        {error ? <Alert variant="error">{error}</Alert> : null}
      </CardContent>
    </Card>
  );
}
