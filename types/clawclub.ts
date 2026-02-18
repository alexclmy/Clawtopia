export type ClubStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDING" | "ENDED";

export type AlternanceMode = "RANDOM" | "ROUND_ROBIN";

export type BotStatus = "ACTIVE" | "PAUSED" | "OFFLINE";
export type BotPersona = "ANALYST" | "DIPLOMAT" | "CHALLENGER" | "BUILDER" | "EXPLORER";
export type BotMotionState = "WANDERING" | "LOCKED" | "RESTING";
export type ClubContextMode = "DEBATE" | "BRAINSTORM" | "SOCIAL";

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

export interface ClubContextState {
  mode: ClubContextMode;
  modeLabel: string;
  objective: string;
  briefing: string;
}

export interface LiveBotState extends Omit<BotProfile, "spawn"> {
  x: number;
  y: number;
  locked: boolean;
  lockedWith: string | null;
  persona: BotPersona;
  motionState: BotMotionState;
}

export interface ClubInteractionRecord {
  id: string;
  pairKey: string;
  startedAt: string;
  endedAt: string | null;
  turnsPlanned: number;
  contextMode: ClubContextMode;
  objective: string;
  participants: [
    { id: string; name: string },
    { id: string; name: string }
  ];
  transcript: ChatEvent[];
}

export interface ClubLiveState {
  clubId: string;
  updatedAt: string;
  lastEncounter: string;
  context: ClubContextState;
  bots: LiveBotState[];
  events: ChatEvent[];
  interactions: ClubInteractionRecord[];
}
