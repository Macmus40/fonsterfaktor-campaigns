-- FönsterFaktor Campaigns — initial Postgres schema (Supabase)
-- Apply with: supabase db push / SQL editor / `npm run db:migrate` when linked.

create extension if not exists "pgcrypto";

-- --- campaigns ---
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  product text not null,
  goal text not null,
  destination_url text not null,
  market text not null default 'SE',
  region text,
  status text not null default 'draft'
    check (status in ('draft','ready','active','paused','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  title text not null,
  storage_path text,
  url text,
  mime_type text,
  width int,
  height int,
  duration_sec double precision,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.content_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  locale text not null default 'sv-SE',
  channel_hint text,
  headline text not null,
  body text not null,
  cta text,
  label text not null,
  status text not null default 'draft'
    check (status in ('draft','approved','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  publication_id uuid,
  destination_url text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel text not null,
  external_id text,
  content_variant_id uuid references public.content_variants(id),
  material_ids uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft','scheduled','publishing','published','paused','ended','failed','ambiguous')),
  scheduled_at timestamptz,
  publish_mode text not null default 'manual'
    check (publish_mode in ('manual','test','connected')),
  confirmation_kind text
    check (confirmation_kind is null or confirmation_kind in ('manual','test','platform')),
  post_url text,
  campaign_link_id uuid references public.links(id),
  last_attempt_id uuid,
  published_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.links
  drop constraint if exists links_publication_id_fkey;
alter table public.links
  add constraint links_publication_id_fkey
  foreign key (publication_id) references public.publications(id) on delete set null;

create table if not exists public.publication_attempts (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  mode text not null check (mode in ('manual','test','connected')),
  outcome text not null
    check (outcome in ('success','failure','ambiguous','pending','skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text,
  response_json jsonb not null default '{}'::jsonb,
  platform_post_id text,
  platform_post_url text,
  idempotency_key text not null unique,
  reconciled_from_attempt_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_handoffs (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel text not null,
  post_url text,
  platform_post_id text,
  campaign_link_id uuid,
  confirmation_kind text not null,
  handed_off_at timestamptz not null default now(),
  payload_json jsonb not null default '{}'::jsonb
);

create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  link_id uuid references public.links(id) on delete set null,
  publication_id uuid references public.publications(id) on delete set null,
  source text not null check (source in ('tagged_link','din_next')),
  event_type text not null,
  occurred_at timestamptz not null default now(),
  payload_json jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.din_next_inquiries (
  id uuid primary key default gen_random_uuid(),
  external_inquiry_id text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  link_id uuid references public.links(id) on delete set null,
  publication_id uuid references public.publications(id) on delete set null,
  status text not null default 'received'
    check (status in ('received','synced','closed','error')),
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  unique (external_inquiry_id)
);

create table if not exists public.direct_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  email text,
  phone text,
  name text,
  source text not null default 'manual_panel',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  publication_id uuid references public.publications(id) on delete set null,
  metric text not null,
  value double precision not null default 0,
  window_start timestamptz,
  window_end timestamptz,
  source text not null check (source in ('tagged_link','din_next','mixed')),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_stats (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  publication_id uuid references public.publications(id) on delete set null,
  channel text not null,
  metric text not null,
  value double precision not null default 0,
  currency text,
  period_start timestamptz,
  period_end timestamptz,
  data_source text not null,
  verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_publications_due
  on public.publications (status, scheduled_at)
  where status = 'scheduled';

create index if not exists idx_conversion_events_campaign
  on public.conversion_events (campaign_id, occurred_at);

-- Private media bucket (Storage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-media',
  'campaign-media',
  false,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do nothing;

-- RLS: deny anon by default; service role / authenticated policies for panel
alter table public.campaigns enable row level security;
alter table public.materials enable row level security;
alter table public.content_variants enable row level security;
alter table public.publications enable row level security;
alter table public.publication_attempts enable row level security;
alter table public.links enable row level security;
alter table public.conversion_events enable row level security;
alter table public.din_next_inquiries enable row level security;
alter table public.direct_contacts enable row level security;
alter table public.measurements enable row level security;
alter table public.platform_stats enable row level security;
alter table public.analytics_handoffs enable row level security;

-- Authenticated operators can read/write panel tables (tighten later by org)
do $$
begin
  create policy campaigns_auth_all on public.campaigns for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy materials_auth_all on public.materials for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy variants_auth_all on public.content_variants for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy publications_auth_all on public.publications for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy attempts_auth_all on public.publication_attempts for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy links_auth_all on public.links for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy events_auth_select on public.conversion_events for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy inquiries_auth_select on public.din_next_inquiries for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy contacts_auth_all on public.direct_contacts for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy measurements_auth_all on public.measurements for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy platform_stats_auth_all on public.platform_stats for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy handoffs_auth_select on public.analytics_handoffs for select to authenticated using (true);
exception when duplicate_object then null;
end $$;

-- Storage: authenticated users manage objects in campaign-media
do $$
begin
  create policy campaign_media_select on storage.objects for select to authenticated
    using (bucket_id = 'campaign-media');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy campaign_media_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'campaign-media');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy campaign_media_update on storage.objects for update to authenticated
    using (bucket_id = 'campaign-media');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy campaign_media_delete on storage.objects for delete to authenticated
    using (bucket_id = 'campaign-media');
exception when duplicate_object then null;
end $$;
