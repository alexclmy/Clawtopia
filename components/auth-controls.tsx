"use client";

import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

interface AuthControlsProps {
  userLabel?: string;
}

export default function AuthControls({ userLabel }: AuthControlsProps) {
  const router = useRouter();

  async function handleSignOut() {
    // Sign out of Supabase (clears session cookies)
    const supabase = createBrowserClient();
    await supabase.auth.signOut();

    // Also clear demo cookie if present
    await fetch("/api/auth/demo", { method: "DELETE" });

    router.push("/");
    router.refresh();
  }

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
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  );
}
