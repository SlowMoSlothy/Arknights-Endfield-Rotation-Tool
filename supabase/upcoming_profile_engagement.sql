-- Enable the ten announced preview profiles in the existing private engagement system.
-- Run after profile_engagement.sql. No operator rows, grants or counters are changed.
begin;

create or replace function public.profile_engagement_target_exists(
    p_content_type text,
    p_content_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select case
        when p_content_type = 'operator' then exists (
            select 1 from public.operators
            where id::text = p_content_id
                and game = 'arknights_endfield'
                and is_visible is not false
        ) or exists (
            select 1 from (values
                ('warfarin', 'Warfarin'),
                ('signal-prelink-02', 'Unrevealed Operator 1'),
                ('m3', 'M3'),
                ('signal-prelink-03-background', 'Unrevealed Operator 2'),
                ('signal-prelink-04', 'Unrevealed Operator 3'),
                ('signal-prelink-05', 'Unrevealed Operator 4'),
                ('signal-prelink-06', 'Unrevealed Operator 5'),
                ('signal-prelink-07', 'Unrevealed Operator 6'),
                ('signal-prelink-08', 'Unrevealed Operator 7'),
                ('signal-prelink-09', 'Unrevealed Operator 8')
            ) as preview(slug, name)
            where p_content_id = 'preview:' || preview.slug
                and not exists (
                    select 1 from public.operators op
                    where op.game = 'arknights_endfield'
                        and (
                            regexp_replace(lower(coalesce(op.slug, '')), '[^a-z0-9]', '', 'g') = regexp_replace(preview.slug, '[^a-z0-9]', '', 'g')
                            or regexp_replace(lower(coalesce(op.name, '')), '[^a-z0-9]', '', 'g') = regexp_replace(lower(preview.name), '[^a-z0-9]', '', 'g')
                            or regexp_replace(lower(coalesce(op.raw_data->>'previewSlug', '')), '[^a-z0-9]', '', 'g') = regexp_replace(preview.slug, '[^a-z0-9]', '', 'g')
                        )
                )
        )
        when p_content_type = 'enemy' then exists (
            select 1 from public.enemies
            where id::text = p_content_id and is_visible = true
        )
        else false
    end;
$$;

revoke all on function public.profile_engagement_target_exists(text, text) from public, anon, authenticated;

commit;
