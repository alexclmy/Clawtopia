import { promises as fs } from "fs";
import path from "path";
import { issueBotToken } from "@/lib/bot-token";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase-rest";
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
const SUPABASE_BOT_FIELDS =
  "user_email,user_name,bot_id,bot_name,claws_total,skin,tagline,bot_token,bot_token_created_at,ws_status,last_seen_at,created_at,updated_at";
const SUPABASE_EVENT_FIELDS = "id,bot_id,type,at,payload";

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

interface SupabaseBotRow {
  user_email: string;
  user_name: string;
  bot_id: string;
  bot_name: string;
  claws_total: number | null;
  skin: string | null;
  tagline: string | null;
  bot_token: string;
  bot_token_created_at: string;
  ws_status: BotConnectionStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseEventRow {
  id: string;
  bot_id: string;
  type: HubInboundType;
  at: string;
  payload: HubInboundMessage;
}

function fromSupabaseBot(row: SupabaseBotRow): BotRegistration {
  return {
    userEmail: row.user_email,
    userName: row.user_name,
    botId: row.bot_id,
    botName: row.bot_name,
    clawsTotal: typeof row.claws_total === "number" ? row.claws_total : 0,
    skin: row.skin || "default",
    tagline: row.tagline || "",
    botToken: row.bot_token,
    botTokenCreatedAt: row.bot_token_created_at,
    wsStatus: row.ws_status || "OFFLINE",
    lastSeenAt: row.last_seen_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function fromSupabaseEvent(row: SupabaseEventRow): StoredHubEvent {
  return {
    id: row.id,
    botId: row.bot_id,
    type: row.type,
    at: row.at,
    payload: row.payload
  };
}

function toSupabaseBotInsert(bot: BotRegistration): SupabaseBotRow {
  return {
    user_email: bot.userEmail,
    user_name: bot.userName,
    bot_id: bot.botId,
    bot_name: bot.botName,
    claws_total: bot.clawsTotal,
    skin: bot.skin,
    tagline: bot.tagline,
    bot_token: bot.botToken,
    bot_token_created_at: bot.botTokenCreatedAt,
    ws_status: bot.wsStatus,
    last_seen_at: bot.lastSeenAt,
    created_at: bot.createdAt,
    updated_at: bot.updatedAt
  };
}

function botByEmailQuery(userEmail: string) {
  const query = new URLSearchParams();
  query.set("select", SUPABASE_BOT_FIELDS);
  query.set("user_email", `eq.${userEmail.toLowerCase()}`);
  query.set("limit", "1");
  return query;
}

function botByIdQuery(botId: string) {
  const query = new URLSearchParams();
  query.set("select", SUPABASE_BOT_FIELDS);
  query.set("bot_id", `eq.${botId}`);
  query.set("limit", "1");
  return query;
}

async function getBotByUserEmailSupabase(userEmail: string) {
  const rows = await supabaseRequest<SupabaseBotRow[]>({
    table: "bots",
    query: botByEmailQuery(userEmail)
  });
  return rows[0] ? fromSupabaseBot(rows[0]) : undefined;
}

async function getBotByBotIdSupabase(botId: string) {
  const rows = await supabaseRequest<SupabaseBotRow[]>({
    table: "bots",
    query: botByIdQuery(botId)
  });
  return rows[0] ? fromSupabaseBot(rows[0]) : undefined;
}

async function listBotsSupabase() {
  const query = new URLSearchParams();
  query.set("select", SUPABASE_BOT_FIELDS);
  query.set("order", "created_at.desc");
  query.set("limit", "1000");

  const rows = await supabaseRequest<SupabaseBotRow[]>({
    table: "bots",
    query
  });

  return rows.map(fromSupabaseBot);
}

async function updateBotSupabase(botId: string, patch: Partial<SupabaseBotRow>) {
  const query = new URLSearchParams();
  query.set("select", SUPABASE_BOT_FIELDS);
  query.set("bot_id", `eq.${botId}`);

  const rows = await supabaseRequest<SupabaseBotRow[]>({
    table: "bots",
    method: "PATCH",
    query,
    body: patch,
    prefer: "return=representation"
  });

  return rows[0] ? fromSupabaseBot(rows[0]) : null;
}

export async function listBots() {
  if (isSupabaseConfigured()) {
    return listBotsSupabase();
  }

  const state = await readState();
  return state.bots;
}

export async function getBotByUserEmail(userEmail: string) {
  if (isSupabaseConfigured()) {
    return getBotByUserEmailSupabase(userEmail);
  }

  const state = await readState();
  return state.bots.find((bot) => bot.userEmail === userEmail.toLowerCase());
}

export async function getBotByBotId(botId: string) {
  if (isSupabaseConfigured()) {
    return getBotByBotIdSupabase(botId);
  }

  const state = await readState();
  return state.bots.find((bot) => bot.botId === botId);
}

export async function upsertBotForUser(input: UpsertBotInput) {
  return serializeWrite(async () => {
    const now = new Date().toISOString();
    const userEmail = input.userEmail.toLowerCase();
    const userName = input.userName || input.userEmail.split("@")[0];

    if (isSupabaseConfigured()) {
      const existing = await getBotByUserEmailSupabase(userEmail);

      if (existing) {
        const updated = await updateBotSupabase(existing.botId, {
          user_name: userName,
          bot_name: input.botName,
          skin: input.skin,
          tagline: input.tagline,
          updated_at: now
        });

        if (!updated) {
          throw new Error(`Unable to update bot ${existing.botId}.`);
        }

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

      const rows = await supabaseRequest<SupabaseBotRow[]>({
        table: "bots",
        method: "POST",
        body: toSupabaseBotInsert(created),
        prefer: "return=representation"
      });

      if (!rows[0]) {
        throw new Error("Unable to create bot.");
      }

      return fromSupabaseBot(rows[0]);
    }

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
    if (isSupabaseConfigured()) {
      const existing = await getBotByUserEmailSupabase(userEmail.toLowerCase());

      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const nextToken = issueBotToken(existing.botId, existing.userEmail);
      return updateBotSupabase(existing.botId, {
        bot_token: nextToken,
        bot_token_created_at: now,
        updated_at: now
      });
    }

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
    if (isSupabaseConfigured()) {
      const now = new Date().toISOString();
      return updateBotSupabase(botId, {
        ws_status: wsStatus,
        last_seen_at: now,
        updated_at: now
      });
    }

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
    if (isSupabaseConfigured()) {
      const event: StoredHubEvent = {
        id: makeEventId(),
        botId,
        type,
        at: new Date().toISOString(),
        payload
      };

      const rows = await supabaseRequest<SupabaseEventRow[]>({
        table: "hub_events",
        method: "POST",
        body: {
          id: event.id,
          bot_id: event.botId,
          type: event.type,
          at: event.at,
          payload: event.payload
        },
        prefer: "return=representation"
      });

      return rows[0] ? fromSupabaseEvent(rows[0]) : event;
    }

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
  if (isSupabaseConfigured()) {
    const query = new URLSearchParams();
    query.set("select", SUPABASE_EVENT_FIELDS);
    query.set("bot_id", `eq.${botId}`);
    query.set("order", "at.desc");
    query.set("limit", String(Math.max(1, Math.min(limit, 100))));

    const rows = await supabaseRequest<SupabaseEventRow[]>({
      table: "hub_events",
      query
    });

    return rows.map(fromSupabaseEvent);
  }

  const state = await readState();
  return state.events.filter((event) => event.botId === botId).slice(0, limit);
}
