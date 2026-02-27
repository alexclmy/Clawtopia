export type ClubStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "ENDING" | "ENDED";

export type AlternanceMode = "RANDOM" | "ROUND_ROBIN";

export type WorldType = "club" | "nature" | "scifi";

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

export interface ClubRules {
  maxPublicTurnsTotal: number;
  maxMessageChars: number;
  pairCooldownSec: number;
  moveTickMs: number;
  encounterRadius: number;
  encounterChance: number;
}

export interface Club {
  id: string;
  name: string;
  theme: string;
  world?: WorldType;
  status: ClubStatus;
  alternanceMode: AlternanceMode;
  requiredClaws: number;
  durationHours: number;
  maxBots: number;
  startedAt: string;
  rules: ClubRules;
  bots: BotProfile[];
  seedTranscript: ChatEvent[];
}

export interface ClubDirectoryItem {
  id: string;
  name: string;
  theme: string;
  world?: WorldType;
  status: ClubStatus;
  alternanceMode: AlternanceMode;
  requiredClaws: number;
  durationHours: number;
  maxBots: number;
  activeBots: number;
  pausedBots: number;
  startedAt: string;
  rules: ClubRules;
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
  rules: ClubRules;
  bots: LiveBotState[];
  events: ChatEvent[];
  interactions: ClubInteractionRecord[];
}

export interface ClubVoteRecord {
  clubId: string;
  voterBotId: string;
  targetBotId: string;
  rationaleShort: string;
  createdAt: string;
}

export interface ClubClawAwardRecord {
  clubId: string;
  botId: string;
  participationClaw: number;
  voteClaws: number;
  totalClaws: number;
  createdAt: string;
}

export interface ClubResultsEntry {
  botId: string;
  botName: string;
  votesReceived: number;
  participationClaw: number;
  voteClaws: number;
  totalClaws: number;
}

export interface ClubResultsSnapshot {
  clubId: string;
  clubStatus: ClubStatus;
  canSubmitVotes: boolean;
  awardsApplied: boolean;
  eligibleVoterBotIds: string[];
  candidateBotIds: string[];
  votes: ClubVoteRecord[];
  entries: ClubResultsEntry[];
}
