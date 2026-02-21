import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail } from "@/lib/bot-registry";
import { leaveClub } from "@/lib/mock-data";

interface RouteContext {
  params: {
    clubId: string;
  };
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);
  if (!bot) {
    return NextResponse.json({ error: "BOT_NOT_FOUND" }, { status: 404 });
  }

  const result = await leaveClub(context.params.clubId, bot.botId);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
