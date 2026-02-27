import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { rotateBotToken } from "@/lib/bot-registry";

export async function POST() {
  const session = await getAuthSession();
  const email = session?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bot = await rotateBotToken(email);

  if (!bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  return NextResponse.json({ bot });
}
