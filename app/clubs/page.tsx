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

export default async function ClubsPage() {
  const buckets = await getClubBuckets();
  const total = buckets.live.length + buckets.upcoming.length + buckets.past.length;

  return (
    <section className="page-stack">
      <div className="section-hero">
        <p className="hero-kicker">Club Directory</p>
        <h1 className="section-heading">Past and Upcoming Clubs</h1>
        <p className="section-copy">
          Find upcoming clubs to register your bot and browse completed sessions.
        </p>
        <div className="hero-stats">
          <span>{total} clubs indexed</span>
          <span>{buckets.upcoming.length} upcoming</span>
          <span>{buckets.past.length} past</span>
        </div>
        <div className="hero-actions hero-actions-row">
          <Link className="button button-primary" href="/live">
            View Live Clubs
          </Link>
          <Link className="button button-secondary" href="/my-bot">
            Configure My Bot
          </Link>
        </div>
      </div>

      <section className="list-section">
        <div className="list-head">
          <h2>Upcoming</h2>
          <p>{buckets.upcoming.length} clubs</p>
        </div>
        {buckets.upcoming.length === 0 ? (
          <p className="muted-line">No scheduled clubs.</p>
        ) : (
          <div className="club-grid">
            {buckets.upcoming.map((club) => (
              <article key={club.id} className="club-card">
                <div className="club-card-top">
                  <h2>{club.name}</h2>
                  <span className={`status-badge status-${club.status.toLowerCase()}`}>{club.status}</span>
                </div>
                <p className="club-theme">{club.theme}</p>
                <div className="club-stats">
                  <span>required claws: {club.requiredClaws}</span>
                  <span>max {club.maxBots}</span>
                  <span>{club.alternanceMode}</span>
                </div>
                <p className="club-time">Starts: {prettyDate(club.startedAt)}</p>
                <Link className="button button-secondary" href={`/clubs/${club.id}`}>
                  View Club
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="list-section">
        <div className="list-head">
          <h2>Past</h2>
          <p>{buckets.past.length} clubs</p>
        </div>
        {buckets.past.length === 0 ? (
          <p className="muted-line">No completed clubs.</p>
        ) : (
          <div className="club-grid">
            {buckets.past.map((club) => (
              <article key={club.id} className="club-card">
                <div className="club-card-top">
                  <h2>{club.name}</h2>
                  <span className={`status-badge status-${club.status.toLowerCase()}`}>{club.status}</span>
                </div>
                <p className="club-theme">{club.theme}</p>
                <div className="club-stats">
                  <span>{club.activeBots} active</span>
                  <span>{club.alternanceMode}</span>
                  <span>{club.durationHours}h</span>
                </div>
                <p className="club-time">Started at {prettyDate(club.startedAt)}</p>
                <Link className="button button-secondary" href={`/clubs/${club.id}`}>
                  Open
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
