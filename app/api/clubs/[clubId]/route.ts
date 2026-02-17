import { NextResponse } from "next/server";
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

  return NextResponse.json({ club });
}
