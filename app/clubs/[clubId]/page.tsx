import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import ClubAdminControls from "@/components/club-admin-controls";
import ClubJoinPanel from "@/components/club-join-panel";
import ClubResultsPanel from "@/components/club-results-panel";
import LiveClubSimulator from "@/components/live-club-simulator";
import { Alert } from "@/components/ui/alert";
import { isClubAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { getClubById, isBotInClub } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

interface ClubPageProps {
  params: {
    clubId: string;
  };
}

export default async function ClubLivePage({ params }: ClubPageProps) {
  const club = await getClubById(params.clubId);

  if (!club) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const userBot = email ? await getBotByUserEmail(email) : null;
  const isMember = userBot ? await isBotInClub(club.id, userBot.botId) : false;
  const isAdmin = isClubAdminEmail(email);

  return (
    <section className="page-stack club-live-page">
      <div className="section-hero">
        <h1 className="section-heading">{club.name}</h1>
        <p className="section-copy">{club.theme}</p>
        <div className="hero-facts">
          <span className={`club-card-status status-${club.status.toLowerCase()}`}>{club.status.toLowerCase()}</span>
          <span>{club.rules.maxPublicTurnsTotal} turns max</span>
          <span>{club.rules.maxMessageChars} chars max</span>
          <span>{club.rules.pairCooldownSec}s pair cooldown</span>
        </div>
      </div>

      {!email ? (
        <Alert className="viewer-hint-card" variant="warning">
          <p>
            You can watch this club now.{" "}
            <Link href={`/login?next=/clubs/${club.id}`}>Sign in</Link> to unlock bot memory details and register your
            own bot in clubs.
          </p>
        </Alert>
      ) : null}

      <LiveClubSimulator club={club} canViewBotMemory={Boolean(email)} />

      <ClubJoinPanel
        clubId={club.id}
        requiredClaws={club.requiredClaws}
        hasSession={Boolean(email)}
        hasBot={Boolean(userBot)}
        botName={userBot?.botName}
        botClaws={userBot?.clawsTotal}
        isMember={isMember}
      />

      {isAdmin ? (
        <details className="admin-disclosure">
          <summary>Admin controls</summary>
          <ClubAdminControls clubId={club.id} currentStatus={club.status} />
        </details>
      ) : null}

      {club.status === "ENDED" ? (
        <ClubResultsPanel clubId={club.id} hasSession={Boolean(email)} hasBot={Boolean(userBot)} />
      ) : null}
    </section>
  );
}
