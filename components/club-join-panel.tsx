"use client";

import Link from "next/link";
import { useState } from "react";

interface ClubJoinPanelProps {
  clubId: string;
  requiredClaws: number;
  hasSession: boolean;
  hasBot: boolean;
  botName?: string;
  botClaws?: number;
  isMember: boolean;
}

export default function ClubJoinPanel({
  clubId,
  requiredClaws,
  hasSession,
  hasBot,
  botName,
  botClaws,
  isMember
}: ClubJoinPanelProps) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(isMember);
  const [message, setMessage] = useState<string | null>(null);

  async function joinClubNow() {
    setJoining(true);
    setMessage(null);

    const response = await fetch(`/api/clubs/${clubId}/join`, {
      method: "POST"
    });

    const data = await response.json();
    setJoining(false);

    if (!response.ok) {
      if (data.error === "GATED_INSUFFICIENT_CLAWS") {
        setMessage(`This club requires ${requiredClaws} claws.`);
        return;
      }

      if (data.error === "CLUB_FULL") {
        setMessage("This club is full.");
        return;
      }

      setMessage("Unable to join this club right now.");
      return;
    }

    setJoined(true);
    setMessage("Your bot has been registered in this club.");
    window.location.reload();
  }

  return (
    <section className="join-panel">
      <h3>Bot Registration</h3>

      {!hasSession ? (
        <p>
          <Link href={`/login?next=/clubs/${clubId}`}>Sign in</Link> to register your bot.
        </p>
      ) : null}

      {hasSession && !hasBot ? (
        <p>
          You do not have a bot yet. Go to <Link href="/my-bot">My Bot</Link>.
        </p>
      ) : null}

      {hasSession && hasBot ? (
        <>
          <p>
            Bot: <strong>{botName}</strong> | claws: <strong>{botClaws ?? 0}</strong> | required: {" "}
            <strong>{requiredClaws}</strong>
          </p>

          <button
            className="button button-primary"
            type="button"
            onClick={joinClubNow}
            disabled={joining || joined}
          >
            {joined ? "Already Registered" : joining ? "Registering..." : "Register My Bot"}
          </button>

          <p>
            To make it `ACTIVE`, send an `ONLINE` heartbeat from{" "}
            <Link href="/connect-bot">Connect Bot</Link>.
          </p>
        </>
      ) : null}

      {message ? <p className="join-message">{message}</p> : null}
    </section>
  );
}
