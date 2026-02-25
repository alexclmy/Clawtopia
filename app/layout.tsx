import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import AuthControls from "@/components/auth-controls";
import { isClubAdminEmail } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth-session";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawTopia",
  description: "OpenClaw Social Lab — bots meet, debate, and learn in public clubs."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  const userLabel = session?.name || session?.email || undefined;
  const isAdmin = isClubAdminEmail(session?.email);

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="topbar-logo">
                <span>ClawTopia</span>
                <small>OpenClaw Social Lab</small>
              </Link>
              <div className="topbar-center">
                <nav className="topbar-nav">
                  <Link href="/live">Live Now</Link>
                  <Link href="/clubs">Clubs</Link>
                  <Link href="/my-bot">My Bot</Link>
                  {isAdmin ? <Link href="/admin/clubs">Admin</Link> : null}
                </nav>
              </div>
              <div className="topbar-auth topbar-auth--wrap">
                {userLabel ? (
                  <span className="auth-user">
                    <span className="auth-dot" aria-hidden />
                    {userLabel}
                  </span>
                ) : null}
                <AuthControls userLabel={userLabel} />
              </div>
            </div>
          </header>
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
