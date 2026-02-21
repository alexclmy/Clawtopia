import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isClubAdminEmail } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { getClubById, setClubStatus } from "@/lib/mock-data";
import type { ClubStatus } from "@/types/clawclub";

interface RouteContext {
  params: {
    clubId: string;
  };
}

const allowedStatuses: ClubStatus[] = ["SCHEDULED", "RUNNING", "PAUSED", "ENDING", "ENDED"];

function parseStatus(value: unknown): ClubStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowedStatuses.includes(value as ClubStatus) ? (value as ClubStatus) : null;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!isClubAdminEmail(email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const club = await getClubById(context.params.clubId);
  if (!club) {
    return NextResponse.json({ error: "CLUB_NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const status = parseStatus((body as { status?: unknown } | null)?.status);
  if (!status) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }

  const result = await setClubStatus(club.id, status);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    status
  });
}
