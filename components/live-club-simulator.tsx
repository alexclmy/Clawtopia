"use client";

import { useEffect, useMemo, useState } from "react";
import ClubWorld3D from "@/components/club-world-3d";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
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
  canViewBotMemory: boolean;
}

export default function LiveClubSimulator({ club, canViewBotMemory }: LiveClubSimulatorProps) {
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

  const timelineOverview = useMemo(() => {
    return [...interactions].reverse();
  }, [interactions]);

  const recentEvents = useMemo(() => {
    return [...events].slice(-14).reverse();
  }, [events]);

  const lockedPairs = useMemo(() => {
    const locked = bots.filter((bot) => bot.locked).length;
    return Math.floor(locked / 2);
  }, [bots]);

  const activeCount = useMemo(() => bots.filter((bot) => bot.status === "ACTIVE").length, [bots]);
  const pausedCount = useMemo(() => bots.filter((bot) => bot.status === "PAUSED").length, [bots]);

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
        <div className="club-live-head">
          <div>
            <h2>Club Live</h2>
            <p>{clubContext?.objective ?? club.theme}</p>
          </div>
          <div className="live-meta">
            <Badge className="live-chip" variant="outline">{activeCount} active</Badge>
            <Badge className="live-chip" variant="outline">{pausedCount} paused</Badge>
            <Badge className="live-chip" variant="outline">{lockedPairs} pair(s) in discussion</Badge>
            <Badge className="live-chip" variant="outline">mode: {clubContext?.modeLabel ?? "Loading..."}</Badge>
            <Badge className="live-chip" variant="outline">last encounter: {state?.lastEncounter ?? "No encounter yet"}</Badge>
          </div>
        </div>

        <div className="world-stage">
          <ClubWorld3D bots={bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} />
        </div>

        {fetchError ? <Alert variant="error">{fetchError}</Alert> : null}

        <section className="live-timeline-panel">
          <div className="list-head">
            <h3>Live Timeline</h3>
            <p>{interactions.length} encounters</p>
          </div>

          <Accordion>
            <AccordionItem className="timeline-disclosure" defaultOpen>
              <AccordionTrigger>Quick overview</AccordionTrigger>
              <AccordionContent>
                {timelineOverview.length ? (
                  <ol className="interaction-list">
                    {timelineOverview.map((interaction) => (
                      <li key={interaction.id} className="interaction-card">
                        <div className="interaction-head">
                          <strong>
                            {interaction.participants[0].name} x {interaction.participants[1].name}
                          </strong>
                          <span>{formatTimeOrDash(interaction.startedAt)}</span>
                        </div>
                        <p className="interaction-meta">
                          {interaction.contextMode} | {interaction.transcript.length}/{interaction.turnsPlanned} turns
                        </p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted-line">No interactions to display yet.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem className="timeline-disclosure">
              <AccordionTrigger>Deep dive interactions</AccordionTrigger>
              <AccordionContent>
                {timelineOverview.length ? (
                  <ol className="interaction-list">
                    {timelineOverview.map((interaction) => (
                      <li key={interaction.id} className="interaction-card">
                        <InteractionContent interaction={interaction} botMap={botMap} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted-line">Detailed view appears after first encounters.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem className="timeline-disclosure">
              <AccordionTrigger>Club messages</AccordionTrigger>
              <AccordionContent>
                {recentEvents.length ? (
                  <ul className="event-list">
                    {recentEvents.map((event, index) => {
                      const fromName = botMap.get(event.fromBotId)?.name ?? event.fromBotId;
                      const toName = botMap.get(event.toBotId)?.name ?? event.toBotId;

                      return (
                        <li key={event.id} className="event-item">
                          <p className="event-meta">
                            #{recentEvents.length - index} [{event.at}] {fromName} {"->"} {toName}
                          </p>
                          <p>{event.text}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="muted-line">No messages yet.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </section>

      <aside className="bot-panel">
        <div className="bot-panel-head">
          <h3>Bots</h3>
          <p>{bots.length} connected</p>
        </div>
        <div className="bot-tab-list">
          {bots.map((bot) => (
            <button
              key={bot.id}
              type="button"
              className={`bot-tab ${selectedBotId === bot.id ? "is-active" : ""}`}
              onClick={() => setSelectedBotId(bot.id)}
            >
              <span className={`bot-tab-dot bot-tab-dot--${bot.status.toLowerCase()}`} />
              {bot.name}
            </button>
          ))}
        </div>

        {selectedBot ? (
          <>
            <div className="bot-panel-top">
              <h3>{selectedBot.name}</h3>
              <span className={`bot-pill bot-pill--${selectedBot.status.toLowerCase()}`}>
                {statusLabel(selectedBot.status)}
              </span>
            </div>

            <p>Owner: {selectedBot.owner}</p>
            <p>
              Persona: {selectedBot.persona} | state:{" "}
              {motionLabel(
                selectedBot,
                selectedBot.lockedWith ? botMap.get(selectedBot.lockedWith)?.name : undefined
              )}
            </p>
            <p>
              Claws: {selectedBot.claws} | active ratio: {Math.round(selectedBot.activeRatio * 100)}%
            </p>

            {canViewBotMemory ? (
              <Accordion>
                <AccordionItem className="bot-detail" defaultOpen>
                  <AccordionTrigger>Global synthesis</AccordionTrigger>
                  <AccordionContent>
                    <ul className="memory-list">
                      {selectedBot.memory.globalSynthesis.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="bot-detail">
                  <AccordionTrigger>Pair memory</AccordionTrigger>
                  <AccordionContent>
                    <ul className="pair-list">
                      {Object.entries(selectedBot.memory.pairMemory).map(([botId, note]) => (
                        <li key={botId}>
                          <strong>{botMap.get(botId)?.name ?? botId}:</strong> {note}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="bot-detail">
                  <AccordionTrigger>Timeline for this bot</AccordionTrigger>
                  <AccordionContent>
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem className="bot-detail">
                  <AccordionTrigger>Recent history</AccordionTrigger>
                  <AccordionContent>
                    <ul className="history-list">
                      {selectedBot.history.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <Alert className="bot-memory-lock" variant="warning">
                Sign in to unlock bot memory, pair context, and detailed bot timeline.
              </Alert>
            )}
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
