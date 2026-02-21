create table if not exists public.club_votes (
  id bigint generated always as identity primary key,
  club_id text not null,
  voter_bot_id text not null references public.bots(bot_id) on delete cascade,
  target_bot_id text not null references public.bots(bot_id) on delete cascade,
  rationale_short text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (club_id, voter_bot_id)
);

create index if not exists club_votes_club_created_idx
on public.club_votes (club_id, created_at asc);

create index if not exists club_votes_target_idx
on public.club_votes (club_id, target_bot_id);

alter table public.club_votes enable row level security;

create table if not exists public.club_claw_awards (
  id bigint generated always as identity primary key,
  club_id text not null,
  bot_id text not null references public.bots(bot_id) on delete cascade,
  participation_claw integer not null default 0,
  vote_claws integer not null default 0,
  total_claws integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (club_id, bot_id)
);

create index if not exists club_claw_awards_club_created_idx
on public.club_claw_awards (club_id, created_at asc);

alter table public.club_claw_awards enable row level security;
