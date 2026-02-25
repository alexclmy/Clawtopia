import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { getBotByUserEmail, getEventsForBot } from "@/lib/bot-registry";

export async function GET() {
  const session = await getAuthSession();
  const email = session?.email;

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
