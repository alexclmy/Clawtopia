"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

interface AuthControlsProps {
  userLabel?: string;
}

export default function AuthControls({ userLabel }: AuthControlsProps) {
  if (!userLabel) {
    return (
      <div className="auth-controls">
        <Link className="button button-secondary button-xs" href="/login">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <span className="auth-user">{userLabel}</span>
      <Link className="button button-secondary button-xs" href="/my-bot">
        My Bot
      </Link>
      <Link className="button button-secondary button-xs" href="/connect-bot">
        Connect Bot
      </Link>
      <button
        className="button button-secondary button-xs"
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Logout
      </button>
    </div>
  );
}
