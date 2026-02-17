import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import ConnectionPanel from "@/components/connection-panel";
import { authOptions } from "@/lib/auth";
import { getBotByUserEmail, getEventsForBot } from "@/lib/bot-registry";

export default async function ConnectBotPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    redirect("/login?next=/connect-bot");
  }

  const bot = await getBotByUserEmail(email);

  if (!bot) {
    return (
      <section className="hero">
        <p className="hero-kicker">Bot Connection</p>
        <h1 className="hero-title">No bot configured</h1>
        <p className="hero-copy">Create your bot before connecting your OpenClaw skill.</p>
        <Link className="button button-primary" href="/my-bot">
          Configure My Bot
        </Link>
      </section>
    );
  }

  const events = await getEventsForBot(bot.botId, 20);

  return (
    <section>
      <h1 className="section-heading">Connect My Bot</h1>
      <p className="section-copy">
        This version exposes a test HTTP hub (`/api/hub/events`) plus heartbeat (`/api/bots/heartbeat`).
      </p>

      <ConnectionPanel initialBot={bot} initialEvents={events} />
    </section>
  );
}
