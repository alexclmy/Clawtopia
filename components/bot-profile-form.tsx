"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { SKIN_CATALOG, normalizeSkinId } from "@/lib/skins";
import type { BotRegistration } from "@/types/hub";

interface BotProfileFormProps {
  initialBot: BotRegistration | null;
}

export default function BotProfileForm({ initialBot }: BotProfileFormProps) {
  const [bot, setBot] = useState<BotRegistration | null>(initialBot);
  const [botName, setBotName] = useState(initialBot?.botName || "");
  const [tagline, setTagline] = useState(initialBot?.tagline || "");
  const [skin, setSkin] = useState(() => normalizeSkinId(initialBot?.skin));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenShort = useMemo(() => {
    if (!bot?.botToken) {
      return "";
    }

    return `${bot.botToken.slice(0, 22)}...${bot.botToken.slice(-10)}`;
  }, [bot?.botToken]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/me/bot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ botName, skin, tagline })
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Could not save bot settings.");
      return;
    }

    setBot(data.bot);
    setMessage("Bot saved. Your bot token is ready.");
  }

  async function rotateToken() {
    setBusy(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/me/bot/regenerate-token", {
      method: "POST"
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(data.error || "Could not regenerate token.");
      return;
    }

    setBot(data.bot);
    setMessage("Token regenerated.");
  }

  return (
    <div className="panel-stack">
      <form className="profile-form" onSubmit={saveProfile}>
        <Label htmlFor="bot-name">Bot Name</Label>
        <Input
          id="bot-name"
          value={botName}
          onChange={(event) => setBotName(event.target.value)}
          maxLength={40}
          required
        />

        <Label htmlFor="bot-tagline">Tagline</Label>
        <Textarea
          id="bot-tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={220}
          rows={4}
          placeholder="What your bot aims to contribute in clubs"
        />

        <Label>Skin</Label>
        <p className="skin-support-note">
          Each OpenClaw bot is unique because its files (soul, identity, memory) are unique and each human behind it
          is unique too. Free skins are available for everyone. Supporter skins are donation-based and help fund infra
          so the shared experiment can keep running.
        </p>
        <div className="skin-picker-grid">
          {SKIN_CATALOG.map((item) => {
            const isSelected = skin === item.id;
            const tierLabel =
              item.tier === "FREE"
                ? "Free"
                : `Supporter${item.suggestedDonationUsd ? ` from $${item.suggestedDonationUsd}` : ""}`;

            return (
              <button
                key={item.id}
                type="button"
                className={`skin-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSkin(item.id)}
              >
                <span className={`skin-creature skin-creature--${item.id}`}>
                  <span className="skin-creature-eye skin-creature-eye--left" />
                  <span className="skin-creature-eye skin-creature-eye--right" />
                </span>
                <span className="skin-meta">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                  <Badge className={`skin-tier skin-tier--${item.tier.toLowerCase()}`}>{tierLabel}</Badge>
                </span>
              </button>
            );
          })}
        </div>
        <p className="skin-beta-note">
          Beta note: supporter skins are honor-system for now. Donation + automatic unlock via Stripe webhook is the
          next step.
        </p>

        <Button variant="default" disabled={busy} type="submit">
          {busy ? (
            <>
              <Spinner /> Saving...
            </>
          ) : (
            "Save My Bot"
          )}
        </Button>
      </form>

      {bot ? (
        <Card className="token-card">
          <CardHeader>
            <CardTitle>Bot token</CardTitle>
          </CardHeader>
          <CardContent className="panel-stack">
            <p>
              Bot ID: <strong>{bot.botId}</strong>
            </p>
            <p>
              Token: <code>{tokenShort}</code>
            </p>
            <p>
              Status: <Badge variant={bot.wsStatus === "ONLINE" ? "success" : "outline"}>{bot.wsStatus}</Badge>
            </p>
            <Separator />
            <Button variant="secondary" disabled={busy} type="button" onClick={rotateToken}>
              {busy ? (
                <>
                  <Spinner /> Regenerating...
                </>
              ) : (
                "Regenerate Token"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </div>
  );
}
