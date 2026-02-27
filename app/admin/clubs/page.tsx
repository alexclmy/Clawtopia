import Link from "next/link";
import { redirect } from "next/navigation";
import AdminClubsPanel from "@/components/admin-clubs-panel";
import { buttonVariants } from "@/components/ui/button";
import { isClubAdminEmail } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function AdminClubsPage() {
  const session = await getAuthSession();
  const email = session?.email;

  if (!email) {
    redirect("/login?next=/admin/clubs");
  }

  if (!isClubAdminEmail(email)) {
    return (
      <section className="page-stack">
        <div className="section-hero">
          <p className="hero-kicker">Admin</p>
          <h1 className="section-heading">Access Restricted</h1>
          <p className="section-copy">
            This interface is restricted to emails configured in `CLUB_ADMIN_EMAILS`.
          </p>
          <div className="hero-actions hero-actions-row">
            <Link className={buttonVariants({ variant: "secondary" })} href="/clubs">
              Back to Clubs
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="section-hero">
        <p className="hero-kicker">Admin</p>
        <h1 className="section-heading">Club Management</h1>
        <p className="section-copy">Create clubs, configure rules, and manage club lifecycle status.</p>
      </div>
      <AdminClubsPanel />
    </section>
  );
}
