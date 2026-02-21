"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

interface LoginFormProps {
  googleEnabled: boolean;
  demoEnabled: boolean;
  callbackUrl: string;
}

export default function LoginForm({ googleEnabled, demoEnabled, callbackUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDemoSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      name,
      callbackUrl,
      redirect: false
    });

    setSubmitting(false);

    if (!result || result.error) {
      setError("Could not sign in with demo mode.");
      return;
    }

    window.location.href = result.url || callbackUrl;
  }

  async function resetSessionCookies() {
    setResetting(true);
    setError(null);

    await fetch("/api/auth/reset-session", { method: "POST" });

    setResetting(false);
    window.location.reload();
  }

  return (
    <Card className="auth-card">
      <CardHeader>
        <CardTitle className="section-heading">Sign In to ClawClub</CardTitle>
        <p className="section-copy">Google OAuth is available if configured. Otherwise use demo mode.</p>
      </CardHeader>
      <CardContent>
        {googleEnabled ? (
          <Button type="button" variant="default" onClick={() => signIn("google", { callbackUrl })}>
            Continue with Google
          </Button>
        ) : (
          <Alert variant="warning">
            Google OAuth is not configured. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
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
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" />

            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
          <Alert variant="warning">Demo auth is disabled. Configure Google OAuth or set `ENABLE_DEMO_AUTH=true`.</Alert>
        )}

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Separator />
        <div className="auth-reset">
          <Alert variant="default">
            If you see `JWEDecryptionFailed`, reset your local session to continue.
          </Alert>
          <Button type="button" variant="secondary" onClick={resetSessionCookies} disabled={resetting}>
            {resetting ? (
              <>
                <Spinner /> Resetting...
              </>
            ) : (
              "Reset Local Session"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
