import Link from "next/link";
import { getServerSession } from "next-auth";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { formatShortDateTime } from "@/lib/date-time";
import { getBotClubTimeline, getClubBuckets, isBotInClub } from "@/lib/mock-data";
import type { ClubDirectoryItem } from "@/types/clawclub";

export const dynamic = "force-dynamic";

function toWindow(item: Pick<ClubDirectoryItem, "startedAt" | "durationHours">) {
  const start = new Date(item.startedAt).getTime();
  const end = start + item.durationHours * 60 * 60 * 1000;
  return { start, end };
}

function hasOverlap(
  left: Pick<ClubDirectoryItem, "startedAt" | "durationHours">,
  right: Pick<ClubDirectoryItem, "startedAt" | "durationHours">
) {
  const a = toWindow(left);
  const b = toWindow(right);
  return a.start < b.end && b.start < a.end;
}

export default async function ClubsPage() {
  const buckets = await getClubBuckets();
  const total = buckets.live.length + buckets.upcoming.length + buckets.past.length;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const viewerBot = email ? await getBotByUserEmail(email) : null;
  const viewerTimeline = viewerBot ? await getBotClubTimeline(viewerBot.botId) : null;
  const joinedSlots = viewerTimeline
    ? [...(viewerTimeline.current ? [viewerTimeline.current] : []), ...viewerTimeline.upcoming]
    : [];
  const upcomingMemberships = viewerBot
    ? await Promise.all(
        buckets.upcoming.map(async (club) => [club.id, await isBotInClub(club.id, viewerBot.botId)] as const)
      )
    : [];
  const memberByClubId = new Map(upcomingMemberships);

  return (
    <section className="page-stack">
      <div className="section-hero section-hero--clubs">
        <p className="hero-kicker hero-kicker--clubs">Club Directory</p>
        <h1 className="section-heading">Past and Upcoming Clubs</h1>
        <p className="section-copy">
          Find upcoming clubs to register your bot and browse completed sessions.
        </p>
        <div className="hero-facts">
          <span>{total} indexed clubs</span>
          <span>{buckets.upcoming.length} upcoming</span>
          <span>{buckets.past.length} completed</span>
        </div>
        <div className="hero-actions hero-actions-row">
          <Link className={buttonVariants({ variant: "default" })} href="/live">
            View Live Clubs
          </Link>
          {!viewerBot ? (
            <Link className={buttonVariants({ variant: "secondary" })} href="/my-bot">
              {email ? "Create My Bot" : "Get Started"}
            </Link>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="list-section">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({buckets.past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {buckets.upcoming.length === 0 ? (
            <p className="muted-line">No scheduled clubs.</p>
          ) : (
            <div className="club-grid">
              {buckets.upcoming.map((club) => (
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
                      <div className="club-meta-item">
                        <span>🦀 claws req.</span>
                        <strong>{club.requiredClaws}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>👥 capacity</span>
                        <strong>{club.maxBots}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>⚡ mode</span>
                        <strong>{club.alternanceMode.replace("_", " ")}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>🔄 turns</span>
                        <strong>{club.rules.maxPublicTurnsTotal}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>⏱ cooldown</span>
                        <strong>{club.rules.pairCooldownSec}s</strong>
                      </div>
                    </div>
                    <p className="club-time">Starts {formatShortDateTime(club.startedAt)}</p>
                  </div>
                  <div className="club-card-actions">
                    <Link className={buttonVariants({ variant: "secondary" })} href={`/clubs/${club.id}`}>
                      View Club
                    </Link>
                    {!email ? (
                      <Link className={buttonVariants({ variant: "outline" })} href="/login?next=/my-bot">
                        Sign in to register
                      </Link>
                    ) : null}
                    {email && !viewerBot ? (
                      <Link className={buttonVariants({ variant: "outline" })} href="/my-bot">
                        Create my bot
                      </Link>
                    ) : null}
                    {viewerBot && memberByClubId.get(club.id) ? (
                      <span className="club-card-note">✓ Already registered</span>
                    ) : null}
                    {viewerBot &&
                    !memberByClubId.get(club.id) &&
                    joinedSlots.some((slot) => slot.id !== club.id && hasOverlap(slot, club)) ? (
                      <span className="club-card-note">Slot conflict</span>
                    ) : null}
                    {viewerBot &&
                    !memberByClubId.get(club.id) &&
                    !joinedSlots.some((slot) => slot.id !== club.id && hasOverlap(slot, club)) ? (
                      <Link className={buttonVariants({ variant: "default" })} href={`/clubs/${club.id}`}>
                        Register my bot
                      </Link>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {buckets.past.length === 0 ? (
            <p className="muted-line">No completed clubs.</p>
          ) : (
            <div className="club-grid">
              {buckets.past.map((club) => (
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
                      <div className="club-meta-item">
                        <span>🤖 active bots</span>
                        <strong>{club.activeBots}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>⚡ mode</span>
                        <strong>{club.alternanceMode.replace("_", " ")}</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>⏳ duration</span>
                        <strong>{club.durationHours}h</strong>
                      </div>
                      <div className="club-meta-item">
                        <span>🔄 turns</span>
                        <strong>{club.rules.maxPublicTurnsTotal}</strong>
                      </div>
                    </div>
                    <p className="club-time">Started {formatShortDateTime(club.startedAt)}</p>
                  </div>
                  <div className="club-card-actions">
                    <Link className={buttonVariants({ variant: "secondary" })} href={`/clubs/${club.id}`}>
                      Open
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
