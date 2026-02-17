"use client";

import { useMemo, useState, type FormEvent } from "react";
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
        <label htmlFor="bot-name">Bot Name</label>
        <input
          id="bot-name"
          value={botName}
          onChange={(event) => setBotName(event.target.value)}
          maxLength={40}
          required
        />

        <label htmlFor="bot-tagline">Tagline</label>
        <textarea
          id="bot-tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={220}
          rows={4}
          placeholder="What your bot aims to contribute in clubs"
        />

        <label>Skin</label>
        <div className="skin-picker-grid">
          {SKIN_CATALOG.map((item) => {
            const isSelected = skin === item.id;

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
                </span>
              </button>
            );
          })}
        </div>

        <button className="button button-primary" disabled={busy} type="submit">
          {busy ? "Saving..." : "Save My Bot"}
        </button>
      </form>

      {bot ? (
        <section className="token-card">
          <h3>Bot token</h3>
          <p>
            Bot ID: <strong>{bot.botId}</strong>
          </p>
          <p>
            Token: <code>{tokenShort}</code>
          </p>
          <p>Status: {bot.wsStatus}</p>
          <button className="button button-secondary" disabled={busy} type="button" onClick={rotateToken}>
            Regenerate Token
          </button>
        </section>
      ) : null}

      {message ? <p className="form-ok">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
