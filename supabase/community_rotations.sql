-- Community rotation table and public access policies.
-- Run this in the Supabase SQL Editor after supabase/schema.sql.

create extension if not exists pgcrypto;

create table if not exists public.community_rotations (
    id uuid primary key default gen_random_uuid(),
    game text not null default 'arknights_endfield',
    title text not null,
    description text not null default '',
    author_name text not null default '',
    share_code text not null,
    setup_version smallint not null default 2,
    team_operator_ids integer[] not null default '{}'::integer[],
    rotation_skill_ids integer[] not null default '{}'::integer[],
    element_types text[] not null default '{}'::text[],
    operator_classes text[] not null default '{}'::text[],
    payload jsonb not null default '{}'::jsonb,
    likes_count integer not null default 0,
    view_count integer not null default 0,
    is_public boolean not null default true,
    is_approved boolean not null default false,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (char_length(title) between 3 and 80),
    check (char_length(author_name) <= 40),
    check (char_length(description) <= 600),
    check (coalesce(array_length(team_operator_ids, 1), 0) between 1 and 4),
    check (coalesce(array_length(rotation_skill_ids, 1), 0) >= 1)
);

-- Keep this file safe to rerun while the Community feature is still evolving.
alter table public.community_rotations add column if not exists game text not null default 'arknights_endfield';
alter table public.community_rotations add column if not exists title text;
alter table public.community_rotations add column if not exists description text not null default '';
alter table public.community_rotations add column if not exists author_name text not null default '';
alter table public.community_rotations add column if not exists share_code text;
alter table public.community_rotations add column if not exists setup_version smallint not null default 2;
alter table public.community_rotations add column if not exists team_operator_ids integer[] not null default '{}'::integer[];
alter table public.community_rotations add column if not exists rotation_skill_ids integer[] not null default '{}'::integer[];
alter table public.community_rotations add column if not exists element_types text[] not null default '{}'::text[];
alter table public.community_rotations add column if not exists operator_classes text[] not null default '{}'::text[];
alter table public.community_rotations add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.community_rotations add column if not exists likes_count integer not null default 0;
alter table public.community_rotations add column if not exists view_count integer not null default 0;
alter table public.community_rotations add column if not exists is_public boolean not null default true;
alter table public.community_rotations add column if not exists is_approved boolean not null default false;
alter table public.community_rotations add column if not exists is_hidden boolean not null default false;
alter table public.community_rotations add column if not exists created_at timestamptz not null default now();
alter table public.community_rotations add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_community_rotations_public
    on public.community_rotations (game, is_public, is_approved, is_hidden, created_at desc);

create index if not exists idx_community_rotations_filters
    on public.community_rotations using gin (element_types, operator_classes);

alter table public.community_rotations enable row level security;

drop policy if exists "Public read approved community rotations" on public.community_rotations;
create policy "Public read approved community rotations"
    on public.community_rotations
    for select
    using (
        game = 'arknights_endfield'
        and is_public = true
        and is_approved = true
        and is_hidden = false
    );

drop policy if exists "Public submit community rotations for review" on public.community_rotations;
create policy "Public submit community rotations for review"
    on public.community_rotations
    for insert
    with check (
        game = 'arknights_endfield'
        and is_public = true
        and is_approved = false
        and is_hidden = false
        and char_length(title) between 3 and 80
        and char_length(author_name) <= 40
        and char_length(description) <= 600
        and coalesce(array_length(team_operator_ids, 1), 0) between 1 and 4
        and coalesce(array_length(rotation_skill_ids, 1), 0) >= 1
    );

create or replace function public.increment_community_rotation_view(target_rotation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    next_view_count integer;
begin
    update public.community_rotations
    set
        view_count = view_count + 1,
        updated_at = now()
    where id = target_rotation_id
        and game = 'arknights_endfield'
        and is_public = true
        and is_approved = true
        and is_hidden = false
    returning view_count into next_view_count;

    return coalesce(next_view_count, 0);
end;
$$;

revoke all on function public.increment_community_rotation_view(uuid) from public;
grant execute on function public.increment_community_rotation_view(uuid) to anon, authenticated;

create or replace function public.increment_community_rotation_like(target_rotation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    next_likes_count integer;
begin
    update public.community_rotations
    set
        likes_count = likes_count + 1,
        updated_at = now()
    where id = target_rotation_id
        and game = 'arknights_endfield'
        and is_public = true
        and is_approved = true
        and is_hidden = false
    returning likes_count into next_likes_count;

    return coalesce(next_likes_count, 0);
end;
$$;

revoke all on function public.increment_community_rotation_like(uuid) from public;
grant execute on function public.increment_community_rotation_like(uuid) to anon, authenticated;
