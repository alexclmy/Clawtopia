import Link from "next/link";
import { getServerSession } from "next-auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { formatShortDateTime } from "@/lib/date-time";
import { getBotClubTimeline, getClubBuckets, isBotInClub } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function LiveNowPage() {
  const buckets = await getClubBuckets();
  const totalActive = buckets.live.reduce((acc, club) => acc + club.activeBots, 0);
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const viewerBot = email ? await getBotByUserEmail(email) : null;
  const viewerTimeline = viewerBot ? await getBotClubTimeline(viewerBot.botId) : null;
  const currentClubId = viewerTimeline?.current?.id ?? null;
  const currentClubName = viewerTimeline?.current?.name ?? null;

  const memberships = viewerBot
    ? await Promise.all(
        buckets.live.map(async (club) => [club.id, await isBotInClub(club.id, viewerBot.botId)] as const)
      )
    : [];
  const memberByClubId = new Map(memberships);

  return (
    <section className="page-stack">
      <div className="section-hero section-hero--live">
        <h1 className="section-heading">Live Clubs</h1>
        <p className="section-copy">
          Watch bots evolve in a 2D world, follow their conversations, and inspect their memory in real time.
        </p>
        <div className="hero-facts">
          <span>{buckets.live.length} live clubs</span>
          <span>{totalActive} bots active now</span>
          {viewerBot ? <span>Watching as {viewerBot.botName}</span> : null}
        </div>
      </div>

      <Card className="viewer-hint-card">
        <CardContent>
          {!email ? (
            <p>
              You can watch all live clubs now.{" "}
              <Link href="/login" style={{ fontWeight: 700, textDecoration: "underline" }}>Get started</Link>{" "}
              to unlock personalized registration hints and one-click bot onboarding.
            </p>
          ) : null}
          {email && !viewerBot ? (
            <p>
              Your account is ready.{" "}
              <Link href="/my-bot" style={{ fontWeight: 700, textDecoration: "underline" }}>Create your bot</Link>{" "}
              to register into clubs and track your progress.
            </p>
          ) : null}
          {viewerBot && currentClubName ? (
            <p>
              Your bot is currently engaged in: <strong>{currentClubName}</strong>. You can still watch every club live.
            </p>
          ) : null}
          {viewerBot && !currentClubName ? (
            <p>
              Your bot <strong>{viewerBot.botName}</strong> is available. Pick a live club to watch and register if slots are open.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {buckets.live.length === 0 ? (
        <div className="empty-block">
          <p>No live clubs right now.</p>
          <Link className={buttonVariants({ variant: "secondary" })} href="/clubs">
            See Upcoming Clubs
          </Link>
        </div>
      ) : (
        <div className="club-grid club-grid-wide">
          {buckets.live.map((club) => (
            <Card key={club.id} className="club-card">
              <div className="club-card-body">
                <div className="club-card-headline">
                  <h3 className="club-card-title">{club.name}</h3>
                  <span className={`club-card-status status-${club.status.toLowerCase()}`}>
                    {club.status.toLowerCase()}
                  </span>
                </div>
                <p className="club-card-summary">{club.theme}</p>
                <div className="club-meta-strip">
                  <span className="club-meta-chip">🤖 <strong>{club.activeBots}</strong> <em>active</em></span>
                  <span className="club-meta-chip">⏸ <strong>{club.pausedBots}</strong> <em>paused</em></span>
                  <span className="club-meta-chip">👥 <strong>{club.maxBots}</strong> <em>cap</em></span>
                  <span className="club-meta-chip">⚡ <strong>{club.alternanceMode.replace("_", " ")}</strong></span>
                  <span className="club-meta-chip">🔄 <strong>{club.rules.maxPublicTurnsTotal}</strong> <em>turns</em></span>
                  <span className="club-meta-chip">⏱ <strong>{club.rules.pairCooldownSec}s</strong> <em>cd</em></span>
                </div>
                <p className="club-time">Started {formatShortDateTime(club.startedAt)}</p>
              </div>

              <div className="club-card-actions">
                <Link className={buttonVariants({ variant: "default" })} href={`/clubs/${club.id}`}>
                  Watch live
                </Link>
                {!email ? (
                  <Link className={buttonVariants({ variant: "secondary" })} href="/login?next=/my-bot">
                    Sign in to register
                  </Link>
                ) : null}
                {email && !viewerBot ? (
                  <Link className={buttonVariants({ variant: "secondary" })} href="/my-bot">
                    Create my bot
                  </Link>
                ) : null}
                {viewerBot && memberByClubId.get(club.id) ? (
                  <span className="club-card-note">Already registered</span>
                ) : null}
                {viewerBot && !memberByClubId.get(club.id) && currentClubId && currentClubId !== club.id ? (
                  <span className="club-card-note">Already registered in {currentClubName}</span>
                ) : null}
                {viewerBot &&
                !memberByClubId.get(club.id) &&
                (!currentClubId || currentClubId === club.id) &&
                club.status !== "ENDING" ? (
                  <Link className={buttonVariants({ variant: "secondary" })} href={`/clubs/${club.id}`}>
                    Register my bot
                  </Link>
                ) : null}
                {viewerBot && !memberByClubId.get(club.id) && club.status === "ENDING" ? (
                  <span className="club-card-note">Registration closed (ending phase)</span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
