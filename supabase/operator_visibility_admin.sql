-- Admin-controlled public visibility for Endfield operators.
-- Existing operators remain visible after this migration.

alter table public.operators
    add column if not exists is_visible boolean not null default true;

create index if not exists idx_operators_public_visibility
    on public.operators (game, is_visible, sort_order, name);

create or replace function public.set_operator_visibility(
    target_operator_id integer,
    should_be_visible boolean
)
returns table (
    id integer,
    name text,
    is_visible boolean,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.operators as op
        where op.id = target_operator_id
            and op.game = 'arknights_endfield'
    ) then
        raise exception 'Unknown Endfield operator: %', target_operator_id using errcode = 'P0002';
    end if;

    return query
    update public.operators as op
    set
        is_visible = coalesce(should_be_visible, true),
        updated_at = now()
    where op.id = target_operator_id
        and op.game = 'arknights_endfield'
    returning op.id, op.name, op.is_visible, op.updated_at;
end;
$$;

revoke all on function public.set_operator_visibility(integer, boolean) from public;
grant execute on function public.set_operator_visibility(integer, boolean) to authenticated;

comment on column public.operators.is_visible is
    'Controls whether the operator appears in public RotationForge surfaces.';
