-- Arknights: Endfield gear set effects for Supabase.
-- Run after supabase/endfield_gear_pieces_seed.sql. Safe to rerun.
-- Source: https://www.icy-veins.com/arknights-endfield/gear

begin;

with set_effects(set_name, set_effect) as (
    values
    ('Bonekrusha', '3-piece set effect: Wearer''s ATK +15%. When the wearer casts a combo skill, the wearer gains 1 stack of Bonekrushing Smash that grants the wearer''s next battle skill DMG Dealt +30%. Bonekrushing Smash can stack 2 time(s).'),
    ('Eternal Xiranite', '3-piece set effect: Wearer''s HP +1000. After the wearer applies Amp, Protected, Susceptibility, or Weakened, other teammates gain DMG Dealt +16% for 15s. This effect cannot stack.'),
    ('Frontiers', '3-piece set effect: Wearer''s Combo Skill Cooldown Reduction +15%. After the wearer''s skill recovers SP, the team gains DMG +16% for 15s. This effect cannot stack.'),
    ('Hot Work', '3-piece set effect: Wearer''s Arts Intensity +30. After the wearer applies Combustion, the wearer gains Heat DMG +50% for 10s. After the wearer applies Corrosion, the wearer gains Nature DMG +50% for 10s. The aforementioned effects cannot stack.'),
    ('LYNX', '3-piece set effect: Wearer''s HP Treatment Efficiency +20%. After the wearer gives HP treatment to an allied target, that target also gains 15% DMG Reduction against all types of DMG for 10s. If the said treatment exceeds the target''s Max HP, the target gains 30% DMG Reduction against all types of DMG. The aforementioned effects cannot stack.'),
    ('MI Security', '3-piece set effect: Wearer''s Critical Rate +5%. After the wearer scores a critical hit, the wearer gains ATK +5% for 5s. This effect can reach 5 stacks. At max stacks, grant an additional Critical Rate +5%. This effect cannot stack.'),
    ('Pulser Labs', '3-piece set effect: Wearer''s Arts Intensity +30. After the wearer applies Electrification, the wearer gains Electric DMG +50% for 10s. After the wearer applies Solidification, the wearer gains Cryo DMG +50% for 10s. The aforementioned effects cannot stack.'),
    ('Qingbo', '3-piece set effect: Wearer''s Combo Skill Cooldown Reduction +15%. When the wearer casts a combo skill, the wearer gains Skill DMG Dealt +20% (for every skill) for 15s. This effect can reach 2 stacks. Duration of each stack is counted separately.'),
    ('Swordmancer', '3-piece set effect: Wearer''s Stagger Efficiency Bonus +20%. After the wearer applies a Physical Status, the wearer also performs 1 hit that deals 250% ATK of Physical DMG and [10 Stagger]. Effect trigger cooldown: 15s.'),
    ('Tide Surge', '3-piece set effect: Wearer''s Skill DMG Dealt +20%. After the wearer applies 2 or more stacks of Arts Infliction on the enemy, the wearer gains Arts DMG Dealt +35% for 15s. This effect cannot stack.'),
    ('Type 50 Yinglung', '3-piece set effect: Wearer''s ATK +15%. When any operator in the team casts a battle skill, the wearer gains 1 stack of Yinglung''s Edge that gives DMG +20% to the wearer''s next combo skill. Yinglung''s Edge can stack 3 time(s).'),
    ('Xiranflow', '3-piece set effect: Wearer''s ATK +10%. Whenever the wearer consumes Electrification or Corrosion, the wearer gains a number of buff stacks equal to the Status Level of the Arts Reaction consumed, with each buff stack giving Electric DMG Dealt and Nature DMG Dealt +15% for 25s. The number of buff stacks maxes out at 3 stacks. Duration of each stack is counted separately.'),
    ('Æthertech', '3-piece set effect: Wearer''s ATK +8%. After the wearer applies Vulnerability, the wearer gains Physical DMG +8% for 15s. This effect can reach 4 stacks. If the target already has 4 stack(s) of Vulnerability, the wearer gains an additional Physical DMG +16% for 10s. This effect cannot stack.'),
    ('Aburrey''s Legacy', '3-piece set effect: Wearer''s Skill DMG +24%. When the wearer casts a battle skill, combo skill, or ultimate, the wearer gains ATK +5% for 15s. The buff from each of the three skill types is unique and does not stack with itself.'),
    ('Armored MSGR', '3-piece set effect: Wearer''s Strength +50. When the wearer''s HP is below 50%, the wearer gains 30% DMG Reduction against all types of DMG.'),
    ('Catastrophe', '3-piece set effect: Wearer''s Ultimate Gain Efficiency +20%. The wearer casts a battle skill, the action returns 50 SP. This effect only triggers 1 time per battle.'),
    ('Mordvolt Insulation', '3-piece set effect: Wearer''s Intellect +50. When the wearer''s HP is above 80%, Arts DMG +20%.'),
    ('Mordvolt Resistant', '3-piece set effect: Wearer''s Will +50. When the wearer''s HP is below 50%, Treatment Effect +30%.'),
    ('Roving MSGR', '3-piece set effect: Wearer''s Agility +50. When the wearer''s HP is above 80%, Physical DMG +20%.'),
    ('AIC Heavy', '3-piece set effect: Wearer''s HP +500. After the wearer defeats an enemy, the wearer restores 100 HP. Effect trigger cooldown: 5s.'),
    ('AIC Light', '3-piece set effect: Wearer''s HP +500. After the wearer defeats an enemy, the wearer gains ATK +20 for 5s.')
)
update public.gear_pieces
set
    raw_data = coalesce(public.gear_pieces.raw_data, '{}'::jsonb) || jsonb_build_object('setEffect', set_effects.set_effect),
    updated_at = now()
from set_effects
where public.gear_pieces.set_name = set_effects.set_name;

commit;
