import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import path from "path";
import type {
  BotPersona,
  BotStatus,
  ChatEvent,
  Club,
  ClubContextState,
  ClubInteractionRecord,
  ClubLiveState,
  LiveBotState
} from "@/types/clawclub";

interface EngineBot extends LiveBotState {
  directionX: number;
  directionY: number;
  inertiaTicks: number;
  strideBias: number;
  turnBias: number;
  burstBias: number;
  pauseBias: number;
}

interface ActiveSession {
  id: string;
  pairKey: string;
  botAId: string;
  botBId: string;
  turnsPlanned: number;
  turnsDone: number;
  nextTurnAtMs: number;
}

interface EngineState {
  clubId: string;
  context: ClubContextState;
  bots: EngineBot[];
  events: ChatEvent[];
  interactions: ClubInteractionRecord[];
  lastEncounter: string;
  cooldownByPair: Map<string, number>;
  sessions: Map<string, ActiveSession>;
  lastAdvancedAtMs: number;
  movementRemainderMs: number;
  encounterRemainderMs: number;
  lastPersistedAtMs: number;
}

interface PersistedEngineState {
  context: ClubContextState;
  bots: EngineBot[];
  events: ChatEvent[];
  interactions: ClubInteractionRecord[];
  lastEncounter: string;
  cooldownByPairEntries: Array<[string, number]>;
  sessions: ActiveSession[];
  lastAdvancedAtMs: number;
  movementRemainderMs: number;
  encounterRemainderMs: number;
  lastPersistedAtMs: number;
}

interface EngineSnapshotEvent {
  id: string;
  type: "SNAPSHOT";
  clubId: string;
  at: string;
  state: PersistedEngineState;
}

const MOVE_TICK_MS = 700;
const ENCOUNTER_CHECK_MS = 900;
const PAIR_COOLDOWN_MS = 14000;
const ENCOUNTER_DISTANCE = 10.5;
const DIALOG_TURN_BASE_MS = 1050;
const DIALOG_TURN_JITTER_MS = 350;
const MAX_EVENTS = 120;
const MAX_HISTORY = 26;
const MAX_INTERACTIONS = 60;
const BASE_STEP_UNITS = 1.8;
const MAX_TICKS_PER_ADVANCE = 240;
const PERSIST_EVERY_MS = 3000;
const COMPACT_MIN_INTERVAL_MS = 45000;
const COMPACT_MAX_SIZE_BYTES = 2_000_000;
const COMPACT_KEEP_LINES = 260;

const DATA_DIR = path.join(process.cwd(), "data");
const ENGINE_LOG_DIR = path.join(DATA_DIR, "club-engine");

const PERSONA_STYLE: Record<
  BotPersona,
  {
    opener: string[];
    response: string[];
    closer: string[];
  }
> = {
  ANALYST: {
    opener: [
      "Let me ground this in observable signals.",
      "I want to start from verifiable evidence.",
      "Before we decide, let's anchor on measurable outcomes."
    ],
    response: [
      "That tracks if we can measure impact quickly.",
      "I see your point, but we need one hard metric.",
      "Good argument, let's keep the test condition explicit."
    ],
    closer: [
      "I will keep one metric and one next action in memory.",
      "I lock this as a testable hypothesis for the club.",
      "I summarize this as a concrete experiment."
    ]
  },
  DIPLOMAT: {
    opener: [
      "I want us to align before we optimize.",
      "Let me connect our viewpoints first.",
      "I can bridge our perspectives to reduce friction."
    ],
    response: [
      "This helps us converge without losing nuance.",
      "I hear you, we can merge both directions.",
      "This is compatible with your previous argument."
    ],
    closer: [
      "I store this as a shared midpoint for future turns.",
      "I keep this as a consensus anchor in memory.",
      "I will preserve this compromise for the next encounter."
    ]
  },
  CHALLENGER: {
    opener: [
      "I will stress-test this idea before we adopt it.",
      "Let's challenge assumptions first.",
      "I see a weak spot we should confront directly."
    ],
    response: [
      "Counterpoint: this fails if constraints tighten.",
      "I disagree on scope; we need a sharper boundary.",
      "Good, but the causal chain is still fragile."
    ],
    closer: [
      "I store the strongest objection and how we resolved it.",
      "I will keep this as a bounded decision, not a blanket rule.",
      "I track this as a risk with mitigation."
    ]
  },
  BUILDER: {
    opener: [
      "I prefer turning this into an executable next step.",
      "Let's convert this discussion into a build plan.",
      "I can map this directly to implementation."
    ],
    response: [
      "This is actionable with a small iteration loop.",
      "We can ship this if we reduce one dependency.",
      "I can implement this with a clear fallback."
    ],
    closer: [
      "I store this as a short build checklist.",
      "I keep this as implementation-ready guidance.",
      "I summarize this into a shippable scope."
    ]
  },
  EXPLORER: {
    opener: [
      "I want to open one more angle before we settle.",
      "Let's probe adjacent possibilities quickly.",
      "I can widen the option space with a concrete variant."
    ],
    response: [
      "Interesting, that unlocks another direction.",
      "I can combine this with an alternative path.",
      "This broadens the search without losing focus."
    ],
    closer: [
      "I store this as the most promising branch to revisit.",
      "I keep this in memory as a high-upside option.",
      "I summarize this as a viable exploration path."
    ]
  }
};

const DIRECTIONS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 0.72, y: 0.72 },
  { x: -0.72, y: 0.72 },
  { x: 0.72, y: -0.72 },
  { x: -0.72, y: -0.72 }
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pairKey(botAId: string, botBId: string) {
  return [botAId, botBId].sort().join("::");
}

function randomDirection(previousX: number, previousY: number) {
  const possible = DIRECTIONS.filter((dir) => !(dir.x === -previousX && dir.y === -previousY));
  return randomPick(possible.length ? possible : DIRECTIONS);
}

function chooseStepSize(burstBias: number) {
  const roll = Math.random();
  const sprintChance = 0.02 + burstBias * 0.08;
  const strideChance = 0.22 + burstBias * 0.24;

  if (roll < sprintChance) {
    return 3;
  }

  if (roll < sprintChance + strideChance) {
    return 2;
  }

  return 1;
}

function derivePersona(seed: number): BotPersona {
  const personas: BotPersona[] = ["ANALYST", "DIPLOMAT", "CHALLENGER", "BUILDER", "EXPLORER"];
  return personas[seed % personas.length];
}

function deriveClubContext(club: Club): ClubContextState {
  const lowered = club.theme.toLowerCase();

  if (lowered.includes("debate") || lowered.includes("consensus") || lowered.includes("converge")) {
    return {
      mode: "DEBATE",
      modeLabel: "Debate Arena",
      objective: club.theme,
      briefing:
        "Bots are expected to disagree constructively, test arguments, and converge on stronger positions."
    };
  }

  if (
    lowered.includes("design") ||
    lowered.includes("score") ||
    lowered.includes("product") ||
    lowered.includes("workflow")
  ) {
    return {
      mode: "BRAINSTORM",
      modeLabel: "Design Workshop",
      objective: club.theme,
      briefing:
        "Bots are expected to propose concrete ideas, evaluate tradeoffs, and keep a bias toward action."
    };
  }

  return {
    mode: "SOCIAL",
    modeLabel: "Open Social Club",
    objective: club.theme,
    briefing:
      "Bots can explore freely, discover compatible viewpoints, and build social memory through repeated encounters."
  };
}

function trimSentence(text: string, max = 120) {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1)}...`;
}

function formatClockLabel(dateMs: number) {
  return new Date(dateMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function toLogPath(clubId: string) {
  return path.join(ENGINE_LOG_DIR, `${clubId}.jsonl`);
}

function ensureEngineLogDir() {
  mkdirSync(ENGINE_LOG_DIR, { recursive: true });
}

function serializeState(state: EngineState): PersistedEngineState {
  return {
    context: state.context,
    bots: state.bots,
    events: state.events,
    interactions: state.interactions,
    lastEncounter: state.lastEncounter,
    cooldownByPairEntries: Array.from(state.cooldownByPair.entries()),
    sessions: Array.from(state.sessions.values()),
    lastAdvancedAtMs: state.lastAdvancedAtMs,
    movementRemainderMs: state.movementRemainderMs,
    encounterRemainderMs: state.encounterRemainderMs,
    lastPersistedAtMs: state.lastPersistedAtMs
  };
}

function parseSnapshotEvent(value: unknown): EngineSnapshotEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<EngineSnapshotEvent>;

  if (entry.type !== "SNAPSHOT" || typeof entry.clubId !== "string" || !entry.state) {
    return null;
  }

  return entry as EngineSnapshotEvent;
}

function loadLatestPersistedState(clubId: string): PersistedEngineState | null {
  try {
    const logPath = toLogPath(clubId);

    if (!existsSync(logPath)) {
      return null;
    }

    const raw = readFileSync(logPath, "utf-8").trim();

    if (!raw) {
      return null;
    }

    const lines = raw.split("\n");

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i].trim();

      if (!line) {
        continue;
      }

      const parsed = JSON.parse(line) as unknown;
      const snapshot = parseSnapshotEvent(parsed);

      if (!snapshot || snapshot.clubId !== clubId) {
        continue;
      }

      return snapshot.state;
    }
  } catch {
    return null;
  }

  return null;
}

const lastCompactByClub = new Map<string, number>();

function maybeCompactLog(clubId: string, nowMs: number) {
  const lastCompactAt = lastCompactByClub.get(clubId) ?? 0;

  if (nowMs - lastCompactAt < COMPACT_MIN_INTERVAL_MS) {
    return;
  }

  lastCompactByClub.set(clubId, nowMs);

  try {
    const logPath = toLogPath(clubId);

    if (!existsSync(logPath)) {
      return;
    }

    const stats = statSync(logPath);

    if (stats.size < COMPACT_MAX_SIZE_BYTES) {
      return;
    }

    const lines = readFileSync(logPath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const compacted = lines.slice(-COMPACT_KEEP_LINES);
    writeFileSync(logPath, compacted.join("\n") + "\n", "utf-8");
  } catch {
    // Ignore compaction failures to keep the engine running.
  }
}

function toEngineBot(bot: Club["bots"][number]): EngineBot {
  const seed = hashString(bot.id);
  const initialDirection = randomDirection(0, 0);
  const status: BotStatus = bot.status;

  return {
    ...bot,
    x: bot.spawn.x,
    y: bot.spawn.y,
    locked: false,
    lockedWith: null,
    persona: derivePersona(seed),
    motionState: status === "ACTIVE" ? "WANDERING" : "RESTING",
    directionX: initialDirection.x,
    directionY: initialDirection.y,
    inertiaTicks: 2 + (seed % 4),
    strideBias: 0.85 + ((seed % 100) / 100) * 0.45,
    turnBias: 0.12 + (((seed >> 7) % 100) / 100) * 0.2,
    burstBias: 0.05 + (((seed >> 13) % 100) / 100) * 0.2,
    pauseBias: 0.04 + (((seed >> 17) % 100) / 100) * 0.16
  };
}

function turnText(
  speaker: EngineBot,
  listener: EngineBot,
  context: ClubContextState,
  turnIndex: number,
  turnsPlanned: number
) {
  const style = PERSONA_STYLE[speaker.persona];
  const pairMemory = speaker.memory.pairMemory[listener.id];
  const globalHint = speaker.memory.globalSynthesis[0];

  if (turnIndex === 0) {
    return `${randomPick(style.opener)} In this ${context.modeLabel.toLowerCase()}, ${trimSentence(
      context.objective.toLowerCase(),
      72
    )} ${listener.name}, what matters most from your angle?`;
  }

  if (turnIndex === turnsPlanned - 1) {
    return `${randomPick(style.closer)} ${
      globalHint ? `Current anchor: ${trimSentence(globalHint, 78)}` : "I keep this concise for the public log."
    }`;
  }

  if (pairMemory) {
    return `${randomPick(style.response)} Last time with ${listener.name}: ${trimSentence(pairMemory, 80)}`;
  }

  return `${randomPick(style.response)} ${listener.name}, should we optimize for speed or robustness here?`;
}

function withMemoryUpdate(bot: EngineBot, other: EngineBot, context: ClubContextState, text: string): EngineBot {
  const pairNote = `[${context.mode}] ${trimSentence(text, 110)}`;
  const synthesis = `[${context.mode}] ${other.name}: ${trimSentence(text, 96)}`;
  const historyLine = `${formatClockLabel(Date.now())} - ${other.name}: ${trimSentence(text, 124)}`;

  return {
    ...bot,
    hadExchange: true,
    memory: {
      globalSynthesis: [synthesis, ...bot.memory.globalSynthesis.filter((line) => line !== synthesis)].slice(0, 10),
      pairMemory: {
        ...bot.memory.pairMemory,
        [other.id]: pairNote
      }
    },
    history: [...bot.history, historyLine].slice(-MAX_HISTORY)
  };
}

function distance(a: EngineBot, b: EngineBot) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function createInitialState(club: Club): EngineState {
  const now = Date.now();

  return {
    clubId: club.id,
    context: deriveClubContext(club),
    bots: club.bots.map(toEngineBot),
    events: [...club.seedTranscript].slice(-MAX_EVENTS),
    interactions: [],
    lastEncounter: "No encounter yet",
    cooldownByPair: new Map(),
    sessions: new Map(),
    lastAdvancedAtMs: now,
    movementRemainderMs: 0,
    encounterRemainderMs: 0,
    lastPersistedAtMs: 0
  };
}

function createStateFromPersisted(club: Club, persisted: PersistedEngineState): EngineState {
  const persistedById = new Map((persisted.bots || []).map((bot) => [bot.id, bot]));
  const bots: EngineBot[] = club.bots.map((clubBot) => {
    const restored = persistedById.get(clubBot.id);

    if (!restored) {
      return toEngineBot(clubBot);
    }

    return {
      ...restored,
      id: clubBot.id,
      name: clubBot.name,
      owner: clubBot.owner,
      status: clubBot.status,
      claws: clubBot.claws,
      activeRatio: clubBot.activeRatio,
      skin: clubBot.skin,
      hadExchange: clubBot.hadExchange || restored.hadExchange,
      memory: restored.memory || clubBot.memory,
      history: restored.history || clubBot.history
    };
  });

  const validBotIds = new Set(bots.map((bot) => bot.id));
  const sessions = new Map(
    (persisted.sessions || [])
      .filter((session) => validBotIds.has(session.botAId) && validBotIds.has(session.botBId))
      .map((session) => [session.id, session])
  );

  return {
    clubId: club.id,
    context: persisted.context || deriveClubContext(club),
    bots,
    events: Array.isArray(persisted.events) ? persisted.events.slice(-MAX_EVENTS) : [],
    interactions: Array.isArray(persisted.interactions)
      ? persisted.interactions.slice(-MAX_INTERACTIONS)
      : [],
    lastEncounter: persisted.lastEncounter || "No encounter yet",
    cooldownByPair: new Map(Array.isArray(persisted.cooldownByPairEntries) ? persisted.cooldownByPairEntries : []),
    sessions,
    lastAdvancedAtMs:
      typeof persisted.lastAdvancedAtMs === "number" ? persisted.lastAdvancedAtMs : Date.now(),
    movementRemainderMs:
      typeof persisted.movementRemainderMs === "number" ? persisted.movementRemainderMs : 0,
    encounterRemainderMs:
      typeof persisted.encounterRemainderMs === "number" ? persisted.encounterRemainderMs : 0,
    lastPersistedAtMs:
      typeof persisted.lastPersistedAtMs === "number" ? persisted.lastPersistedAtMs : 0
  };
}

function syncBotsFromClub(state: EngineState, club: Club) {
  state.context = deriveClubContext(club);
  const previousById = new Map(state.bots.map((bot) => [bot.id, bot]));
  const nextBots: EngineBot[] = [];

  for (const clubBot of club.bots) {
    const existing = previousById.get(clubBot.id);

    if (!existing) {
      nextBots.push(toEngineBot(clubBot));
      continue;
    }

    const status = clubBot.status;
    const isLocked = existing.locked;
    const nextMotion =
      status === "ACTIVE"
        ? isLocked
          ? "LOCKED"
          : existing.motionState === "RESTING"
            ? "WANDERING"
            : existing.motionState
        : "RESTING";

    nextBots.push({
      ...existing,
      name: clubBot.name,
      owner: clubBot.owner,
      status,
      claws: clubBot.claws,
      activeRatio: clubBot.activeRatio,
      skin: clubBot.skin,
      hadExchange: clubBot.hadExchange || existing.hadExchange,
      motionState: nextMotion,
      locked: status === "ACTIVE" ? existing.locked : false,
      lockedWith: status === "ACTIVE" ? existing.lockedWith : null
    });
  }

  state.bots = nextBots;
}

function getById(state: EngineState, botId: string) {
  return state.bots.find((bot) => bot.id === botId);
}

function updateBot(state: EngineState, botId: string, updater: (bot: EngineBot) => EngineBot) {
  const index = state.bots.findIndex((bot) => bot.id === botId);

  if (index < 0) {
    return;
  }

  state.bots[index] = updater(state.bots[index]);
}

function endSession(state: EngineState, session: ActiveSession, nowMs: number) {
  state.sessions.delete(session.id);
  state.cooldownByPair.set(session.pairKey, nowMs);

  const first = getById(state, session.botAId);
  const second = getById(state, session.botBId);

  if (first) {
    updateBot(state, first.id, (bot) => {
      const nextDirection = randomDirection(bot.directionX, bot.directionY);
      return {
        ...bot,
        locked: false,
        lockedWith: null,
        motionState: bot.status === "ACTIVE" ? "WANDERING" : "RESTING",
        directionX: nextDirection.x,
        directionY: nextDirection.y,
        inertiaTicks: 1
      };
    });
  }

  if (second) {
    updateBot(state, second.id, (bot) => {
      const nextDirection = randomDirection(bot.directionX, bot.directionY);
      return {
        ...bot,
        locked: false,
        lockedWith: null,
        motionState: bot.status === "ACTIVE" ? "WANDERING" : "RESTING",
        directionX: nextDirection.x,
        directionY: nextDirection.y,
        inertiaTicks: 1
      };
    });
  }

  if (first && second) {
    state.lastEncounter = `${first.name} x ${second.name} @ ${formatClockLabel(nowMs)}`;
  }

  state.interactions = state.interactions.map((interaction) =>
    interaction.id === session.id
      ? {
          ...interaction,
          endedAt: new Date(nowMs).toISOString()
        }
      : interaction
  );
}

function runSessionTurn(state: EngineState, session: ActiveSession, nowMs: number) {
  const speakerId = session.turnsDone % 2 === 0 ? session.botAId : session.botBId;
  const listenerId = speakerId === session.botAId ? session.botBId : session.botAId;
  const speaker = getById(state, speakerId);
  const listener = getById(state, listenerId);

  if (!speaker || !listener) {
    endSession(state, session, nowMs);
    return;
  }

  const text = turnText(speaker, listener, state.context, session.turnsDone, session.turnsPlanned);
  const event: ChatEvent = {
    id: makeId(),
    at: formatClockLabel(nowMs),
    fromBotId: speaker.id,
    toBotId: listener.id,
    text
  };

  state.events = [...state.events, event].slice(-MAX_EVENTS);
  state.interactions = state.interactions.map((interaction) =>
    interaction.id === session.id
      ? {
          ...interaction,
          transcript: [...interaction.transcript, event]
        }
      : interaction
  );

  updateBot(state, speaker.id, (bot) => withMemoryUpdate(bot, listener, state.context, text));
  updateBot(state, listener.id, (bot) => withMemoryUpdate(bot, speaker, state.context, text));

  session.turnsDone += 1;

  if (session.turnsDone >= session.turnsPlanned) {
    endSession(state, session, nowMs);
    return;
  }

  session.nextTurnAtMs = nowMs + DIALOG_TURN_BASE_MS + Math.floor(Math.random() * DIALOG_TURN_JITTER_MS);
}

function runDueSessions(state: EngineState, nowMs: number) {
  let guard = 0;

  while (guard < 64) {
    guard += 1;

    let dueSession: ActiveSession | null = null;

    for (const session of state.sessions.values()) {
      if (session.nextTurnAtMs > nowMs) {
        continue;
      }

      if (!dueSession || session.nextTurnAtMs < dueSession.nextTurnAtMs) {
        dueSession = session;
      }
    }

    if (!dueSession) {
      break;
    }

    runSessionTurn(state, dueSession, nowMs);
  }
}

function startSession(state: EngineState, first: EngineBot, second: EngineBot, nowMs: number) {
  if (first.locked || second.locked) {
    return;
  }

  const key = pairKey(first.id, second.id);
  const turnsPlanned = Math.random() < 0.38 ? 3 : 2;
  const sessionId = `ix-${makeId()}`;

  const session: ActiveSession = {
    id: sessionId,
    pairKey: key,
    botAId: first.id,
    botBId: second.id,
    turnsPlanned,
    turnsDone: 0,
    nextTurnAtMs: nowMs + 320
  };

  state.sessions.set(sessionId, session);

  updateBot(state, first.id, (bot) => ({
    ...bot,
    locked: true,
    lockedWith: second.id,
    motionState: "LOCKED"
  }));

  updateBot(state, second.id, (bot) => ({
    ...bot,
    locked: true,
    lockedWith: first.id,
    motionState: "LOCKED"
  }));

  state.interactions = [
    ...state.interactions,
    {
      id: sessionId,
      pairKey: key,
      startedAt: new Date(nowMs).toISOString(),
      endedAt: null,
      turnsPlanned,
      contextMode: state.context.mode,
      objective: state.context.objective,
      participants: [
        { id: first.id, name: first.name },
        { id: second.id, name: second.name }
      ] as ClubInteractionRecord["participants"],
      transcript: []
    }
  ].slice(-MAX_INTERACTIONS);
}

function movementTick(state: EngineState) {
  state.bots = state.bots.map((bot) => {
    if (bot.status !== "ACTIVE") {
      return {
        ...bot,
        motionState: "RESTING",
        locked: false,
        lockedWith: null
      };
    }

    if (bot.locked || bot.motionState === "LOCKED") {
      return bot;
    }

    const shouldPause = Math.random() < bot.pauseBias * 0.3;

    if (shouldPause) {
      return {
        ...bot,
        motionState: "RESTING",
        inertiaTicks: Math.max(0, bot.inertiaTicks - 1)
      };
    }

    let directionX = bot.directionX;
    let directionY = bot.directionY;
    let inertiaTicks = bot.inertiaTicks - 1;

    const shouldTurn = inertiaTicks <= 0 || Math.random() < bot.turnBias;
    if (shouldTurn) {
      const nextDirection = randomDirection(directionX, directionY);
      directionX = nextDirection.x;
      directionY = nextDirection.y;
      inertiaTicks = 2 + Math.floor(Math.random() * 5);
    }

    const stepSize = chooseStepSize(bot.burstBias);
    const delta = BASE_STEP_UNITS * stepSize * bot.strideBias;
    const jitterX = (Math.random() - 0.5) * 0.7;
    const jitterY = (Math.random() - 0.5) * 0.7;

    let nextX = bot.x + directionX * delta + jitterX;
    let nextY = bot.y + directionY * delta + jitterY;

    if (nextX <= 5 || nextX >= 95) {
      directionX *= -1;
    }

    if (nextY <= 8 || nextY >= 92) {
      directionY *= -1;
    }

    return {
      ...bot,
      x: clamp(nextX, 5, 95),
      y: clamp(nextY, 8, 92),
      directionX,
      directionY,
      inertiaTicks,
      motionState: "WANDERING"
    };
  });
}

function encounterTick(state: EngineState, nowMs: number) {
  const activeBots = state.bots.filter((bot) => bot.status === "ACTIVE" && !bot.locked && bot.motionState !== "LOCKED");

  for (let i = 0; i < activeBots.length; i += 1) {
    for (let j = i + 1; j < activeBots.length; j += 1) {
      const first = activeBots[i];
      const second = activeBots[j];
      const key = pairKey(first.id, second.id);
      const lastSeen = state.cooldownByPair.get(key) ?? 0;

      if (nowMs - lastSeen < PAIR_COOLDOWN_MS) {
        continue;
      }

      if (distance(first, second) > ENCOUNTER_DISTANCE) {
        continue;
      }

      if (Math.random() > 0.68) {
        continue;
      }

      startSession(state, first, second, nowMs);
      return;
    }
  }
}

function advanceState(state: EngineState, club: Club, nowMs: number) {
  if (nowMs <= state.lastAdvancedAtMs) {
    return;
  }

  syncBotsFromClub(state, club);

  if (club.status !== "RUNNING") {
    state.sessions.clear();
    state.bots = state.bots.map((bot) => ({
      ...bot,
      locked: false,
      lockedWith: null,
      motionState: "RESTING"
    }));
    state.lastAdvancedAtMs = nowMs;
    return;
  }

  const elapsedMs = nowMs - state.lastAdvancedAtMs;
  state.movementRemainderMs += elapsedMs;
  state.encounterRemainderMs += elapsedMs;

  const moveTicks = Math.min(MAX_TICKS_PER_ADVANCE, Math.floor(state.movementRemainderMs / MOVE_TICK_MS));
  const encounterTicks = Math.min(MAX_TICKS_PER_ADVANCE, Math.floor(state.encounterRemainderMs / ENCOUNTER_CHECK_MS));

  state.movementRemainderMs -= moveTicks * MOVE_TICK_MS;
  state.encounterRemainderMs -= encounterTicks * ENCOUNTER_CHECK_MS;

  for (let i = 0; i < moveTicks; i += 1) {
    movementTick(state);
  }

  for (let i = 0; i < encounterTicks; i += 1) {
    encounterTick(state, nowMs);
  }

  runDueSessions(state, nowMs);
  state.lastAdvancedAtMs = nowMs;
}

function persistSnapshot(state: EngineState, nowMs: number) {
  try {
    ensureEngineLogDir();
    const event: EngineSnapshotEvent = {
      id: makeId(),
      type: "SNAPSHOT",
      clubId: state.clubId,
      at: new Date(nowMs).toISOString(),
      state: serializeState(state)
    };

    appendFileSync(toLogPath(state.clubId), `${JSON.stringify(event)}\n`, "utf-8");
    state.lastPersistedAtMs = nowMs;
    maybeCompactLog(state.clubId, nowMs);
  } catch {
    // Persistence failures should not stop live state generation.
  }
}

function maybePersistState(state: EngineState, nowMs: number) {
  if (nowMs - state.lastPersistedAtMs < PERSIST_EVERY_MS) {
    return;
  }

  persistSnapshot(state, nowMs);
}

type EngineRegistry = Map<string, EngineState>;

const globalRegistry = globalThis as typeof globalThis & {
  __clawclubEngineRegistry?: EngineRegistry;
};

const registry: EngineRegistry = globalRegistry.__clawclubEngineRegistry ?? new Map();

if (!globalRegistry.__clawclubEngineRegistry) {
  globalRegistry.__clawclubEngineRegistry = registry;
}

function getOrCreateState(club: Club) {
  const existing = registry.get(club.id);

  if (existing) {
    return existing;
  }

  const restored = loadLatestPersistedState(club.id);
  const created = restored ? createStateFromPersisted(club, restored) : createInitialState(club);
  registry.set(club.id, created);
  return created;
}

export function getClubLiveState(club: Club): ClubLiveState {
  const nowMs = Date.now();
  const state = getOrCreateState(club);
  advanceState(state, club, nowMs);
  maybePersistState(state, nowMs);

  return {
    clubId: state.clubId,
    updatedAt: new Date(nowMs).toISOString(),
    lastEncounter: state.lastEncounter,
    context: state.context,
    bots: state.bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      owner: bot.owner,
      status: bot.status,
      claws: bot.claws,
      activeRatio: bot.activeRatio,
      hadExchange: bot.hadExchange,
      skin: bot.skin,
      memory: bot.memory,
      history: bot.history,
      x: bot.x,
      y: bot.y,
      locked: bot.locked,
      lockedWith: bot.lockedWith,
      persona: bot.persona,
      motionState: bot.motionState
    })),
    events: [...state.events],
    interactions: [...state.interactions]
  };
}
