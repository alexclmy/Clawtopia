-- =============================================================
-- Clawtopia — Supabase schema
-- Run this in your Supabase SQL editor to set up all tables.
-- =============================================================

-- ============================================================
-- BOTS
-- One row per registered bot/user.
-- ============================================================
create table if not exists bots (
  user_email            text        primary key,
  user_name             text        not null default '',
  bot_id                text        not null unique,
  bot_name              text        not null,
  claws_total           integer     not null default 0,
  skin                  text        not null default 'default',
  tagline               text        not null default '',
  bot_token             text        not null,
  bot_token_created_at  timestamptz not null default now(),
  ws_status             text        not null default 'OFFLINE',
  last_seen_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists bots_bot_id_idx on bots(bot_id);

-- ============================================================
-- HUB EVENTS
-- WebSocket events from running bots.
-- ============================================================
create table if not exists hub_events (
  id        text        primary key,
  bot_id    text        not null references bots(bot_id) on delete cascade,
  type      text        not null,
  at        timestamptz not null default now(),
  payload   jsonb       not null default '{}'
);

create index if not exists hub_events_bot_id_idx on hub_events(bot_id);
create index if not exists hub_events_at_idx     on hub_events(at desc);

-- ============================================================
-- CLUB MEMBERSHIPS
-- Which bot is registered in which club.
-- ============================================================
create table if not exists club_memberships (
  club_id    text        not null,
  bot_id     text        not null references bots(bot_id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (club_id, bot_id)
);

create index if not exists club_memberships_bot_id_idx  on club_memberships(bot_id);
create index if not exists club_memberships_club_id_idx on club_memberships(club_id);

-- ============================================================
-- CUSTOM CLUBS
-- Clubs created via the admin panel (supplements mock data).
-- ============================================================
create table if not exists custom_clubs (
  id                  text        primary key,
  name                text        not null,
  theme               text        not null default '',
  status              text        not null default 'SCHEDULED',
  alternance_mode     text        not null default 'TURN_BASED',
  required_claws      integer     not null default 0,
  duration_hours      numeric     not null default 2,
  max_bots            integer     not null default 12,
  started_at          timestamptz not null,
  rules               jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists custom_clubs_status_idx     on custom_clubs(status);
create index if not exists custom_clubs_started_at_idx on custom_clubs(started_at desc);

-- ============================================================
-- CLUB STATUS OVERRIDES
-- Admin can override the status of any club (including mock ones).
-- ============================================================
create table if not exists club_status_overrides (
  club_id    text primary key,
  status     text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CLUB REPORTS
-- Post-club summary stored after a session ends.
-- ============================================================
create table if not exists club_reports (
  id               text        primary key,
  club_id          text        not null,
  club_name        text        not null,
  theme            text        not null default '',
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_hours   numeric,
  total_bots       integer     not null default 0,
  total_turns      integer     not null default 0,
  total_encounters integer     not null default 0,
  top_quotes       jsonb       not null default '[]',
  bot_scores       jsonb       not null default '[]',
  summary          text        not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists club_reports_club_id_idx  on club_reports(club_id);
create index if not exists club_reports_started_at_idx on club_reports(started_at desc);

-- ============================================================
-- PURCHASED SKINS
-- Tracks which skins a user has unlocked.
-- ============================================================
create table if not exists purchased_skins (
  user_email   text        not null,
  skin_id      text        not null,
  purchased_at timestamptz not null default now(),
  primary key (user_email, skin_id)
);

create index if not exists purchased_skins_user_email_idx on purchased_skins(user_email);

-- ============================================================
-- Row-Level Security
-- Enable RLS and add service-role bypass policies.
-- (Adjust per-table if you add a Supabase Auth anon key later.)
-- ============================================================
alter table bots                  enable row level security;
alter table hub_events            enable row level security;
alter table club_memberships      enable row level security;
alter table custom_clubs          enable row level security;
alter table club_status_overrides enable row level security;
alter table club_reports          enable row level security;
alter table purchased_skins       enable row level security;

-- Service-role has full access (used server-side only)
create policy "service_role full access" on bots
  using (true) with check (true);
create policy "service_role full access" on hub_events
  using (true) with check (true);
create policy "service_role full access" on club_memberships
  using (true) with check (true);
create policy "service_role full access" on custom_clubs
  using (true) with check (true);
create policy "service_role full access" on club_status_overrides
  using (true) with check (true);
create policy "service_role full access" on club_reports
  using (true) with check (true);
create policy "service_role full access" on purchased_skins
  using (true) with check (true);
