-- Review snippets for submitted Community rotations.
-- Use these in the Supabase SQL Editor. Do not put a service_role key into the app.
-- Copy only the block you need, replace the example UUID, then run it.

-- 1. Show pending submissions.
select
    id,
    created_at,
    title,
    nullif(author_name, '') as author_name,
    description,
    team_operator_ids,
    rotation_skill_ids,
    element_types,
    operator_classes,
    setup_version,
    share_code,
    payload
from public.community_rotations
where game = 'arknights_endfield'
    and is_public = true
    and is_approved = false
    and is_hidden = false
order by created_at asc;

-- 2. Show one submission in detail.
-- select *
-- from public.community_rotations
-- where id = '00000000-0000-0000-0000-000000000000';

-- 3. Approve one submission.
-- update public.community_rotations
-- set
--     is_approved = true,
--     is_hidden = false,
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'
--     and game = 'arknights_endfield'
-- returning id, title, is_approved, is_hidden, updated_at;

-- 4. Hide or reject one submission.
-- update public.community_rotations
-- set
--     is_approved = false,
--     is_hidden = true,
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'
--     and game = 'arknights_endfield'
-- returning id, title, is_approved, is_hidden, updated_at;

-- 5. Fix title, author, or description before approval.
-- update public.community_rotations
-- set
--     title = 'New title',
--     author_name = 'Author name',
--     description = 'Short description',
--     updated_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'
--     and game = 'arknights_endfield'
-- returning id, title, author_name, description, updated_at;

-- 6. Show approved public rotations.
select
    id,
    created_at,
    title,
    nullif(author_name, '') as author_name,
    likes_count,
    view_count
from public.community_rotations
where game = 'arknights_endfield'
    and is_public = true
    and is_approved = true
    and is_hidden = false
order by created_at desc;

-- 7. Test the public view counter function.
-- select public.increment_community_rotation_view('00000000-0000-0000-0000-000000000000');

-- 8. Test the public like counter function.
-- select public.increment_community_rotation_like('00000000-0000-0000-0000-000000000000');
