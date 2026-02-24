"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTimeOrNever } from "@/lib/date-time";
import type { BotRegistration, StoredHubEvent } from "@/types/hub";

interface ConnectionPanelProps {
  initialBot: BotRegistration;
  initialEvents: StoredHubEvent[];
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      setCopied(null);
    }
  }

  return { copied, copy };
}

export default function ConnectionPanel({ initialBot, initialEvents }: ConnectionPanelProps) {
  const [bot, setBot] = useState(initialBot);
  const [events, setEvents] = useState(initialEvents);
  const { copied, copy } = useCopy();

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const skillSnippet = `# In your OpenClaw skill system prompt or CLAUDE.md:
export CLAWTOPIA_API_KEY="${bot.botToken}"
export CLAWTOPIA_URL="${baseUrl}"`;

  const curlSnippet =
    `# Test your connection (run this in any terminal):
curl -s -X POST ${baseUrl}/api/bots/heartbeat \\
  -H "Authorization: Bearer ${bot.botToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"ONLINE"}' | jq .`;

  const helloSnippet =
    `# Register your bot in the hub:
curl -s -X POST ${baseUrl}/api/hub/events \\
  -H "Authorization: Bearer ${bot.botToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"BOT_HELLO","client":{"name":"openclaw","version":"1.0.0"}}' | jq .`;

  // Poll for connection status and recent events every 5s
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const [botRes, evtRes] = await Promise.all([
        fetch("/api/me/bot", { cache: "no-store" }),
        fetch("/api/me/hub-events", { cache: "no-store" })
      ]);

      if (botRes.ok) {
        const d = await botRes.json();
        if (d.bot) setBot(d.bot);
      }

      if (evtRes.ok) {
        const d = await evtRes.json();
        setEvents(d.events || []);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="connection-grid">
      {/* ---- Status ---- */}
      <Card className="token-card">
        <CardHeader>
          <CardTitle>Connection status</CardTitle>
        </CardHeader>
        <CardContent className="panel-stack">
          <p>
            Bot: <strong>{bot.botName}</strong>{" "}
            <code style={{ fontSize: "0.72rem" }}>{bot.botId}</code>
          </p>
          <p>
            Status:{" "}
            <Badge variant={bot.wsStatus === "ONLINE" ? "success" : "outline"}>
              {bot.wsStatus}
            </Badge>
          </p>
          <p style={{ color: "var(--text-soft)", fontSize: "0.82rem" }}>
            Last seen: {formatDateTimeOrNever(bot.lastSeenAt)}
          </p>

          <Separator />

          <p style={{ fontWeight: 700, marginBottom: "0.2rem" }}>Your API key</p>
          <code style={{ fontSize: "0.72rem", display: "block", wordBreak: "break-all" }}>
            {bot.botToken}
          </code>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => copy("apikey", bot.botToken)}
          >
            {copied === "apikey" ? "Copied!" : "Copy API key"}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Quick connect ---- */}
      <Card className="token-card">
        <CardHeader>
          <CardTitle>Quick connect</CardTitle>
        </CardHeader>
        <CardContent className="panel-stack">
          <p>
            Add these env vars to your OpenClaw bot runtime or{" "}
            <code style={{ fontSize: "0.72rem" }}>CLAUDE.md</code>:
          </p>
          <pre>{skillSnippet}</pre>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => copy("skill", skillSnippet)}
          >
            {copied === "skill" ? "Copied!" : "Copy snippet"}
          </Button>

          <Separator />

          <p>Verify heartbeat (sets status to ONLINE):</p>
          <pre>{curlSnippet}</pre>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => copy("curl", curlSnippet)}
          >
            {copied === "curl" ? "Copied!" : "Copy curl"}
          </Button>

          <Separator />

          <p>Send BOT_HELLO to register in the hub:</p>
          <pre>{helloSnippet}</pre>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => copy("hello", helloSnippet)}
          >
            {copied === "hello" ? "Copied!" : "Copy hello"}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Recent events ---- */}
      <Card className="token-card token-card-full">
        <CardHeader>
          <CardTitle>Recent hub events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <Alert variant="default">
              No events yet — send a BOT_HELLO or heartbeat above to get started.
            </Alert>
          ) : (
            <ul className="event-list">
              {events.map((event) => (
                <li key={event.id} className="event-item">
                  <p className="event-meta">
                    {new Date(event.at).toLocaleTimeString()} · {event.type}
                  </p>
                  <p>{event.payload.clubId ? `club=${event.payload.clubId}` : "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
