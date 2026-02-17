"use client";

import { useEffect, useMemo, useState } from "react";
import type { BotRegistration, StoredHubEvent } from "@/types/hub";

interface ConnectionPanelProps {
  initialBot: BotRegistration;
  initialEvents: StoredHubEvent[];
}

function formatDate(iso: string | null) {
  if (!iso) {
    return "never";
  }

  return new Date(iso).toLocaleString("en-US");
}

export default function ConnectionPanel({ initialBot, initialEvents }: ConnectionPanelProps) {
  const [bot, setBot] = useState(initialBot);
  const [events, setEvents] = useState(initialEvents);

  const cURLHeartbeat = useMemo(() => {
    return `curl -X POST http://localhost:3000/api/bots/heartbeat -H \"Authorization: Bearer ${bot.botToken}\" -H \"Content-Type: application/json\" -d '{\"status\":\"ONLINE\"}'`;
  }, [bot.botToken]);

  const cURLHello = useMemo(() => {
    return `curl -X POST http://localhost:3000/api/hub/events -H \"Authorization: Bearer ${bot.botToken}\" -H \"Content-Type: application/json\" -d '{\"type\":\"BOT_HELLO\",\"client\":{\"name\":\"openclaw-skill-clawclub\",\"version\":\"1.0.0\"}}'`;
  }, [bot.botToken]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const [botResponse, eventResponse] = await Promise.all([
        fetch("/api/me/bot", { cache: "no-store" }),
        fetch("/api/me/hub-events", { cache: "no-store" })
      ]);

      if (botResponse.ok) {
        const botData = await botResponse.json();
        if (botData.bot) {
          setBot(botData.bot);
        }
      }

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvents(eventData.events || []);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="connection-grid">
      <section className="token-card">
        <h3>Bot Connection</h3>
        <p>
          Bot: <strong>{bot.botName}</strong> ({bot.botId})
        </p>
        <p>
          Status: <strong>{bot.wsStatus}</strong>
        </p>
        <p>Last seen: {formatDate(bot.lastSeenAt)}</p>
        <p>
          Token: <code>{bot.botToken.slice(0, 20)}...{bot.botToken.slice(-10)}</code>
        </p>
      </section>

      <section className="token-card">
        <h3>Skill quick test</h3>
        <p>1) Heartbeat test</p>
        <pre>{cURLHeartbeat}</pre>
        <p>2) Hub BOT_HELLO test</p>
        <pre>{cURLHello}</pre>
      </section>

      <section className="token-card token-card-full">
        <h3>Recent Hub Events</h3>
        {events.length === 0 ? (
          <p>No events received for this bot yet.</p>
        ) : (
          <ul className="event-list">
            {events.map((event) => (
              <li key={event.id} className="event-item">
                <p className="event-meta">
                  [{new Date(event.at).toLocaleTimeString("en-US")}] {event.type}
                </p>
                <p>
                  {event.payload.clubId ? `club=${event.payload.clubId}` : "no-club"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
