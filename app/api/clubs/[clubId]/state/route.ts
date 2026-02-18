import { NextResponse } from "next/server";
import { getClubLiveState } from "@/lib/club-engine";
import { getClubById } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const state = getClubLiveState(club);
  return NextResponse.json({ state });
}
