-- Private user rotations for signed-in users.
-- Run this after supabase/community_rotations.sql.
-- The frontend only needs the Supabase publishable/anon key.

create extension if not exists pgcrypto;

create table if not exists public.user_rotations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    game text not null default 'arknights_endfield',
    title text not null,
    description text not null default '',
    share_code text not null,
    setup_version smallint not null default 2,
    team_operator_ids integer[] not null default '{}'::integer[],
    rotation_skill_ids integer[] not null default '{}'::integer[],
    element_types text[] not null default '{}'::text[],
    operator_classes text[] not null default '{}'::text[],
    payload jsonb not null default '{}'::jsonb,
    submitted_for_review_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (char_length(title) between 3 and 80),
    check (char_length(description) <= 600),
    check (coalesce(array_length(team_operator_ids, 1), 0) between 1 and 4),
    check (coalesce(array_length(rotation_skill_ids, 1), 0) >= 1)
);

alter table public.user_rotations add column if not exists user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;
alter table public.user_rotations add column if not exists game text not null default 'arknights_endfield';
alter table public.user_rotations add column if not exists title text;
alter table public.user_rotations add column if not exists description text not null default '';
alter table public.user_rotations add column if not exists share_code text;
alter table public.user_rotations add column if not exists setup_version smallint not null default 2;
alter table public.user_rotations add column if not exists team_operator_ids integer[] not null default '{}'::integer[];
alter table public.user_rotations add column if not exists rotation_skill_ids integer[] not null default '{}'::integer[];
alter table public.user_rotations add column if not exists element_types text[] not null default '{}'::text[];
alter table public.user_rotations add column if not exists operator_classes text[] not null default '{}'::text[];
alter table public.user_rotations add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.user_rotations add column if not exists submitted_for_review_at timestamptz;
alter table public.user_rotations add column if not exists created_at timestamptz not null default now();
alter table public.user_rotations add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_rotations_owner
    on public.user_rotations (user_id, updated_at desc);

alter table public.user_rotations enable row level security;

drop policy if exists "Users can read own rotations" on public.user_rotations;
create policy "Users can read own rotations"
    on public.user_rotations
    for select
    to authenticated
    using (user_id = auth.uid());

drop policy if exists "Users can insert own rotations" on public.user_rotations;
create policy "Users can insert own rotations"
    on public.user_rotations
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and game = 'arknights_endfield'
        and char_length(title) between 3 and 80
        and char_length(description) <= 600
        and coalesce(array_length(team_operator_ids, 1), 0) between 1 and 4
        and coalesce(array_length(rotation_skill_ids, 1), 0) >= 1
    );

drop policy if exists "Users can update own rotations" on public.user_rotations;
create policy "Users can update own rotations"
    on public.user_rotations
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        and game = 'arknights_endfield'
        and char_length(title) between 3 and 80
        and char_length(description) <= 600
    );

drop policy if exists "Users can delete own rotations" on public.user_rotations;
create policy "Users can delete own rotations"
    on public.user_rotations
    for delete
    to authenticated
    using (user_id = auth.uid());

create or replace function public.touch_user_rotation_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_touch_user_rotation_updated_at on public.user_rotations;
create trigger trg_touch_user_rotation_updated_at
    before update on public.user_rotations
    for each row
    execute function public.touch_user_rotation_updated_at();
