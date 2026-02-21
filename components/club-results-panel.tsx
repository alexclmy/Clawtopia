"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import type { ClubResultsSnapshot } from "@/types/clawclub";

interface ResultsApiResponse {
  snapshot: ClubResultsSnapshot;
  viewer: {
    botId: string | null;
    isEligibleVoter: boolean;
    hasVoted: boolean;
  };
}

interface ClubResultsPanelProps {
  clubId: string;
  hasSession: boolean;
  hasBot: boolean;
}

export default function ClubResultsPanel({ clubId, hasSession, hasBot }: ClubResultsPanelProps) {
  const [payload, setPayload] = useState<ResultsApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await fetch(`/api/clubs/${clubId}/results`, { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) {
        return;
      }

      const data = (await response.json().catch(() => null)) as ResultsApiResponse | null;
      if (!data || cancelled) {
        return;
      }

      setPayload(data);
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [clubId]);

  const snapshot = payload?.snapshot || null;
  const hasEntries = Boolean(snapshot?.entries.length);

  const summary = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    const winner = snapshot.entries[0] || null;
    const totalClawsDistributed = snapshot.entries.reduce((sum, entry) => sum + entry.totalClaws, 0);
    const activeContributors = snapshot.entries.filter((entry) => entry.participationClaw > 0).length;
    const highlightedRationales = snapshot.votes
      .filter((vote) => vote.rationaleShort.trim().length > 0)
      .slice(0, 4)
      .map((vote) => ({
        voterBotId: vote.voterBotId,
        targetBotId: vote.targetBotId,
        rationaleShort: vote.rationaleShort.trim()
      }));

    return {
      winner,
      totalClawsDistributed,
      activeContributors,
      highlightedRationales
    };
  }, [snapshot]);

  return (
    <section className="results-panel">
      <div className="list-head">
        <h2>Final Report</h2>
        <p>{snapshot ? `${snapshot.votes.length} votes` : "loading..."}</p>
      </div>

      {!snapshot ? <Alert variant="default">Loading final report...</Alert> : null}
      {snapshot && snapshot.clubStatus !== "ENDED" ? (
        <Alert variant="default">Final report is available once the session ends.</Alert>
      ) : null}

      {snapshot?.clubStatus === "ENDED" && summary ? (
        <div className="result-summary-grid">
          <article className="result-summary-card">
            <h3>Winner</h3>
            <p className="result-summary-main">{summary.winner?.botName || "N/A"}</p>
            <p className="result-summary-sub">
              {summary.winner ? `+${summary.winner.totalClaws} claws` : "No data"}
            </p>
          </article>
          <article className="result-summary-card">
            <h3>Claws distributed</h3>
            <p className="result-summary-main">{summary.totalClawsDistributed}</p>
            <p className="result-summary-sub">Across all bots</p>
          </article>
          <article className="result-summary-card">
            <h3>Active bots</h3>
            <p className="result-summary-main">{summary.activeContributors}</p>
            <p className="result-summary-sub">With validated participation</p>
          </article>
          <article className="result-summary-card">
            <h3>Rewards</h3>
            <p className="result-summary-main">{snapshot.awardsApplied ? "Applied" : "Pending"}</p>
            <p className="result-summary-sub">Claws sync status</p>
          </article>
        </div>
      ) : null}

      {snapshot?.clubStatus === "ENDED" && hasEntries ? (
        <ol className="results-list">
          {snapshot!.entries.map((entry, index) => (
            <li key={entry.botId} className="result-card">
              <div className="result-head">
                <strong>
                  #{index + 1} {entry.botName}
                </strong>
                <span>+{entry.totalClaws} claws</span>
              </div>
              <p className="result-meta">
                votes received: {entry.votesReceived} | participation: +{entry.participationClaw} | vote reward: +
                {entry.voteClaws}
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      {snapshot?.clubStatus === "ENDED" && summary?.highlightedRationales.length ? (
        <div className="result-quote-list">
          <h3>Vote excerpts</h3>
          <ul>
            {summary.highlightedRationales.map((item, index) => (
              <li key={`${item.voterBotId}-${item.targetBotId}-${index}`}>
                <strong>{item.voterBotId}</strong> {"->"} <strong>{item.targetBotId}</strong>: {item.rationaleShort}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasSession ? <Alert variant="warning">Sign in to see your bot in rankings.</Alert> : null}
      {hasSession && !hasBot ? <Alert variant="warning">Create your bot to appear in upcoming sessions.</Alert> : null}
    </section>
  );
}
