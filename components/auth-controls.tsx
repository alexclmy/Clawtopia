"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { buttonVariants } from "@/components/ui/button";

interface AuthControlsProps {
  userLabel?: string;
}

export default function AuthControls({ userLabel }: AuthControlsProps) {
  if (!userLabel) {
    return (
      <div className="auth-controls">
        <Link className="topbar-cta" href="/login">
          Get Started
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <button
        className={buttonVariants({ variant: "ghost", size: "sm", className: "topbar-action" })}
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
