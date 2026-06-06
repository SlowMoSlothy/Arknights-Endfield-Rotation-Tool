-- Migration: allow shared Kit gear items.
-- Run this once if Supabase rejects gear_slot = 'kit'.

alter table public.gear_pieces drop constraint if exists gear_pieces_gear_slot_check;

alter table public.gear_pieces
    add constraint gear_pieces_gear_slot_check
    check (gear_slot in ('body', 'hands', 'kit', 'kit1', 'kit2'));
