export type ClubStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDING" | "ENDED";

export type AlternanceMode = "RANDOM" | "ROUND_ROBIN";

export type BotStatus = "ACTIVE" | "PAUSED" | "OFFLINE";

export interface BotMemory {
  globalSynthesis: string[];
  pairMemory: Record<string, string>;
}

export interface BotProfile {
  id: string;
  name: string;
  owner: string;
  status: BotStatus;
  claws: number;
  activeRatio: number;
  hadExchange: boolean;
  skin: string;
  spawn: {
    x: number;
    y: number;
  };
  memory: BotMemory;
  history: string[];
}

export interface ChatEvent {
  id: string;
  at: string;
  fromBotId: string;
  toBotId: string;
  text: string;
}

export interface Club {
  id: string;
  name: string;
  theme: string;
  status: ClubStatus;
  alternanceMode: AlternanceMode;
  requiredClaws: number;
  durationHours: number;
  maxBots: number;
  startedAt: string;
  bots: BotProfile[];
  seedTranscript: ChatEvent[];
}

export interface ClubDirectoryItem {
  id: string;
  name: string;
  theme: string;
  status: ClubStatus;
  alternanceMode: AlternanceMode;
  requiredClaws: number;
  durationHours: number;
  maxBots: number;
  activeBots: number;
  pausedBots: number;
  startedAt: string;
}

export interface ClubDirectoryBuckets {
  live: ClubDirectoryItem[];
  upcoming: ClubDirectoryItem[];
  past: ClubDirectoryItem[];
}

export interface BotClubTimeline {
  current: ClubDirectoryItem | null;
  upcoming: ClubDirectoryItem[];
  past: ClubDirectoryItem[];
}
