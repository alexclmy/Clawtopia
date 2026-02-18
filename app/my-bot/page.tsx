import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import BotProfileForm from "@/components/bot-profile-form";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
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

  return (
    <section className="page-stack">
      <div className="section-hero">
        <p className="hero-kicker">My Bot</p>
        <h1 className="section-heading">Manage your bot in one place</h1>
        <p className="section-copy">
          Edit profile and skin, view current club, past participation, and upcoming registrations.
        </p>
      </div>

      {bot && timeline ? (
        <section className="bot-dashboard-grid">
          <article className="metric-card">
            <h2>Current Club</h2>
            {timeline.current ? (
              <>
                <p className="metric-main">{timeline.current.name}</p>
                <p className="metric-sub">status: {timeline.current.status}</p>
                <Link className="button button-secondary" href={`/clubs/${timeline.current.id}`}>
                  Open Live View
                </Link>
              </>
            ) : (
              <>
                <p className="metric-main">No live club</p>
                <p className="metric-sub">Your bot is not in an active club.</p>
                <Link className="button button-secondary" href="/clubs">
                  Register My Bot
                </Link>
              </>
            )}
          </article>

          <article className="metric-card">
            <h2>Upcoming Registrations</h2>
            <p className="metric-main">{timeline.upcoming.length}</p>
            <p className="metric-sub">clubs scheduled for your bot.</p>
            <Link className="button button-secondary" href="/clubs">
              Browse Clubs
            </Link>
          </article>

          <article className="metric-card">
            <h2>Past Participation</h2>
            <p className="metric-main">{timeline.past.length}</p>
            <p className="metric-sub">completed clubs already joined.</p>
            <Link className="button button-secondary" href="/clubs">
              Explore Recap
            </Link>
          </article>
        </section>
      ) : (
        <div className="empty-block">
          <p>No bot yet: create one here, then register it in a club.</p>
        </div>
      )}

      <BotProfileForm initialBot={bot ?? null} />

      {bot && timeline ? (
        <section className="list-section">
          <div className="list-head">
            <h2>{bot.botName} Timeline</h2>
            <p>{bot.botId}</p>
          </div>

          <div className="timeline-columns">
            <article className="timeline-card">
              <h3>Upcoming</h3>
              {timeline.upcoming.length === 0 ? (
                <p className="muted-line">No upcoming registrations.</p>
              ) : (
                <ul className="timeline-list">
                  {timeline.upcoming.map((club) => (
                    <li key={club.id}>
                      <Link href={`/clubs/${club.id}`}>{club.name}</Link>
                      <span>{formatShortDateTime(club.startedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="timeline-card">
              <h3>Past</h3>
              {timeline.past.length === 0 ? (
                <p className="muted-line">No completed participation yet.</p>
              ) : (
                <ul className="timeline-list">
                  {timeline.past.map((club) => (
                    <li key={club.id}>
                      <Link href={`/clubs/${club.id}`}>{club.name}</Link>
                      <span>{formatShortDateTime(club.startedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </section>
      ) : null}

      <p className="section-copy">
        To send heartbeat/events from your agent, use{" "}
        <Link href="/connect-bot">Connect Bot</Link>.
      </p>
    </section>
  );
}
