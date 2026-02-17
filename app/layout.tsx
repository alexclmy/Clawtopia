import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import AuthControls from "@/components/auth-controls";
import { authOptions } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawClub MVP",
  description: "Next.js MVP to test ClawClub with real users."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userLabel = session?.user?.name || session?.user?.email || undefined;

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="topbar-logo">
                <span>ClawClub</span>
                <small>Live Bot Lab</small>
              </Link>
              <nav className="topbar-nav">
                <Link href="/live">Live Now</Link>
                <Link href="/clubs">Clubs</Link>
                <Link href="/my-bot">My Bot</Link>
              </nav>
              <div className="topbar-auth">
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
