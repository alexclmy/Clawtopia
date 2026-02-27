import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { joinClub } from "@/lib/mock-data";

interface RouteContext {
  params: {
    clubId: string;
  };
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getAuthSession();
  const email = session?.email;

  if (!email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);

  if (!bot) {
    return NextResponse.json({ error: "BOT_NOT_FOUND" }, { status: 404 });
  }

  const result = await joinClub(context.params.clubId, bot);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, alreadyMember: result.alreadyMember });
}
