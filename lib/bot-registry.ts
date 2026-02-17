import { promises as fs } from "fs";
import path from "path";
import { issueBotToken } from "@/lib/bot-token";
import type {
  BotConnectionStatus,
  BotRegistration,
  BotRegistryState,
  HubInboundMessage,
  HubInboundType,
  StoredHubEvent
} from "@/types/hub";

interface UpsertBotInput {
  userEmail: string;
  userName: string;
  botName: string;
  skin: string;
  tagline: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_PATH = path.join(DATA_DIR, "bot-registry.json");
const MAX_EVENTS = 1000;

let writeChain: Promise<void> = Promise.resolve();

function defaultState(): BotRegistryState {
  return {
    bots: [],
    events: []
  };
}

async function ensureRegistryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(REGISTRY_PATH);
  } catch {
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(defaultState(), null, 2), "utf-8");
  }
}

async function readState() {
  await ensureRegistryFile();
  const content = await fs.readFile(REGISTRY_PATH, "utf-8");

  try {
    const parsed = JSON.parse(content) as BotRegistryState;
    const bots = (parsed.bots || []).map((bot) => ({
      ...bot,
      clawsTotal: typeof bot.clawsTotal === "number" ? bot.clawsTotal : 0
    }));

    return {
      bots,
      events: parsed.events || []
    };
  } catch {
    return defaultState();
  }
}

async function writeState(state: BotRegistryState) {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function serializeWrite<T>(operation: () => Promise<T>) {
  const result = writeChain.then(operation, operation);
  writeChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function makeBotId() {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

function makeEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getBotByUserEmail(userEmail: string) {
  const state = await readState();
  return state.bots.find((bot) => bot.userEmail === userEmail.toLowerCase());
}

export async function getBotByBotId(botId: string) {
  const state = await readState();
  return state.bots.find((bot) => bot.botId === botId);
}

export async function upsertBotForUser(input: UpsertBotInput) {
  return serializeWrite(async () => {
    const now = new Date().toISOString();
    const userEmail = input.userEmail.toLowerCase();
    const userName = input.userName || input.userEmail.split("@")[0];
    const state = await readState();
    const existingIndex = state.bots.findIndex((bot) => bot.userEmail === userEmail);

    if (existingIndex >= 0) {
      const existing = state.bots[existingIndex];
      const updated: BotRegistration = {
        ...existing,
        userName,
        botName: input.botName,
        skin: input.skin,
        tagline: input.tagline,
        updatedAt: now
      };

      state.bots[existingIndex] = updated;
      await writeState(state);
      return updated;
    }

    const botId = makeBotId();
    const botToken = issueBotToken(botId, userEmail);

    const created: BotRegistration = {
      userEmail,
      userName,
      botId,
      botName: input.botName,
      clawsTotal: 0,
      skin: input.skin,
      tagline: input.tagline,
      botToken,
      botTokenCreatedAt: now,
      wsStatus: "OFFLINE",
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now
    };

    state.bots.push(created);
    await writeState(state);

    return created;
  });
}

export async function rotateBotToken(userEmail: string) {
  return serializeWrite(async () => {
    const state = await readState();
    const index = state.bots.findIndex((bot) => bot.userEmail === userEmail.toLowerCase());

    if (index < 0) {
      return null;
    }

    const now = new Date().toISOString();
    const current = state.bots[index];
    const nextToken = issueBotToken(current.botId, current.userEmail);

    const updated: BotRegistration = {
      ...current,
      botToken: nextToken,
      botTokenCreatedAt: now,
      updatedAt: now
    };

    state.bots[index] = updated;
    await writeState(state);

    return updated;
  });
}

export async function updateBotConnection(botId: string, wsStatus: BotConnectionStatus) {
  return serializeWrite(async () => {
    const state = await readState();
    const index = state.bots.findIndex((bot) => bot.botId === botId);

    if (index < 0) {
      return null;
    }

    const now = new Date().toISOString();
    const current = state.bots[index];

    const updated: BotRegistration = {
      ...current,
      wsStatus,
      lastSeenAt: now,
      updatedAt: now
    };

    state.bots[index] = updated;
    await writeState(state);

    return updated;
  });
}

export async function recordHubEvent(botId: string, payload: HubInboundMessage, type: HubInboundType) {
  return serializeWrite(async () => {
    const state = await readState();

    const event: StoredHubEvent = {
      id: makeEventId(),
      botId,
      type,
      at: new Date().toISOString(),
      payload
    };

    state.events = [event, ...state.events].slice(0, MAX_EVENTS);
    await writeState(state);

    return event;
  });
}

export async function getEventsForBot(botId: string, limit = 20) {
  const state = await readState();
  return state.events.filter((event) => event.botId === botId).slice(0, limit);
}
