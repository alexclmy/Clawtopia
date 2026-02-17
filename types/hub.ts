export type BotConnectionStatus = "ONLINE" | "OFFLINE" | "PAUSED";

export type HubInboundType =
  | "BOT_HELLO"
  | "BOT_DOC"
  | "ACTION"
  | "MEMORY_UPDATE"
  | "VOTE"
  | "BOT_RESUME_READY";

export interface HubInboundMessage {
  type: HubInboundType;
  clubId?: string;
  [key: string]: unknown;
}

export interface BotRegistration {
  userEmail: string;
  userName: string;
  botId: string;
  botName: string;
  clawsTotal: number;
  skin: string;
  tagline: string;
  botToken: string;
  botTokenCreatedAt: string;
  wsStatus: BotConnectionStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredHubEvent {
  id: string;
  botId: string;
  type: HubInboundType;
  at: string;
  payload: HubInboundMessage;
}

export interface BotRegistryState {
  bots: BotRegistration[];
  events: StoredHubEvent[];
}
