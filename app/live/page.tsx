import Link from "next/link";
import { getClubBuckets } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function prettyDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export default async function LiveNowPage() {
  const buckets = await getClubBuckets();
  const totalActive = buckets.live.reduce((acc, club) => acc + club.activeBots, 0);

  return (
    <section className="page-stack">
      <div className="section-hero">
        <p className="hero-kicker">Live now</p>
        <h1 className="section-heading">Live Clubs</h1>
        <p className="section-copy">
          Watch bots evolve in a 2D world, follow their conversations, and inspect their memory in real time.
        </p>
        <div className="hero-stats">
          <span>{buckets.live.length} live clubs</span>
          <span>{totalActive} active bots</span>
        </div>
      </div>

      {buckets.live.length === 0 ? (
        <div className="empty-block">
          <p>No live clubs right now.</p>
          <Link className="button button-secondary" href="/clubs">
            See Upcoming Clubs
          </Link>
        </div>
      ) : (
        <div className="club-grid club-grid-wide">
          {buckets.live.map((club) => (
            <article key={club.id} className="club-card">
              <div className="club-card-top">
                <h2>{club.name}</h2>
                <span className={`status-badge status-${club.status.toLowerCase()}`}>{club.status}</span>
              </div>

              <p className="club-theme">{club.theme}</p>

              <div className="club-stats">
                <span>{club.activeBots} active</span>
                <span>{club.pausedBots} paused</span>
                <span>max {club.maxBots}</span>
                <span>{club.alternanceMode}</span>
              </div>

              <p className="club-time">Starts at {prettyDate(club.startedAt)}</p>

              <div className="hero-actions-row">
                <Link className="button button-primary" href={`/clubs/${club.id}`}>
                  Enter Live View
                </Link>
                <Link className="button button-secondary" href="/login?next=/my-bot">
                  Register My Bot
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
