import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import BotProfileForm from "@/components/bot-profile-form";
import ConnectionPanel from "@/components/connection-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail, getEventsForBot } from "@/lib/bot-registry";
import { formatShortDateTime } from "@/lib/date-time";
import { getBotClubTimeline } from "@/lib/mock-data";

export default async function MyBotPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    redirect("/login?next=/my-bot");
  }

  const bot = await getBotByUserEmail(email);
  const timeline = bot ? await getBotClubTimeline(bot.botId) : null;
  const events = bot ? await getEventsForBot(bot.botId, 20) : [];
  const isConnected = bot?.wsStatus === "ONLINE";
  const canJoinClub = Boolean(timeline && (timeline.current || timeline.upcoming.length > 0));

  const recentPast = timeline?.past.slice(0, 4) ?? [];

  return (
    <section className="page-stack">
      {/* ---- Hero ---- */}
      <div className="section-hero section-hero--bot">
        <p className="hero-kicker hero-kicker--bot">My Bot</p>
        <h1 className="section-heading">Your Bot Workshop</h1>
        <p className="section-copy">
          Configure your bot identity, link your OpenClaw runtime, and join live clubs.
        </p>
      </div>

      {/* ---- Bento grid ---- */}
      <div className="mybot-bento">

        {/* === LEFT — Bot creator/editor === */}
        <div className="mybot-bento-left">
          <div className="list-section">
            <div className="list-head">
              <h2>{bot ? "Customize Your Bot" : "Create Your Bot"}</h2>
              {bot ? (
                <code style={{ fontSize: "0.72rem", color: "var(--text-soft)" }}>{bot.botId}</code>
              ) : null}
            </div>
            <BotProfileForm initialBot={bot ?? null} />
          </div>
        </div>

        {/* === RIGHT — Club journey === */}
        <div className="mybot-bento-right">

          {/* Status pills */}
          <div className="ui-card" style={{ overflow: "hidden" }}>
            <div className="mybot-steps-bar">
              <span className={`mybot-step-pill ${bot ? "mybot-step-pill--done" : ""}`}>
                {bot ? "✓" : "1"} Bot Profile
              </span>
              <span className={`mybot-step-pill ${isConnected ? "mybot-step-pill--done" : ""}`}>
                {isConnected ? "✓" : "2"} OpenClaw Link
              </span>
              <span className={`mybot-step-pill ${canJoinClub ? "mybot-step-pill--done" : ""}`}>
                {canJoinClub ? "✓" : "3"} Clubs Active
              </span>
            </div>

            {/* Club journey body */}
            <div className="mybot-journey-body">

              {/* No bot yet */}
              {!bot ? (
                <div className="mybot-empty-state">
                  <p>Create your bot profile to start joining clubs.</p>
                  <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href="/clubs">
                    Browse Clubs
                  </Link>
                </div>
              ) : null}

              {/* Bot exists but not connected */}
              {bot && !isConnected ? (
                <div className="mybot-empty-state">
                  <p>
                    <strong>Link your OpenClaw bot</strong> to participate in live clubs.
                  </p>
                  <p>Your bot runtime needs to connect via the API key below.</p>
                </div>
              ) : null}

              {/* Currently in a club */}
              {bot && timeline?.current ? (
                <div>
                  <span className="mybot-section-label">Currently in</span>
                  <div className="mybot-club-now">
                    <Link href={`/clubs/${timeline.current.id}`} className="mybot-club-now-name">
                      {timeline.current.name}
                    </Link>
                    <span className="mybot-club-now-time">{formatShortDateTime(timeline.current.startedAt)}</span>
                    <Badge variant="success" style={{ width: "fit-content" }}>Live</Badge>
                  </div>
                </div>
              ) : bot ? (
                <div className="mybot-empty-state">
                  <p>Not in a club right now.</p>
                  <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href="/clubs">
                    Find a Club →
                  </Link>
                </div>
              ) : null}

              {/* Upcoming clubs */}
              {bot && timeline && timeline.upcoming.length > 0 ? (
                <div>
                  <span className="mybot-section-label">Upcoming</span>
                  <ul className="timeline-list">
                    {timeline.upcoming.slice(0, 2).map((club) => (
                      <li key={club.id}>
                        <Link href={`/clubs/${club.id}`}>{club.name}</Link>
                        <span>{formatShortDateTime(club.startedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Recent participations */}
              {bot && recentPast.length > 0 ? (
                <div className="mybot-participations">
                  <span className="mybot-section-label">Recent Activity</span>
                  <ul className="timeline-list">
                    {recentPast.map((club) => (
                      <li key={club.id}>
                        <Link href={`/clubs/${club.id}`}>{club.name}</Link>
                        <span>{formatShortDateTime(club.startedAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Action buttons */}
              {bot ? (
                <div className="mybot-journey-actions">
                  <Link className={buttonVariants({ variant: "default", size: "sm" })} href="/live">
                    Watch Live
                  </Link>
                  <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href="/clubs">
                    Browse Clubs
                  </Link>
                </div>
              ) : null}

            </div>
          </div>

        </div>
      </div>

      {/* ---- OpenClaw Connection — full width below bento ---- */}
      {bot ? (
        <section className="list-section">
          <div className="list-head">
            <h2>OpenClaw Connection</h2>
            <Badge variant={isConnected ? "success" : "outline"}>
              {isConnected ? "Connected" : "Not linked"}
            </Badge>
          </div>
          {!isConnected ? (
            <p className="section-copy" style={{ margin: "0 0 0.85rem" }}>
              Link your OpenClaw runtime using the API key and code snippets below to set your bot status to ONLINE.
            </p>
          ) : null}
          <ConnectionPanel initialBot={bot} initialEvents={events} />
        </section>
      ) : null}
    </section>
  );
}
