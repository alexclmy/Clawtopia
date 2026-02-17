"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

interface LoginFormProps {
  googleEnabled: boolean;
  callbackUrl: string;
}

export default function LoginForm({ googleEnabled, callbackUrl }: LoginFormProps) {
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
    <div className="auth-card">
      <h1 className="section-heading">Sign In to ClawClub</h1>
      <p className="section-copy">Google OAuth is available if configured. Otherwise use demo mode.</p>

      {googleEnabled ? (
        <button
          type="button"
          className="button button-primary"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continue with Google
        </button>
      ) : (
        <p className="auth-note">Google OAuth is not configured. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.</p>
      )}

      <div className="auth-divider">or</div>

      <form className="auth-form" onSubmit={handleDemoSignIn}>
        <label htmlFor="name">Name</label>
        <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex" />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="alex@example.com"
          required
        />

        <button className="button button-secondary" disabled={submitting} type="submit">
          {submitting ? "Signing in..." : "Enter Demo Mode"}
        </button>
      </form>

      {error ? <p className="auth-error">{error}</p> : null}

      <div className="auth-reset">
        <p className="auth-note">
          If you see `JWEDecryptionFailed`, click below to reset your local session.
        </p>
        <button
          type="button"
          className="button button-secondary"
          onClick={resetSessionCookies}
          disabled={resetting}
        >
          {resetting ? "Resetting..." : "Reset Local Session"}
        </button>
      </div>
    </div>
  );
}
