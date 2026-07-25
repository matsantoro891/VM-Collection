-- VM Collection / VM Life ARCHIVE
-- Initial schema: profiles, categories, items, media_assets + RLS + Storage
-- Apply via Supabase SQL Editor or CLI: supabase db push / migration

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users) — app profile, not auth metadata as source of truth
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  birth_date date,
  bio text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil do colecionador; separado de auth.users';
comment on column public.profiles.photo_path is 'Caminho estável no Storage (não URL assinada)';

-- ---------------------------------------------------------------------------
-- Categories — client id preserved (cat-hash or uuid string)
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists categories_user_updated_idx
  on public.categories (user_id, updated_at desc);

comment on column public.categories.image_path is 'Capa no Storage; caminho estável';
comment on column public.categories.deleted_at is 'Exclusão lógica para sync futuro entre aparelhos';

-- ---------------------------------------------------------------------------
-- Items — scalar fields only; binary media lives in Storage + media_assets
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null default '',
  category text not null default '',
  subcategory text not null default '',
  brand text not null default '',
  model text not null default '',
  scale text not null default '',
  year text not null default '',
  condition text not null default '',
  paid_value numeric not null default 0,
  estimated_value numeric not null default 0,
  acquired_at text not null default '',
  acquired_place text not null default '',
  serial text not null default '',
  tags text not null default '',
  description text not null default '',
  notes text not null default '',
  favorite boolean not null default false,
  desired boolean not null default false,
  rare boolean not null default false,
  owned boolean,
  free_memory_text text not null default '',
  memory text not null default '',
  related_person text not null default '',
  related_place text not null default '',
  related_event text not null default '',
  storage_location text not null default '',
  event_date text not null default '',
  country text not null default '',
  face_value text not null default '',
  material text not null default '',
  connected_items text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists items_user_updated_idx
  on public.items (user_id, updated_at desc);
create index if not exists items_user_category_idx
  on public.items (user_id, category);

-- ---------------------------------------------------------------------------
-- Media metadata — stable storage_path; never store signed URLs as source of truth
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  owner_type text not null check (owner_type in ('item', 'category', 'profile')),
  owner_id text not null,
  purpose text not null check (purpose in (
    'photo', 'video', 'attachment', 'memory_audio', 'cover', 'profile_photo'
  )),
  storage_path text not null,
  original_name text not null default 'arquivo',
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  sort_order integer not null default 0,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists media_assets_owner_idx
  on public.media_assets (user_id, owner_type, owner_id);
create unique index if not exists media_assets_storage_path_uidx
  on public.media_assets (user_id, storage_path);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.media_assets enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Categories
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
  on public.categories for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
  on public.categories for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
  on public.categories for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
  on public.categories for delete
  to authenticated
  using (auth.uid() = user_id);

-- Items
drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
  on public.items for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
  on public.items for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
  on public.items for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
  on public.items for delete
  to authenticated
  using (auth.uid() = user_id);

-- Media assets
drop policy if exists "media_select_own" on public.media_assets;
create policy "media_select_own"
  on public.media_assets for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "media_insert_own" on public.media_assets;
create policy "media_insert_own"
  on public.media_assets for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "media_update_own" on public.media_assets;
create policy "media_update_own"
  on public.media_assets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "media_delete_own" on public.media_assets;
create policy "media_delete_own"
  on public.media_assets for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-media',
  'user-media',
  false,
  52428800,
  null
)
on conflict (id) do update
set public = excluded.public;

-- Paths: {auth.uid()}/{owner_type}/{owner_id}/{asset_id}
drop policy if exists "user_media_select_own" on storage.objects;
create policy "user_media_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_media_insert_own" on storage.objects;
create policy "user_media_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_media_update_own" on storage.objects;
create policy "user_media_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_media_delete_own" on storage.objects;
create policy "user_media_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
