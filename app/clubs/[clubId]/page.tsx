import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import ClubJoinPanel from "@/components/club-join-panel";
import LiveClubSimulator from "@/components/live-club-simulator";
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

  return (
    <section className="page-stack">
      <div className="section-hero">
        <p className="hero-kicker">Live Club</p>
        <h1 className="section-heading">{club.name}</h1>
        <p className="section-copy">{club.theme}</p>
      </div>
      <ClubJoinPanel
        clubId={club.id}
        requiredClaws={club.requiredClaws}
        hasSession={Boolean(email)}
        hasBot={Boolean(userBot)}
        botName={userBot?.botName}
        botClaws={userBot?.clawsTotal}
        isMember={isMember}
      />
      <LiveClubSimulator club={club} />
    </section>
  );
}
