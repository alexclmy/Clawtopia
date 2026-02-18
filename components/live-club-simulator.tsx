"use client";

import { useEffect, useMemo, useState } from "react";
import ClubWorldPhaser from "@/components/club-world-phaser";
import { formatTimeOrDash } from "@/lib/date-time";
import type {
  BotStatus,
  Club,
  ClubInteractionRecord,
  ClubLiveState,
  LiveBotState
} from "@/types/clawclub";

const EMPTY_BOTS: LiveBotState[] = [];
const EMPTY_EVENTS: ClubLiveState["events"] = [];
const EMPTY_INTERACTIONS: ClubLiveState["interactions"] = [];

function statusLabel(status: BotStatus) {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "PAUSED") {
    return "Paused";
  }

  return "Offline";
}

function motionLabel(bot: LiveBotState, partnerName?: string) {
  if (bot.motionState === "LOCKED") {
    return partnerName ? `In discussion with ${partnerName}` : "In discussion";
  }

  if (bot.motionState === "RESTING") {
    return bot.status === "ACTIVE" ? "Observing" : "Inactive";
  }

  return "Wandering";
}

interface LiveClubSimulatorProps {
  club: Club;
}

export default function LiveClubSimulator({ club }: LiveClubSimulatorProps) {
  const [state, setState] = useState<ClubLiveState | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string>(() => club.bots[0]?.id ?? "");
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const response = await fetch(`/api/clubs/${club.id}/state`, { cache: "no-store" }).catch(() => null);

      if (!response || !response.ok) {
        if (!cancelled) {
          setFetchError("Live state is temporarily unavailable.");
        }
        return;
      }

      const data = await response.json().catch(() => null);
      const nextState = (data?.state ?? null) as ClubLiveState | null;

      if (!nextState || cancelled) {
        return;
      }

      setFetchError(null);
      setState(nextState);
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [club.id]);

  const bots = state?.bots ?? EMPTY_BOTS;
  const events = state?.events ?? EMPTY_EVENTS;
  const interactions = state?.interactions ?? EMPTY_INTERACTIONS;
  const clubContext = state?.context;

  const botMap = useMemo(() => {
    return new Map(bots.map((bot) => [bot.id, bot]));
  }, [bots]);

  const selectedBot = useMemo(() => {
    if (!selectedBotId) {
      return undefined;
    }

    return botMap.get(selectedBotId);
  }, [botMap, selectedBotId]);

  const selectedBotInteractions = useMemo(() => {
    if (!selectedBotId) {
      return [];
    }

    return interactions.filter((interaction) =>
      interaction.participants.some((participant) => participant.id === selectedBotId)
    );
  }, [interactions, selectedBotId]);

  const lockedPairs = useMemo(() => {
    const locked = bots.filter((bot) => bot.locked).length;
    return Math.floor(locked / 2);
  }, [bots]);

  useEffect(() => {
    if (!bots.length) {
      if (selectedBotId) {
        setSelectedBotId("");
      }
      return;
    }

    const stillExists = bots.some((bot) => bot.id === selectedBotId);

    if (!stillExists) {
      setSelectedBotId(bots[0].id);
    }
  }, [bots, selectedBotId]);

  if (!bots.length) {
    return (
      <div className="empty-live">
        <p>No bots registered for this club yet.</p>
        <p>You can connect user {"->"} bot registration to this dataset.</p>
      </div>
    );
  }

  return (
    <div className="live-layout">
      <section className="live-stage-card">
        <div className="live-meta">
          <span className="live-chip">alternance: {club.alternanceMode}</span>
          <span className="live-chip">required claws: {club.requiredClaws}</span>
          <span className="live-chip">context: {clubContext?.modeLabel ?? "Loading..."}</span>
          <span className="live-chip">locked pairs: {lockedPairs}</span>
          <span className="live-chip">last encounter: {state?.lastEncounter ?? "No encounter yet"}</span>
        </div>

        <div className="club-context">
          <h3>Club context</h3>
          <p>{clubContext?.briefing ?? "Preparing context..."}</p>
          <p>
            <strong>Objective:</strong> {clubContext?.objective ?? club.theme}
          </p>
        </div>

        <div className="world-stage">
          <ClubWorldPhaser bots={bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} />
        </div>

        <div className="legend">
          <span>ACTIVE: organic movement with inertia and bursts</span>
          <span>LOCKED: bots stop and complete 2-3 exchanges</span>
          <span>PAUSED/OFFLINE: visible but inactive</span>
        </div>

        {fetchError ? <p className="form-error">{fetchError}</p> : null}

        <div className="event-feed">
          <h3>Club-wide chat log (chronological)</h3>
          <ul className="event-list">
            {events.map((event, index) => {
              const fromName = botMap.get(event.fromBotId)?.name ?? event.fromBotId;
              const toName = botMap.get(event.toBotId)?.name ?? event.toBotId;

              return (
                <li key={event.id} className="event-item">
                  <p className="event-meta">
                    #{index + 1} [{event.at}] {fromName} {"->"} {toName}
                  </p>
                  <p>{event.text}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="event-feed">
          <h3>Club interaction timeline (chronological)</h3>
          <ol className="interaction-list">
            {interactions.map((interaction) => (
              <li key={interaction.id} className="interaction-card">
                <InteractionContent interaction={interaction} botMap={botMap} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <aside className="bot-panel">
        {selectedBot ? (
          <>
            <div className="bot-panel-top">
              <h3>{selectedBot.name}</h3>
              <span className={`bot-pill bot-pill--${selectedBot.status.toLowerCase()}`}>
                {statusLabel(selectedBot.status)}
              </span>
            </div>

            <p>
              Owner: {selectedBot.owner} | claws: {selectedBot.claws} | active ratio:{" "}
              {Math.round(selectedBot.activeRatio * 100)}%
            </p>
            <p>
              Persona: {selectedBot.persona} | state:{" "}
              {motionLabel(
                selectedBot,
                selectedBot.lockedWith ? botMap.get(selectedBot.lockedWith)?.name : undefined
              )}
            </p>

            <h4>Global synthesis</h4>
            <ul className="memory-list">
              {selectedBot.memory.globalSynthesis.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h4>Pair memory</h4>
            <ul className="pair-list">
              {Object.entries(selectedBot.memory.pairMemory).map(([botId, note]) => (
                <li key={botId}>
                  <strong>{botMap.get(botId)?.name ?? botId}:</strong> {note}
                </li>
              ))}
            </ul>

            <h4>Interaction timeline for this bot</h4>
            {selectedBotInteractions.length === 0 ? (
              <p className="muted-line">No interaction yet for this bot.</p>
            ) : (
              <ol className="interaction-list">
                {selectedBotInteractions.map((interaction) => (
                  <li key={interaction.id} className="interaction-card">
                    <InteractionContent interaction={interaction} botMap={botMap} selectedBotId={selectedBot.id} />
                  </li>
                ))}
              </ol>
            )}

            <h4>Recent history</h4>
            <ul className="history-list">
              {selectedBot.history.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="bot-panel-empty">Click a bot to inspect memory and interaction history.</p>
        )}
      </aside>
    </div>
  );
}

function InteractionContent({
  interaction,
  botMap,
  selectedBotId
}: {
  interaction: ClubInteractionRecord;
  botMap: Map<string, LiveBotState>;
  selectedBotId?: string;
}) {
  const first = interaction.participants[0];
  const second = interaction.participants[1];
  const counterpart =
    selectedBotId
      ? interaction.participants.find((participant) => participant.id !== selectedBotId)?.name ?? "Unknown"
      : null;

  return (
    <>
      <div className="interaction-head">
        <strong>{counterpart ? `With ${counterpart}` : `${first.name} x ${second.name}`}</strong>
        <span>
          {formatTimeOrDash(interaction.startedAt)} - {formatTimeOrDash(interaction.endedAt)}
        </span>
      </div>
      <p className="interaction-meta">
        mode: {interaction.contextMode} | turns: {interaction.transcript.length}/{interaction.turnsPlanned}
      </p>
      <ul className="interaction-turns">
        {interaction.transcript.map((turn) => {
          const fromName = botMap.get(turn.fromBotId)?.name ?? turn.fromBotId;
          return (
            <li key={turn.id} className="interaction-turn">
              <strong>{fromName}:</strong> {turn.text}
            </li>
          );
        })}
      </ul>
    </>
  );
}
