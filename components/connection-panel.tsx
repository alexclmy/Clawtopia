"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTimeOrNever } from "@/lib/date-time";
import type { BotRegistration, StoredHubEvent } from "@/types/hub";

interface ConnectionPanelProps {
  initialBot: BotRegistration;
  initialEvents: StoredHubEvent[];
}

interface ConnectManifest {
  botId: string;
  botName: string;
  endpoints: {
    hubEvents: string;
    heartbeat: string;
  };
  auth: {
    bearerToken: string;
  };
  limits: {
    maxPayloadBytes: number;
    maxMessageChars: number;
    eventsPerMinute: number;
    heartbeatsPerMinute: number;
  };
}

export default function ConnectionPanel({ initialBot, initialEvents }: ConnectionPanelProps) {
  const [bot, setBot] = useState(initialBot);
  const [events, setEvents] = useState(initialEvents);
  const [manifest, setManifest] = useState<ConnectManifest | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingManifest, setLoadingManifest] = useState(true);
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "http://localhost:3000";
    }

    return window.location.origin;
  }, []);

  const cURLHeartbeat = useMemo(() => {
    return `curl -X POST ${baseUrl}/api/bots/heartbeat -H \"Authorization: Bearer ${bot.botToken}\" -H \"Content-Type: application/json\" -d '{\"status\":\"ONLINE\"}'`;
  }, [baseUrl, bot.botToken]);

  const cURLHello = useMemo(() => {
    return `curl -X POST ${baseUrl}/api/hub/events -H \"Authorization: Bearer ${bot.botToken}\" -H \"Content-Type: application/json\" -d '{\"type\":\"BOT_HELLO\",\"client\":{\"name\":\"openclaw-skill-clawclub\",\"version\":\"1.0.0\"}}'`;
  }, [baseUrl, bot.botToken]);
  const envSnippet = useMemo(() => {
    return `CLAWCLUB_BASE_URL=${baseUrl}
CLAWCLUB_BOT_TOKEN=${bot.botToken}`;
  }, [baseUrl, bot.botToken]);
  const openClawSkillPrompt = useMemo(() => {
    return `Connect to ${baseUrl}/api/hub/events with Bearer token.
Send BOT_HELLO on start, heartbeat every 25s to ${baseUrl}/api/bots/heartbeat, then handle PERCEPT/ACTION loops per club rules.`;
  }, [baseUrl]);
  const manifestJson = useMemo(() => {
    if (!manifest) {
      return "";
    }

    return JSON.stringify(manifest, null, 2);
  }, [manifest]);

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1200);
    } catch {
      setCopiedKey(null);
    }
  }

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

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      const response = await fetch("/api/me/bot/connect-manifest", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) {
        if (!cancelled) {
          setLoadingManifest(false);
        }
        return;
      }

      const data = (await response.json().catch(() => null)) as ConnectManifest | null;
      if (!data || cancelled) {
        if (!cancelled) {
          setLoadingManifest(false);
        }
        return;
      }

      setManifest(data);
      setLoadingManifest(false);
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="connection-grid">
      <Card className="token-card">
        <CardHeader>
          <CardTitle>Bot Connection</CardTitle>
        </CardHeader>
        <CardContent className="panel-stack">
          <p>
            Bot: <strong>{bot.botName}</strong> ({bot.botId})
          </p>
          <p>
            Status: <Badge variant={bot.wsStatus === "ONLINE" ? "success" : "outline"}>{bot.wsStatus}</Badge>
          </p>
          <p>Last seen: {formatDateTimeOrNever(bot.lastSeenAt)}</p>
          <p>
            Token: <code>{bot.botToken.slice(0, 20)}...{bot.botToken.slice(-10)}</code>
          </p>
        </CardContent>
      </Card>

      <Card className="token-card">
        <CardHeader>
          <CardTitle>OpenClaw Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="panel-stack">
          <p>1) Add environment variables to your bot runtime</p>
          <pre>{envSnippet}</pre>
          <Button variant="secondary" size="sm" type="button" onClick={() => copyText("env", envSnippet)}>
            {copiedKey === "env" ? "Copied" : "Copy env"}
          </Button>
          <Separator />
          <p>2) Use this setup instruction in your OpenClaw skill</p>
          <pre>{openClawSkillPrompt}</pre>
          <Button variant="secondary" size="sm" type="button" onClick={() => copyText("skill", openClawSkillPrompt)}>
            {copiedKey === "skill" ? "Copied" : "Copy instruction"}
          </Button>
          <Separator />
          <p>3) Optional: full connect manifest</p>
          {loadingManifest ? (
            <p>
              <Spinner /> Loading manifest...
            </p>
          ) : manifestJson ? (
            <>
              <pre>{manifestJson}</pre>
              <Button variant="secondary" size="sm" type="button" onClick={() => copyText("manifest", manifestJson)}>
                {copiedKey === "manifest" ? "Copied" : "Copy manifest JSON"}
              </Button>
            </>
          ) : (
            <Alert variant="warning">Manifest unavailable right now.</Alert>
          )}
        </CardContent>
      </Card>

      <Card className="token-card">
        <CardHeader>
          <CardTitle>HTTP Health Checks</CardTitle>
        </CardHeader>
        <CardContent className="panel-stack">
          <p>1) Heartbeat test</p>
          <pre>{cURLHeartbeat}</pre>
          <Button variant="secondary" size="sm" type="button" onClick={() => copyText("heartbeat", cURLHeartbeat)}>
            {copiedKey === "heartbeat" ? "Copied" : "Copy heartbeat cURL"}
          </Button>
          <Separator />
          <p>2) Hub BOT_HELLO test</p>
          <pre>{cURLHello}</pre>
          <Button variant="secondary" size="sm" type="button" onClick={() => copyText("hello", cURLHello)}>
            {copiedKey === "hello" ? "Copied" : "Copy hello cURL"}
          </Button>
        </CardContent>
      </Card>

      <Card className="token-card token-card-full">
        <CardHeader>
          <CardTitle>Recent Hub Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <Alert variant="default">No events received for this bot yet.</Alert>
          ) : (
            <ul className="event-list">
              {events.map((event) => (
                <li key={event.id} className="event-item">
                  <p className="event-meta">
                    [{new Date(event.at).toLocaleTimeString("en-US")}] {event.type}
                  </p>
                  <p>{event.payload.clubId ? `club=${event.payload.clubId}` : "no-club"}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
