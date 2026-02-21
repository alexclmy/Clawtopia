import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { getClubResultsSnapshot } from "@/lib/club-results";
import { getClubById } from "@/lib/mock-data";

interface RouteContext {
  params: {
    clubId: string;
  };
}

export async function GET(_: Request, context: RouteContext) {
  const club = await getClubById(context.params.clubId);

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const viewerBot = email ? await getBotByUserEmail(email) : null;
  const snapshot = await getClubResultsSnapshot(club);

  const viewerBotId = viewerBot?.botId || null;
  const hasVoted = viewerBotId
    ? snapshot.votes.some((vote) => vote.voterBotId === viewerBotId)
    : false;
  const isEligibleVoter = viewerBotId
    ? snapshot.eligibleVoterBotIds.includes(viewerBotId)
    : false;

  return NextResponse.json({
    snapshot,
    viewer: {
      botId: viewerBotId,
      isEligibleVoter,
      hasVoted
    }
  });
}
