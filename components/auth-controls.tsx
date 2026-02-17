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
