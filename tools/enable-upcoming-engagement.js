import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { publicConfiguration, requestJson, checkDatabaseWriteAccess } from './sync-endfield-equipment.js';
import { upcomingOperatorPreviews } from './upcoming-operator-previews.js';

export function engagementVerificationSql() {
  const ids = upcomingOperatorPreviews.map(row => `'${row.id}'`).join(', ');
  return `begin;
do $$
declare
  target text;
  visitor uuid := '${randomUUID()}';
  before_counts jsonb;
  result jsonb;
begin
  if public.profile_engagement_target_exists('operator', 'preview:unknown')
     or public.profile_engagement_target_exists('enemy', 'preview:m3') then
    raise exception 'Unknown preview identity accepted';
  end if;
  if exists (select 1 from public.operators where game = 'arknights_endfield' and is_visible is not false
             and not public.profile_engagement_target_exists('operator', id::text)) then
    raise exception 'Existing operator engagement changed';
  end if;
  foreach target in array array[${ids}] loop
    if not public.profile_engagement_target_exists('operator', target) then
      raise exception 'Preview engagement target missing: %', target;
    end if;
    before_counts := public.get_profile_engagement('operator', target, visitor);
    perform public.record_profile_view('operator', target, visitor);
    result := public.record_profile_view('operator', target, visitor);
    if (result->>'view_count')::bigint <> (before_counts->>'view_count')::bigint + 1 then
      raise exception 'Repeated view was not deduplicated';
    end if;
    result := public.set_profile_reaction('operator', target, visitor, 'like');
    if result->>'reaction' <> 'like' or (result->>'like_count')::bigint <> (before_counts->>'like_count')::bigint + 1 then
      raise exception 'Like transition failed';
    end if;
    result := public.set_profile_reaction('operator', target, visitor, 'dislike');
    if result->>'reaction' <> 'dislike'
       or (result->>'like_count')::bigint <> (before_counts->>'like_count')::bigint
       or (result->>'dislike_count')::bigint <> (before_counts->>'dislike_count')::bigint + 1 then
      raise exception 'Dislike transition failed';
    end if;
    result := public.set_profile_reaction('operator', target, visitor, null);
    if result->>'reaction' is not null
       or (result->>'like_count')::bigint <> (before_counts->>'like_count')::bigint
       or (result->>'dislike_count')::bigint <> (before_counts->>'dislike_count')::bigint then
      raise exception 'Reaction removal failed';
    end if;
  end loop;
end;
$$;
rollback;`;
}

export async function enableUpcomingEngagement({ env = process.env, get = requestJson } = {}) {
  const token = env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Missing SUPABASE_ACCESS_TOKEN');
  const config = await publicConfiguration(env);
  const ref = new URL(config.url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
  if (!ref) throw new Error('Invalid Supabase project URL');
  const query = (sql, readOnly) => get(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: readOnly })
  });
  const prerequisites = await query("select to_regprocedure('public.get_profile_engagement(text,text,uuid)') is not null as ready", true);
  if (prerequisites?.[0]?.ready !== true) throw new Error('Apply profile_engagement.sql before enabling previews');
  await checkDatabaseWriteAccess(ref, token, get);
  await query(await fs.readFile(new URL('../supabase/upcoming_profile_engagement.sql', import.meta.url), 'utf8'), false);
  await query(engagementVerificationSql(), false);
  return { enabled: upcomingOperatorPreviews.length, verified: 'unique views, like, dislike, remove; verification rolled back' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  enableUpcomingEngagement().then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
