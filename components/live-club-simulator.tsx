"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClubWorldPhaser from "@/components/club-world-phaser";
import type { BotProfile, BotStatus, ChatEvent, Club } from "@/types/clawclub";

type RuntimeBot = Omit<BotProfile, "spawn"> & {
  x: number;
  y: number;
};

const MOVE_EVERY_MS = 1600;
const ENCOUNTER_CHECK_MS = 2200;
const PAIR_COOLDOWN_MS = 12000;
const ENCOUNTER_DISTANCE = 14;
const MAX_EVENTS = 80;
const MAX_HISTORY = 20;

const openers = [
  "I see a clear signal on onboarding,",
  "Your latest point can improve this run,",
  "We can tighten this hypothesis now,"
];

const replies = [
  "agree, we should keep a measurable metric.",
  "good angle, let us test it in the next tick.",
  "yes, this can reduce noise in the discussion."
];

const closers = [
  "I will post a concise summary for spectators.",
  "I will update memory and propose an action.",
  "I will convert this into one explicit experiment."
];

function toRuntimeBot(bot: BotProfile): RuntimeBot {
  return {
    ...bot,
    x: bot.spawn.x,
    y: bot.spawn.y,
    memory: {
      globalSynthesis: [...bot.memory.globalSynthesis],
      pairMemory: { ...bot.memory.pairMemory }
    },
    history: [...bot.history]
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pairKey(botAId: string, botBId: string) {
  return [botAId, botBId].sort().join("::");
}

function distance(a: RuntimeBot, b: RuntimeBot) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function statusLabel(status: BotStatus) {
  if (status === "ACTIVE") {
    return "Active";
  }

  if (status === "PAUSED") {
    return "Paused";
  }

  return "Offline";
}

function refreshBotMemory(bot: RuntimeBot, other: RuntimeBot, note: string): RuntimeBot {
  return {
    ...bot,
    hadExchange: true,
    memory: {
      globalSynthesis: [note, ...bot.memory.globalSynthesis].slice(0, 10),
      pairMemory: {
        ...bot.memory.pairMemory,
        [other.id]: note
      }
    },
    history: [`${nowLabel()} - ${note}`, ...bot.history].slice(0, MAX_HISTORY)
  };
}

function mergeBotsFromSnapshot(previous: RuntimeBot[], snapshotBots: BotProfile[]): RuntimeBot[] {
  if (snapshotBots.length === 0) {
    return previous;
  }

  const previousById = new Map(previous.map((bot) => [bot.id, bot]));

  return snapshotBots.map((snapshot) => {
    const existing = previousById.get(snapshot.id);

    if (!existing) {
      return toRuntimeBot(snapshot);
    }

    return {
      ...existing,
      name: snapshot.name,
      owner: snapshot.owner,
      status: snapshot.status,
      claws: snapshot.claws,
      activeRatio: snapshot.activeRatio,
      hadExchange: snapshot.hadExchange,
      skin: snapshot.skin,
      memory: {
        globalSynthesis: [...snapshot.memory.globalSynthesis],
        pairMemory: { ...snapshot.memory.pairMemory }
      },
      history: [...snapshot.history]
    };
  });
}

interface LiveClubSimulatorProps {
  club: Club;
}

export default function LiveClubSimulator({ club }: LiveClubSimulatorProps) {
  const [bots, setBots] = useState<RuntimeBot[]>(() => club.bots.map(toRuntimeBot));
  const [events, setEvents] = useState<ChatEvent[]>(() => [...club.seedTranscript].reverse());
  const [selectedBotId, setSelectedBotId] = useState<string>(() => club.bots[0]?.id ?? "");
  const [lastEncounter, setLastEncounter] = useState<string>("No encounter yet");
  const cooldownMapRef = useRef<Map<string, number>>(new Map());

  const botMap = useMemo(() => {
    return new Map(bots.map((bot) => [bot.id, bot]));
  }, [bots]);

  const selectedBot = useMemo(() => {
    if (!selectedBotId) {
      return undefined;
    }

    return botMap.get(selectedBotId);
  }, [botMap, selectedBotId]);

  useEffect(() => {
    if (bots.length === 0) {
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

  useEffect(() => {
    let cancelled = false;

    const refreshFromServer = async () => {
      const response = await fetch(`/api/clubs/${club.id}`, { cache: "no-store" }).catch(() => null);

      if (!response || !response.ok) {
        return;
      }

      const data = await response.json().catch(() => null);
      const snapshotBots = (Array.isArray(data?.club?.bots) ? data.club.bots : []) as BotProfile[];

      if (!snapshotBots.length || cancelled) {
        return;
      }

      setBots((previous) => mergeBotsFromSnapshot(previous, snapshotBots));
    };

    void refreshFromServer();
    const timer = window.setInterval(() => {
      void refreshFromServer();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [club.id]);

  const triggerConversation = useCallback((first: RuntimeBot, second: RuntimeBot) => {
    const eventBatch: ChatEvent[] = [
      {
        id: makeId(),
        at: nowLabel(),
        fromBotId: first.id,
        toBotId: second.id,
        text: `${randomPick(openers)} ${second.name}.`
      },
      {
        id: makeId(),
        at: nowLabel(),
        fromBotId: second.id,
        toBotId: first.id,
        text: `${randomPick(replies)} ${first.name}.`
      },
      {
        id: makeId(),
        at: nowLabel(),
        fromBotId: first.id,
        toBotId: second.id,
        text: randomPick(closers)
      }
    ];

    setEvents((previous) => [...eventBatch, ...previous].slice(0, MAX_EVENTS));

    setBots((previous) => {
      return previous.map((bot) => {
        if (bot.id === first.id) {
          return refreshBotMemory(bot, second, `${second.name}: ${eventBatch[2].text}`);
        }

        if (bot.id === second.id) {
          return refreshBotMemory(bot, first, `${first.name}: ${eventBatch[1].text}`);
        }

        return bot;
      });
    });

    setLastEncounter(`${first.name} x ${second.name} @ ${eventBatch[0].at}`);
  }, []);

  useEffect(() => {
    if (club.status !== "RUNNING") {
      return;
    }

    const timer = window.setInterval(() => {
      setBots((previous) => {
        return previous.map((bot) => {
          if (bot.status !== "ACTIVE") {
            return bot;
          }

          const deltaX = Math.floor((Math.random() - 0.5) * 10);
          const deltaY = Math.floor((Math.random() - 0.5) * 10);

          return {
            ...bot,
            x: clamp(bot.x + deltaX, 5, 95),
            y: clamp(bot.y + deltaY, 8, 92)
          };
        });
      });
    }, MOVE_EVERY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [club.status]);

  useEffect(() => {
    if (club.status !== "RUNNING") {
      return;
    }

    const timer = window.setInterval(() => {
      const activeBots = bots.filter((bot) => bot.status === "ACTIVE");

      for (let i = 0; i < activeBots.length; i += 1) {
        for (let j = i + 1; j < activeBots.length; j += 1) {
          const first = activeBots[i];
          const second = activeBots[j];
          const key = pairKey(first.id, second.id);

          if (distance(first, second) > ENCOUNTER_DISTANCE) {
            continue;
          }

          const now = Date.now();
          const lastSeen = cooldownMapRef.current.get(key) ?? 0;

          if (now - lastSeen < PAIR_COOLDOWN_MS) {
            continue;
          }

          cooldownMapRef.current.set(key, now);
          triggerConversation(first, second);
          return;
        }
      }
    }, ENCOUNTER_CHECK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [bots, club.status, triggerConversation]);

  if (bots.length === 0) {
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
          <span className="live-chip">mode: {club.alternanceMode}</span>
          <span className="live-chip">required claws: {club.requiredClaws}</span>
          <span className="live-chip">last encounter: {lastEncounter}</span>
        </div>

        <div className="world-stage">
          <ClubWorldPhaser bots={bots} selectedBotId={selectedBotId} onSelectBot={setSelectedBotId} />
        </div>

        <div className="legend">
          <span>ACTIVE: moves + speaks</span>
          <span>PAUSED: visible but silent</span>
          <span>OFFLINE: disconnected</span>
        </div>

        <div className="event-feed">
          <h3>Public chat</h3>
          <ul className="event-list">
            {events.map((event) => {
              const fromName = botMap.get(event.fromBotId)?.name ?? event.fromBotId;
              const toName = botMap.get(event.toBotId)?.name ?? event.toBotId;

              return (
                <li key={event.id} className="event-item">
                  <p className="event-meta">
                    [{event.at}] {fromName} {"->"} {toName}
                  </p>
                  <p>{event.text}</p>
                </li>
              );
            })}
          </ul>
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
              Owner: {selectedBot.owner} | claws: {selectedBot.claws} | active ratio: {" "}
              {Math.round(selectedBot.activeRatio * 100)}%
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

            <h4>Recent history</h4>
            <ul className="history-list">
              {selectedBot.history.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="bot-panel-empty">Click a bot to view its live memory.</p>
        )}
      </aside>
    </div>
  );
}
