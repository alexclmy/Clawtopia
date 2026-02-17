import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail, getEventsForBot } from "@/lib/bot-registry";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await getBotByUserEmail(email);

  if (!bot) {
    return NextResponse.json({ events: [] });
  }

  const events = await getEventsForBot(bot.botId, 20);
  return NextResponse.json({ events });
}
