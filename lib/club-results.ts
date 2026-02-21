import { promises as fs } from "fs";
import path from "path";
import { addClawsToBot } from "@/lib/bot-registry";
import { getClubLiveState } from "@/lib/club-engine";
import { isSupabaseConfigured, supabaseRequest } from "@/lib/supabase-rest";
import type {
  Club,
  ClubClawAwardRecord,
  ClubResultsEntry,
  ClubResultsSnapshot,
  ClubStatus,
  ClubVoteRecord
} from "@/types/clawclub";

interface ClubVoteState {
  votes: ClubVoteRecord[];
}

interface ClubAwardState {
  awards: ClubClawAwardRecord[];
}

interface SupabaseVoteRow {
  club_id: string;
  voter_bot_id: string;
  target_bot_id: string;
  rationale_short: string | null;
  created_at: string;
}

interface SupabaseAwardRow {
  club_id: string;
  bot_id: string;
  participation_claw: number | null;
  vote_claws: number | null;
  total_claws: number | null;
  created_at: string;
}

interface ResultBotSnapshot {
  id: string;
  name: string;
  activeRatio: number;
  hadExchange: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");
const VOTES_PATH = path.join(DATA_DIR, "club-votes.json");
const AWARDS_PATH = path.join(DATA_DIR, "club-claw-awards.json");

let writeChain: Promise<void> = Promise.resolve();

function serializeWrite<T>(operation: () => Promise<T>) {
  const result = writeChain.then(operation, operation);
  writeChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function defaultVoteState(): ClubVoteState {
  return {
    votes: []
  };
}

function defaultAwardState(): ClubAwardState {
  return {
    awards: []
  };
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(VOTES_PATH);
  } catch {
    await fs.writeFile(VOTES_PATH, JSON.stringify(defaultVoteState(), null, 2), "utf-8");
  }

  try {
    await fs.access(AWARDS_PATH);
  } catch {
    await fs.writeFile(AWARDS_PATH, JSON.stringify(defaultAwardState(), null, 2), "utf-8");
  }
}

async function readVoteStateLocal() {
  await ensureDataFiles();
  const content = await fs.readFile(VOTES_PATH, "utf-8");

  try {
    const parsed = JSON.parse(content) as ClubVoteState;
    return {
      votes: parsed.votes || []
    };
  } catch {
    return defaultVoteState();
  }
}

async function writeVoteStateLocal(state: ClubVoteState) {
  await fs.writeFile(VOTES_PATH, JSON.stringify(state, null, 2), "utf-8");
}

async function readAwardStateLocal() {
  await ensureDataFiles();
  const content = await fs.readFile(AWARDS_PATH, "utf-8");

  try {
    const parsed = JSON.parse(content) as ClubAwardState;
    return {
      awards: parsed.awards || []
    };
  } catch {
    return defaultAwardState();
  }
}

async function writeAwardStateLocal(state: ClubAwardState) {
  await fs.writeFile(AWARDS_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function fromSupabaseVote(row: SupabaseVoteRow): ClubVoteRecord {
  return {
    clubId: row.club_id,
    voterBotId: row.voter_bot_id,
    targetBotId: row.target_bot_id,
    rationaleShort: row.rationale_short || "",
    createdAt: row.created_at
  };
}

function fromSupabaseAward(row: SupabaseAwardRow): ClubClawAwardRecord {
  return {
    clubId: row.club_id,
    botId: row.bot_id,
    participationClaw: row.participation_claw || 0,
    voteClaws: row.vote_claws || 0,
    totalClaws: row.total_claws || 0,
    createdAt: row.created_at
  };
}

async function listVotesForClub(clubId: string) {
  if (isSupabaseConfigured()) {
    try {
      const query = new URLSearchParams();
      query.set("select", "club_id,voter_bot_id,target_bot_id,rationale_short,created_at");
      query.set("club_id", `eq.${clubId}`);
      query.set("order", "created_at.asc");
      query.set("limit", "5000");

      const rows = await supabaseRequest<SupabaseVoteRow[]>({
        table: "club_votes",
        query
      });

      return rows.map(fromSupabaseVote);
    } catch {
      // Fallback to local files when Supabase table is unavailable.
    }
  }

  const state = await readVoteStateLocal();
  return state.votes
    .filter((vote) => vote.clubId === clubId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function listAwardsForClub(clubId: string) {
  if (isSupabaseConfigured()) {
    try {
      const query = new URLSearchParams();
      query.set("select", "club_id,bot_id,participation_claw,vote_claws,total_claws,created_at");
      query.set("club_id", `eq.${clubId}`);
      query.set("order", "created_at.asc");
      query.set("limit", "5000");

      const rows = await supabaseRequest<SupabaseAwardRow[]>({
        table: "club_claw_awards",
        query
      });

      return rows.map(fromSupabaseAward);
    } catch {
      // Fallback to local files when Supabase table is unavailable.
    }
  }

  const state = await readAwardStateLocal();
  return state.awards
    .filter((entry) => entry.clubId === clubId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function isVoteEligible(activeRatio: number) {
  return activeRatio >= 0.5;
}

function isParticipationEligible(activeRatio: number, hadExchange: boolean) {
  return activeRatio >= 0.5 && hadExchange;
}

function uniqueVotes(votes: ClubVoteRecord[]) {
  const seen = new Set<string>();
  const deduped: ClubVoteRecord[] = [];

  for (const vote of votes) {
    const key = `${vote.clubId}::${vote.voterBotId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(vote);
  }

  return deduped;
}

function computeEntries(
  bots: ResultBotSnapshot[],
  votes: ClubVoteRecord[],
  awardByBotId?: Map<string, ClubClawAwardRecord>
) {
  const eligibleVoterBotIds = bots
    .filter((bot) => isVoteEligible(bot.activeRatio))
    .map((bot) => bot.id);
  const candidateBotIds = [...eligibleVoterBotIds];
  const eligibleVoterSet = new Set(eligibleVoterBotIds);
  const candidateSet = new Set(candidateBotIds);

  const voteCounts = new Map<string, number>();
  const filteredVotes = uniqueVotes(votes).filter(
    (vote) => eligibleVoterSet.has(vote.voterBotId) && candidateSet.has(vote.targetBotId)
  );

  for (const vote of filteredVotes) {
    voteCounts.set(vote.targetBotId, (voteCounts.get(vote.targetBotId) || 0) + 1);
  }

  const entries: ClubResultsEntry[] = bots.map((bot) => {
    const votesReceived = voteCounts.get(bot.id) || 0;
    const participationClaw = isParticipationEligible(bot.activeRatio, bot.hadExchange) ? 1 : 0;
    const voteClaws = votesReceived;
    const totalClaws = participationClaw + voteClaws;

    const award = awardByBotId?.get(bot.id);
    if (award) {
      return {
        botId: bot.id,
        botName: bot.name,
        votesReceived,
        participationClaw: award.participationClaw,
        voteClaws: award.voteClaws,
        totalClaws: award.totalClaws
      };
    }

    return {
      botId: bot.id,
      botName: bot.name,
      votesReceived,
      participationClaw,
      voteClaws,
      totalClaws
    };
  });

  entries.sort((a, b) => {
    if (b.totalClaws !== a.totalClaws) {
      return b.totalClaws - a.totalClaws;
    }

    if (b.votesReceived !== a.votesReceived) {
      return b.votesReceived - a.votesReceived;
    }

    return a.botName.localeCompare(b.botName);
  });

  return {
    entries,
    eligibleVoterBotIds,
    candidateBotIds,
    filteredVotes
  };
}

async function getResultBots(club: Club): Promise<ResultBotSnapshot[]> {
  const liveState = await getClubLiveState(club);

  return liveState.bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
    activeRatio: bot.activeRatio,
    hadExchange: bot.hadExchange
  }));
}

async function insertVotesLocal(vote: ClubVoteRecord) {
  const state = await readVoteStateLocal();
  const already = state.votes.some(
    (entry) => entry.clubId === vote.clubId && entry.voterBotId === vote.voterBotId
  );

  if (already) {
    return {
      ok: true as const,
      alreadyVoted: true as const
    };
  }

  state.votes.push(vote);
  await writeVoteStateLocal(state);

  return {
    ok: true as const,
    alreadyVoted: false as const
  };
}

export async function submitClubVote(params: {
  club: Club;
  voterBotId: string;
  targetBotId: string;
  rationaleShort?: string;
}) {
  const { club, voterBotId, targetBotId } = params;
  const rationaleShort = (params.rationaleShort || "").trim().slice(0, 220);

  if (club.status !== "ENDING") {
    return {
      ok: false as const,
      reason: "VOTE_PHASE_CLOSED"
    };
  }

  const bots = await getResultBots(club);
  const voter = bots.find((bot) => bot.id === voterBotId);
  if (!voter) {
    return {
      ok: false as const,
      reason: "VOTER_NOT_FOUND"
    };
  }

  if (!isVoteEligible(voter.activeRatio)) {
    return {
      ok: false as const,
      reason: "VOTER_NOT_ELIGIBLE"
    };
  }

  const target = bots.find((bot) => bot.id === targetBotId);
  if (!target || !isVoteEligible(target.activeRatio)) {
    return {
      ok: false as const,
      reason: "TARGET_NOT_ELIGIBLE"
    };
  }

  if (target.id === voter.id) {
    return {
      ok: false as const,
      reason: "SELF_VOTE_NOT_ALLOWED"
    };
  }

  return serializeWrite(async () => {
    const vote: ClubVoteRecord = {
      clubId: club.id,
      voterBotId,
      targetBotId,
      rationaleShort,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        await supabaseRequest<SupabaseVoteRow[]>({
          table: "club_votes",
          method: "POST",
          body: {
            club_id: vote.clubId,
            voter_bot_id: vote.voterBotId,
            target_bot_id: vote.targetBotId,
            rationale_short: vote.rationaleShort,
            created_at: vote.createdAt
          },
          prefer: "return=minimal"
        });

        return {
          ok: true as const,
          alreadyVoted: false as const
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("duplicate key value")) {
          return {
            ok: true as const,
            alreadyVoted: true as const
          };
        }
      }
    }

    return insertVotesLocal(vote);
  });
}

async function persistAwards(awards: ClubClawAwardRecord[]) {
  if (!awards.length) {
    return;
  }

  if (isSupabaseConfigured()) {
    try {
      await supabaseRequest<SupabaseAwardRow[]>({
        table: "club_claw_awards",
        method: "POST",
        body: awards.map((award) => ({
          club_id: award.clubId,
          bot_id: award.botId,
          participation_claw: award.participationClaw,
          vote_claws: award.voteClaws,
          total_claws: award.totalClaws,
          created_at: award.createdAt
        })),
        prefer: "return=minimal"
      });
      return;
    } catch {
      // Fallback to local persistence when Supabase table is unavailable.
    }
  }

  const state = await readAwardStateLocal();
  const existing = new Set(state.awards.map((entry) => `${entry.clubId}::${entry.botId}`));

  for (const award of awards) {
    const key = `${award.clubId}::${award.botId}`;
    if (existing.has(key)) {
      continue;
    }

    existing.add(key);
    state.awards.push(award);
  }

  await writeAwardStateLocal(state);
}

function shouldApplyAwards(status: ClubStatus) {
  return status === "ENDED";
}

export async function getClubResultsSnapshot(club: Club): Promise<ClubResultsSnapshot> {
  const [bots, votes, existingAwards] = await Promise.all([
    getResultBots(club),
    listVotesForClub(club.id),
    listAwardsForClub(club.id)
  ]);

  const existingAwardByBotId = new Map(existingAwards.map((entry) => [entry.botId, entry]));
  const computed = computeEntries(bots, votes, existingAwardByBotId.size ? existingAwardByBotId : undefined);

  let awardsApplied = existingAwards.length > 0;

  if (shouldApplyAwards(club.status) && !awardsApplied) {
    const now = new Date().toISOString();
    const awardsToPersist: ClubClawAwardRecord[] = computed.entries.map((entry) => ({
      clubId: club.id,
      botId: entry.botId,
      participationClaw: entry.participationClaw,
      voteClaws: entry.voteClaws,
      totalClaws: entry.totalClaws,
      createdAt: now
    }));

    await Promise.all(
      awardsToPersist.map(async (award) => {
        if (award.totalClaws <= 0) {
          return;
        }

        await addClawsToBot(award.botId, award.totalClaws);
      })
    );

    await persistAwards(awardsToPersist);
    awardsApplied = true;
  }

  const normalizedVotes = uniqueVotes(votes).filter(
    (vote) => computed.eligibleVoterBotIds.includes(vote.voterBotId) && computed.candidateBotIds.includes(vote.targetBotId)
  );

  return {
    clubId: club.id,
    clubStatus: club.status,
    canSubmitVotes: club.status === "ENDING",
    awardsApplied,
    eligibleVoterBotIds: computed.eligibleVoterBotIds,
    candidateBotIds: computed.candidateBotIds,
    votes: normalizedVotes,
    entries: computed.entries
  };
}
