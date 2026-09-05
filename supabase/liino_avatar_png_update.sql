begin;

update public.operators
set
    icon_path = 'assets/operators/avatars/Liino.png',
    raw_data = jsonb_set(
        coalesce(raw_data, '{}'::jsonb),
        '{icon}',
        to_jsonb('assets/operators/avatars/Liino.png'::text),
        true
    ),
    updated_at = now()
where game = 'arknights_endfield'
  and slug = 'liino';

update public.operator_skills
set
    icon_path = 'assets/operators/avatars/Liino.png',
    updated_at = now()
where operator_id = (
    select id
    from public.operators
    where game = 'arknights_endfield'
      and slug = 'liino'
);

commit;
