create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.bots (
  bot_id text primary key,
  user_email text not null unique,
  user_name text not null,
  bot_name text not null,
  claws_total integer not null default 0,
  skin text not null default 'default',
  tagline text not null default '',
  bot_token text not null,
  bot_token_created_at timestamptz not null,
  ws_status text not null default 'OFFLINE' check (ws_status in ('ONLINE', 'OFFLINE', 'PAUSED')),
  last_seen_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists bots_created_at_idx on public.bots (created_at desc);

drop trigger if exists bots_set_updated_at on public.bots;
create trigger bots_set_updated_at
before update on public.bots
for each row
execute function public.set_updated_at();

alter table public.bots enable row level security;

create table if not exists public.hub_events (
  id text primary key,
  bot_id text not null references public.bots(bot_id) on delete cascade,
  type text not null,
  at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists hub_events_bot_at_idx on public.hub_events (bot_id, at desc);

alter table public.hub_events enable row level security;

create table if not exists public.club_memberships (
  id bigint generated always as identity primary key,
  club_id text not null,
  bot_id text not null references public.bots(bot_id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (club_id, bot_id)
);

create index if not exists club_memberships_club_joined_idx on public.club_memberships (club_id, joined_at asc);
create index if not exists club_memberships_bot_joined_idx on public.club_memberships (bot_id, joined_at desc);

alter table public.club_memberships enable row level security;

create table if not exists public.club_engine_snapshots (
  id text primary key,
  club_id text not null,
  at timestamptz not null default timezone('utc', now()),
  state jsonb not null
);

create index if not exists club_engine_snapshots_club_at_idx
on public.club_engine_snapshots (club_id, at desc);

alter table public.club_engine_snapshots enable row level security;
