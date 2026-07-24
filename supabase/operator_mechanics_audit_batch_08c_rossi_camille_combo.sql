-- Operator mechanics audit Batch 08C
-- Fixes the Camille BS -> Rossi BS -> Rossi CS opener.
--
-- Physical-status rule:
-- * A Lift skill used against an enemy without Vulnerability applies the first
--   Vulnerability stack instead of Lift.
-- * Against an already Vulnerable enemy, Lift is applied and adds another
--   Vulnerability stack.
--
-- Rossi is allowed to satisfy her own Combo Skill trigger with Crimson Shadow,
-- provided that an Arts Infliction is already active.

begin;

update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
  "physicalStatusResolution": {
    "vulnerabilityMode": "stack",
    "vulnerableEffect": "vulnerable",
    "statusEffect": "lift",
    "vulnerableApplication": {
      "name": "Vulnerable",
      "visible": true,
      "stacksApplied": 1,
      "maxStacks": 4,
      "iconBase": "assets/debuffs/vulnerable"
    },
    "statusApplication": {
      "name": "Lift",
      "visible": true,
      "iconBase": "assets/debuffs/lift"
    },
    "verified": true,
    "sourceUrl": "https://endfield.games/en/tutorials/battle/"
  },
  "mechanicsAudit": {
    "batch": "08C",
    "status": "verified",
    "notes": "Crimson Shadow uses the global Lift/Vulnerability status resolution."
  }
}'::jsonb
where operator_id = 5
  and id = 502;

update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
  "allowSelfTrigger": true,
  "mechanicsAudit": {
    "batch": "08C",
    "status": "verified",
    "notes": "Rossi can satisfy Moment of Blazing Shadow with Vulnerability created by her own Battle Skill while an Arts Infliction is active."
  }
}'::jsonb
where operator_id = 5
  and id = 503;

commit;

select
    operator_id,
    id,
    name,
    raw_data->'physicalStatusResolution' as physical_status_resolution,
    raw_data->>'allowSelfTrigger' as allow_self_trigger
from public.operator_skills
where operator_id = 5
  and id in (502, 503)
order by id;
