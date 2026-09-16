-- Structured enemy attributes for RotationForge Admin Suite 1.7.0.
-- Existing profiles, permissions and descriptions are preserved.
begin;
alter table public.enemies add column if not exists combat_details jsonb not null default '{}'::jsonb;
do $$ begin
 if not exists (select 1 from pg_constraint where conname='enemies_combat_details_object' and conrelid='public.enemies'::regclass) then
  alter table public.enemies add constraint enemies_combat_details_object check (jsonb_typeof(combat_details) = 'object');
 end if;
end $$;
notify pgrst, 'reload schema';
commit;
