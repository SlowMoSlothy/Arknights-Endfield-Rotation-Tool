-- Admin-only editor for Endfield operator catalog fields.
-- Run after supabase/admin_panel.sql and supabase/schema.sql.

drop function if exists public.update_operator_profile(integer, jsonb);

create or replace function public.update_operator_profile(
    target_operator_id integer,
    profile_data jsonb
)
returns table (
    id integer,
    game text,
    slug text,
    name text,
    star smallint,
    operator_class text,
    element_type text,
    weapon_type text,
    icon_path text,
    can_enter_ultimate_state boolean,
    is_visible boolean,
    sort_order integer,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_slug text := lower(trim(coalesce(profile_data ->> 'slug', '')));
    normalized_name text := trim(coalesce(profile_data ->> 'name', ''));
    normalized_class text := trim(coalesce(profile_data ->> 'operatorClass', ''));
    normalized_element text := lower(trim(coalesce(profile_data ->> 'elementType', '')));
    normalized_weapon text := lower(trim(coalesce(profile_data ->> 'weaponType', '')));
    normalized_star integer;
    normalized_sort_order integer;
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if profile_data is null or jsonb_typeof(profile_data) <> 'object' then
        raise exception 'Operator profile must be a JSON object' using errcode = '22023';
    end if;

    if normalized_name = '' or length(normalized_name) > 120 then
        raise exception 'Operator name is required and must not exceed 120 characters' using errcode = '22023';
    end if;
    if normalized_slug !~ '^[a-z0-9][a-z0-9_]{0,63}$' then
        raise exception 'Operator slug may only contain lowercase letters, numbers, and underscores' using errcode = '22023';
    end if;
    if normalized_class = '' or normalized_element = '' or normalized_weapon = '' then
        raise exception 'Class, element, and weapon type are required' using errcode = '22023';
    end if;

    begin
        normalized_star := (profile_data ->> 'star')::integer;
        normalized_sort_order := (profile_data ->> 'sortOrder')::integer;
    exception when invalid_text_representation then
        raise exception 'Stars and sort order must be whole numbers' using errcode = '22023';
    end;
    if normalized_star not between 1 and 6 then
        raise exception 'Stars must be between 1 and 6' using errcode = '22023';
    end if;
    if normalized_sort_order is null then
        raise exception 'Sort order must be a whole number' using errcode = '22023';
    end if;

    if not exists (
        select 1 from public.operators as existing
        where existing.id = target_operator_id and existing.game = 'arknights_endfield'
    ) then
        raise exception 'Unknown Endfield operator: %', target_operator_id using errcode = 'P0002';
    end if;

    return query
    update public.operators as op
    set
        slug = normalized_slug,
        name = normalized_name,
        star = normalized_star::smallint,
        operator_class = normalized_class,
        element_type = normalized_element,
        weapon_type = normalized_weapon,
        icon_path = trim(coalesce(profile_data ->> 'iconPath', '')),
        can_enter_ultimate_state = coalesce((profile_data ->> 'canEnterUltimateState')::boolean, false),
        is_visible = coalesce((profile_data ->> 'isVisible')::boolean, true),
        sort_order = normalized_sort_order,
        updated_at = now()
    where op.id = target_operator_id and op.game = 'arknights_endfield'
    returning
        op.id, op.game, op.slug, op.name, op.star, op.operator_class,
        op.element_type, op.weapon_type, op.icon_path, op.can_enter_ultimate_state,
        op.is_visible, op.sort_order, op.updated_at;
end;
$$;

revoke all on function public.update_operator_profile(integer, jsonb) from public;
grant execute on function public.update_operator_profile(integer, jsonb) to authenticated;

comment on function public.update_operator_profile(integer, jsonb) is
    'Validates and updates editable Endfield operator catalog fields for app admins.';
