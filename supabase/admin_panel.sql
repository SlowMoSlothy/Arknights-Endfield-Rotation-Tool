-- Admin review setup for Community rotations.
-- Run this after supabase/community_rotations.sql.
-- Never put a Supabase service_role key into the frontend.

create table if not exists public.app_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

alter table public.community_rotations add column if not exists reviewed_at timestamptz;
alter table public.community_rotations add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.community_rotations add column if not exists review_note text not null default '';

drop policy if exists "Admins can read own admin row" on public.app_admins;
create policy "Admins can read own admin row"
    on public.app_admins
    for select
    to authenticated
    using (user_id = auth.uid());

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.app_admins
        where user_id = auth.uid()
    );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "Admins can read all community rotations" on public.community_rotations;
create policy "Admins can read all community rotations"
    on public.community_rotations
    for select
    to authenticated
    using (public.is_app_admin());

drop function if exists public.review_community_rotation(uuid, boolean);
drop function if exists public.review_community_rotation(uuid, boolean, text);
drop function if exists public.set_community_rotation_review_state(uuid, text, text);

create or replace function public.set_community_rotation_review_state(
    target_rotation_id uuid,
    review_state text,
    admin_review_note text default ''
)
returns table (
    id uuid,
    title text,
    is_approved boolean,
    is_hidden boolean,
    review_note text,
    reviewed_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_state text := lower(trim(coalesce(review_state, '')));
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if normalized_state not in ('pending', 'approved', 'rejected') then
        raise exception 'Unsupported review state: %', review_state using errcode = '22023';
    end if;

    return query
    update public.community_rotations as cr
    set
        is_approved = normalized_state = 'approved',
        is_hidden = normalized_state = 'rejected',
        review_note = left(coalesce(admin_review_note, ''), 400),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where cr.id = target_rotation_id
        and cr.game = 'arknights_endfield'
    returning
        cr.id,
        cr.title,
        cr.is_approved,
        cr.is_hidden,
        cr.review_note,
        cr.reviewed_at,
        cr.updated_at;
end;
$$;

create or replace function public.review_community_rotation(
    target_rotation_id uuid,
    approve boolean,
    admin_review_note text default ''
)
returns table (
    id uuid,
    title text,
    is_approved boolean,
    is_hidden boolean,
    review_note text,
    reviewed_at timestamptz,
    updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select *
    from public.set_community_rotation_review_state(
        target_rotation_id,
        case when approve then 'approved' else 'rejected' end,
        admin_review_note
    );
$$;

create or replace function public.review_community_rotation(
    target_rotation_id uuid,
    approve boolean
)
returns table (
    id uuid,
    title text,
    is_approved boolean,
    is_hidden boolean,
    review_note text,
    reviewed_at timestamptz,
    updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select *
    from public.review_community_rotation(target_rotation_id, approve, '');
$$;

revoke all on function public.set_community_rotation_review_state(uuid, text, text) from public;
revoke all on function public.review_community_rotation(uuid, boolean, text) from public;
revoke all on function public.review_community_rotation(uuid, boolean) from public;
grant execute on function public.set_community_rotation_review_state(uuid, text, text) to authenticated;
grant execute on function public.review_community_rotation(uuid, boolean, text) to authenticated;
grant execute on function public.review_community_rotation(uuid, boolean) to authenticated;

-- After creating your Supabase Auth user, add your user id as admin:
-- insert into public.app_admins (user_id)
-- values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
