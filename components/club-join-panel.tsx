"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joined, setJoined] = useState(isMember);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function joinClubNow() {
    setJoining(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/clubs/${clubId}/join`, {
      method: "POST"
    });

    const data = await response.json();
    setJoining(false);

    if (!response.ok) {
      if (data.error === "GATED_INSUFFICIENT_CLAWS") {
        setError(`This club requires ${requiredClaws} claws.`);
        return;
      }

      if (data.error === "CLUB_FULL") {
        setError("This club is full.");
        return;
      }

      setError("Unable to join this club right now.");
      return;
    }

    setJoined(true);
    setMessage("Bot registered in this club.");
    router.refresh();
  }

  async function leaveClubNow() {
    setLeaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch(`/api/clubs/${clubId}/leave`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    setLeaving(false);

    if (!response.ok) {
      setError(data?.error || "Unable to remove this bot.");
      return;
    }

    setJoined(false);
    setMessage("Bot removed from this club.");
    router.refresh();
  }

  return (
    <section className={`join-panel ${joined ? "join-panel--member" : ""}`}>
      <h3>My Bot In This Club</h3>

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

      {hasSession && hasBot && !joined ? (
        <>
          <div className="join-inline-row">
            <p>
              <strong>{botName}</strong> | claws: <strong>{botClaws ?? 0}</strong> | required:{" "}
              <strong>{requiredClaws}</strong>
            </p>
            <div className="join-inline-actions">
              <Button variant="default" type="button" onClick={joinClubNow} disabled={joining}>
                {joining ? "Registering..." : "Register my bot"}
              </Button>
              <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href="/connect-bot">
                Connect Bot
              </Link>
            </div>
          </div>
        </>
      ) : null}

      {hasSession && hasBot && joined ? (
        <>
          <div className="join-inline-row">
            <p>
              <strong>{botName}</strong> registered | claws: <strong>{botClaws ?? 0}</strong>
            </p>
            <span className="status-badge status-running">in club</span>
          </div>
          <details className="join-disclosure">
            <summary>Manage this bot</summary>
            <Separator />
            <div className="join-inline-actions join-inline-actions--details">
              <Button variant="secondary" type="button" onClick={leaveClubNow} disabled={leaving}>
                {leaving ? "Removing..." : "Remove from club"}
              </Button>
              <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href="/connect-bot">
                Connect Bot
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/my-bot">
                My Bot
              </Link>
            </div>
          </details>
        </>
      ) : null}

      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
    </section>
  );
}
