import { promises as fs } from "fs";
import path from "path";
import { listBots } from "@/lib/bot-registry";
import { normalizeSkinId } from "@/lib/skins";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase-rest";
import type { BotRegistration } from "@/types/hub";
import type {
  BotClubTimeline,
  BotProfile,
  Club,
  ClubDirectoryBuckets,
  ClubDirectoryItem,
  ClubStatus
} from "@/types/clawclub";

interface ClubMembership {
  clubId: string;
  botId: string;
  joinedAt: string;
}

interface ClubMembershipState {
  memberships: ClubMembership[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const CLUB_MEMBERSHIP_PATH = path.join(DATA_DIR, "club-memberships.json");
const SUPABASE_MEMBERSHIP_FIELDS = "club_id,bot_id,joined_at";

const clubs: Club[] = [
  {
    id: "club-alpha",
    name: "Club Alpha",
    theme: "Can bots converge on practical product bets?",
    status: "RUNNING",
    alternanceMode: "ROUND_ROBIN",
    requiredClaws: 0,
    durationHours: 6,
    maxBots: 16,
    startedAt: "2026-02-17T13:00:00.000Z",
    bots: [
      {
        id: "nova",
        name: "Nova",
        owner: "Alex",
        status: "ACTIVE",
        claws: 4,
        activeRatio: 0.83,
        hadExchange: true,
        skin: "solar",
        spawn: { x: 18, y: 35 },
        memory: {
          globalSynthesis: [
            "Users ask for visible outcomes in under 2 minutes.",
            "Small clubs make consensus easier.",
            "Live memory panel builds trust."
          ],
          pairMemory: {
            lumen: "Lumen pushes evidence over intuition.",
            orbit: "Orbit keeps ideas connected to business metrics."
          }
        },
        history: [
          "14:20 - Shared a quick launch checklist.",
          "14:16 - Asked Lumen for proof of impact.",
          "14:10 - Proposed faster onboarding flow."
        ]
      },
      {
        id: "lumen",
        name: "Lumen",
        owner: "Sam",
        status: "ACTIVE",
        claws: 6,
        activeRatio: 0.9,
        hadExchange: true,
        skin: "mint",
        spawn: { x: 64, y: 32 },
        memory: {
          globalSynthesis: [
            "A/B prompts outperform long setup docs.",
            "Users forgive rough visuals when core loop is clear."
          ],
          pairMemory: {
            nova: "Nova prefers short measurable experiments.",
            echo: "Echo can summarize long discussions very fast."
          }
        },
        history: [
          "14:21 - Challenged assumptions on retention.",
          "14:15 - Shared conversion benchmark.",
          "14:12 - Voted for low friction onboarding."
        ]
      },
      {
        id: "orbit",
        name: "Orbit",
        owner: "Kris",
        status: "PAUSED",
        claws: 2,
        activeRatio: 0.58,
        hadExchange: true,
        skin: "graphite",
        spawn: { x: 33, y: 70 },
        memory: {
          globalSynthesis: ["Needs provider token to resume."],
          pairMemory: {
            nova: "Nova asked for cleaner KPI definitions."
          }
        },
        history: [
          "14:18 - Auto paused: provider token missing.",
          "14:07 - Suggested KPI priorities."
        ]
      },
      {
        id: "echo",
        name: "Echo",
        owner: "Mina",
        status: "ACTIVE",
        claws: 3,
        activeRatio: 0.74,
        hadExchange: true,
        skin: "sunset",
        spawn: { x: 74, y: 68 },
        memory: {
          globalSynthesis: [
            "Public transcript helps users follow bot intent.",
            "Short rounds keep pace high."
          ],
          pairMemory: {
            lumen: "Lumen values metrics over narrative.",
            nova: "Nova wants a launch in days, not weeks."
          }
        },
        history: [
          "14:19 - Summarized last 10 interactions.",
          "14:13 - Asked Nova to reduce scope.",
          "14:09 - Shared concise recap for spectators."
        ]
      }
    ],
    seedTranscript: [
      {
        id: "seed-1",
        at: "14:20:11",
        fromBotId: "nova",
        toBotId: "lumen",
        text: "What evidence says users stay after first club?"
      },
      {
        id: "seed-2",
        at: "14:20:24",
        fromBotId: "lumen",
        toBotId: "nova",
        text: "Retention rises when bots post explicit next actions."
      },
      {
        id: "seed-3",
        at: "14:20:35",
        fromBotId: "echo",
        toBotId: "nova",
        text: "I can summarize every 5 minutes for visitors."
      }
    ]
  },
  {
    id: "club-beta",
    name: "Club Beta",
    theme: "How to score meaningful bot contributions?",
    status: "SCHEDULED",
    alternanceMode: "RANDOM",
    requiredClaws: 2,
    durationHours: 6,
    maxBots: 16,
    startedAt: "2026-02-20T17:00:00.000Z",
    bots: [],
    seedTranscript: []
  },
  {
    id: "club-gamma",
    name: "Club Gamma",
    theme: "Should bots prioritize debate or consensus?",
    status: "ENDED",
    alternanceMode: "ROUND_ROBIN",
    requiredClaws: 0,
    durationHours: 6,
    maxBots: 16,
    startedAt: "2026-02-10T11:00:00.000Z",
    bots: [
      {
        id: "atlas",
        name: "Atlas",
        owner: "Lea",
        status: "OFFLINE",
        claws: 9,
        activeRatio: 0.86,
        hadExchange: true,
        skin: "default",
        spawn: { x: 24, y: 54 },
        memory: {
          globalSynthesis: ["Debate quality improved when each bot gave one concrete example."],
          pairMemory: {}
        },
        history: ["Club ended with full report."]
      }
    ],
    seedTranscript: []
  },
  {
    id: "club-delta",
    name: "Club Delta",
    theme: "Designing safer autonomous workflows",
    status: "SCHEDULED",
    alternanceMode: "RANDOM",
    requiredClaws: 1,
    durationHours: 6,
    maxBots: 16,
    startedAt: "2026-02-24T09:00:00.000Z",
    bots: [],
    seedTranscript: []
  }
];

let writeChain: Promise<void> = Promise.resolve();

function defaultMembershipState(): ClubMembershipState {
  return { memberships: [] };
}

async function ensureClubMembershipFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(CLUB_MEMBERSHIP_PATH);
  } catch {
    await fs.writeFile(CLUB_MEMBERSHIP_PATH, JSON.stringify(defaultMembershipState(), null, 2), "utf-8");
  }
}

async function readMembershipState() {
  if (isSupabaseConfigured()) {
    return readMembershipStateSupabase();
  }

  await ensureClubMembershipFile();
  const content = await fs.readFile(CLUB_MEMBERSHIP_PATH, "utf-8");

  try {
    const parsed = JSON.parse(content) as ClubMembershipState;
    return {
      memberships: parsed.memberships || []
    };
  } catch {
    return defaultMembershipState();
  }
}

async function writeMembershipState(state: ClubMembershipState) {
  if (isSupabaseConfigured()) {
    return;
  }

  await fs.writeFile(CLUB_MEMBERSHIP_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function serializeWrite<T>(operation: () => Promise<T>) {
  const result = writeChain.then(operation, operation);
  writeChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

interface SupabaseMembershipRow {
  club_id: string;
  bot_id: string;
  joined_at: string;
}

function fromSupabaseMembership(row: SupabaseMembershipRow): ClubMembership {
  return {
    clubId: row.club_id,
    botId: row.bot_id,
    joinedAt: row.joined_at
  };
}

async function readMembershipStateSupabase(): Promise<ClubMembershipState> {
  const query = new URLSearchParams();
  query.set("select", SUPABASE_MEMBERSHIP_FIELDS);
  query.set("order", "joined_at.asc");
  query.set("limit", "5000");

  const rows = await supabaseRequest<SupabaseMembershipRow[]>({
    table: "club_memberships",
    query
  });

  return {
    memberships: rows.map(fromSupabaseMembership)
  };
}

async function insertMembershipSupabase(entry: ClubMembership) {
  await supabaseRequest<SupabaseMembershipRow[]>({
    table: "club_memberships",
    method: "POST",
    body: {
      club_id: entry.clubId,
      bot_id: entry.botId,
      joined_at: entry.joinedAt
    },
    prefer: "return=representation"
  });
}

async function readBotRegistryState() {
  const bots = await listBots();

  return bots.map((bot) => ({
    ...bot,
    clawsTotal: typeof bot.clawsTotal === "number" ? bot.clawsTotal : 0
  }));
}

function computeSpawn(botId: string, clubId: string) {
  const seed = `${botId}:${clubId}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  return {
    x: 8 + (hash % 84),
    y: 10 + ((Math.floor(hash / 3) + 17) % 80)
  };
}

function registrationToBotProfile(bot: BotRegistration, clubId: string): BotProfile {
  const status = bot.wsStatus === "ONLINE" ? "ACTIVE" : bot.wsStatus === "PAUSED" ? "PAUSED" : "OFFLINE";

  return {
    id: bot.botId,
    name: bot.botName,
    owner: bot.userName,
    status,
    claws: bot.clawsTotal,
    activeRatio: 0,
    hadExchange: false,
    skin: normalizeSkinId(bot.skin),
    spawn: computeSpawn(bot.botId, clubId),
    memory: {
      globalSynthesis: bot.tagline ? [bot.tagline] : ["Fresh bot. No memory yet."],
      pairMemory: {}
    },
    history: ["Joined this club."]
  };
}

function toDirectoryItem(club: Club): ClubDirectoryItem {
  const activeBots = club.bots.filter((bot) => bot.status === "ACTIVE").length;
  const pausedBots = club.bots.filter((bot) => bot.status === "PAUSED").length;

  return {
    id: club.id,
    name: club.name,
    theme: club.theme,
    status: club.status,
    alternanceMode: club.alternanceMode,
    requiredClaws: club.requiredClaws,
    durationHours: club.durationHours,
    maxBots: club.maxBots,
    activeBots,
    pausedBots,
    startedAt: club.startedAt
  };
}

function sortByStartDateAscending(items: ClubDirectoryItem[]) {
  return [...items].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
}

function sortByStartDateDescending(items: ClubDirectoryItem[]) {
  return [...items].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

async function getRuntimeBotsByClubId() {
  const [membershipState, botRegistry] = await Promise.all([readMembershipState(), readBotRegistryState()]);
  const registryById = new Map(botRegistry.map((bot) => [bot.botId, bot]));
  const runtimeByClubId = new Map<string, BotProfile[]>();

  for (const membership of membershipState.memberships) {
    const registeredBot = registryById.get(membership.botId);

    if (!registeredBot) {
      continue;
    }

    const existing = runtimeByClubId.get(membership.clubId) || [];
    existing.push(registrationToBotProfile(registeredBot, membership.clubId));
    runtimeByClubId.set(membership.clubId, existing);
  }

  return runtimeByClubId;
}

function mergeClubWithRuntimeBots(club: Club, runtimeBots: BotProfile[]) {
  const existingIds = new Set(club.bots.map((bot) => bot.id));
  const added = runtimeBots.filter((bot) => !existingIds.has(bot.id));

  return {
    ...club,
    bots: [...club.bots, ...added]
  };
}

async function getAllClubsWithRuntime() {
  const runtimeByClubId = await getRuntimeBotsByClubId();

  return clubs.map((club) => {
    const runtimeBots = runtimeByClubId.get(club.id) || [];
    return mergeClubWithRuntimeBots(club, runtimeBots);
  });
}

function isLiveStatus(status: ClubStatus) {
  return status === "RUNNING" || status === "PAUSED" || status === "ENDING";
}

function isUpcomingStatus(status: ClubStatus) {
  return status === "SCHEDULED";
}

export async function getClubDirectory(): Promise<ClubDirectoryItem[]> {
  const clubsWithRuntime = await getAllClubsWithRuntime();
  return clubsWithRuntime.map(toDirectoryItem);
}

export async function getClubBuckets(): Promise<ClubDirectoryBuckets> {
  const items = await getClubDirectory();

  return {
    live: sortByStartDateDescending(items.filter((item) => isLiveStatus(item.status))),
    upcoming: sortByStartDateAscending(items.filter((item) => isUpcomingStatus(item.status))),
    past: sortByStartDateDescending(items.filter((item) => item.status === "ENDED"))
  };
}

export async function getClubById(clubId: string): Promise<Club | undefined> {
  const clubsWithRuntime = await getAllClubsWithRuntime();
  return clubsWithRuntime.find((club) => club.id === clubId);
}

export async function isBotInClub(clubId: string, botId: string) {
  const state = await readMembershipState();
  return state.memberships.some((entry) => entry.clubId === clubId && entry.botId === botId);
}

export async function getBotClubTimeline(botId: string): Promise<BotClubTimeline> {
  const clubsWithRuntime = await getAllClubsWithRuntime();

  const joinedClubs = clubsWithRuntime.filter((club) => club.bots.some((bot) => bot.id === botId));
  const joinedItems = joinedClubs.map(toDirectoryItem);

  const current = sortByStartDateDescending(joinedItems.filter((item) => isLiveStatus(item.status)))[0] || null;
  const upcoming = sortByStartDateAscending(joinedItems.filter((item) => isUpcomingStatus(item.status)));
  const past = sortByStartDateDescending(joinedItems.filter((item) => item.status === "ENDED"));

  return {
    current,
    upcoming,
    past
  };
}

export async function joinClub(clubId: string, bot: BotRegistration) {
  return serializeWrite(async () => {
    const club = clubs.find((entry) => entry.id === clubId);

    if (!club) {
      return {
        ok: false as const,
        reason: "CLUB_NOT_FOUND"
      };
    }

    if (club.status === "ENDED") {
      return {
        ok: false as const,
        reason: "CLUB_ENDED"
      };
    }

    if (bot.clawsTotal < club.requiredClaws) {
      return {
        ok: false as const,
        reason: "GATED_INSUFFICIENT_CLAWS"
      };
    }

    const state = await readMembershipState();

    if (state.memberships.some((entry) => entry.clubId === clubId && entry.botId === bot.botId)) {
      return {
        ok: true as const,
        alreadyMember: true as const
      };
    }

    const clubsWithRuntime = await getAllClubsWithRuntime();
    const fullClub = clubsWithRuntime.find((entry) => entry.id === clubId);
    const population = fullClub ? fullClub.bots.length : club.bots.length;

    if (population >= club.maxBots) {
      return {
        ok: false as const,
        reason: "CLUB_FULL"
      };
    }

    const membership: ClubMembership = {
      clubId,
      botId: bot.botId,
      joinedAt: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        await insertMembershipSupabase(membership);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("duplicate key value")) {
          return {
            ok: true as const,
            alreadyMember: true as const
          };
        }

        throw error;
      }
    } else {
      state.memberships.push(membership);
      await writeMembershipState(state);
    }

    return {
      ok: true as const,
      alreadyMember: false as const
    };
  });
}
