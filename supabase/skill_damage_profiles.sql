-- Structured damage inputs for Simulation Mode.
-- atk_multiplier uses decimal notation: 2.5 means 250% ATK total scaling.

alter table public.operator_skills
    add column if not exists atk_multiplier numeric,
    add column if not exists flat_damage numeric not null default 0,
    add column if not exists hit_count smallint not null default 1,
    add column if not exists damage_element text,
    add column if not exists damage_verified boolean not null default false,
    add column if not exists damage_source_url text;

alter table public.operator_skills
    drop constraint if exists operator_skills_atk_multiplier_check,
    add constraint operator_skills_atk_multiplier_check
        check (atk_multiplier is null or atk_multiplier >= 0),
    drop constraint if exists operator_skills_flat_damage_check,
    add constraint operator_skills_flat_damage_check
        check (flat_damage >= 0),
    drop constraint if exists operator_skills_hit_count_check,
    add constraint operator_skills_hit_count_check
        check (hit_count >= 1);

comment on column public.operator_skills.atk_multiplier is
    'Total skill scaling as a decimal. Example: 2.5 = 250% of current ATK.';
comment on column public.operator_skills.flat_damage is
    'Flat damage added after ATK scaling and before enemy mitigation.';
comment on column public.operator_skills.hit_count is
    'Number of hits represented by the total ATK multiplier.';
comment on column public.operator_skills.damage_verified is
    'True only after the damage profile was checked against a reliable source.';
