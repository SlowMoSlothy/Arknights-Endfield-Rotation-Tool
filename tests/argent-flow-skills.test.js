import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { argentFlowSkills, argentFlowForm, argentFlowFormVariant } from '../tools/data/argent-flow-rotation-profile.js';
import { buildArgentFlowSkillsSql } from '../tools/build-argent-flow-skills.js';

const byId = id => structuredClone(argentFlowSkills.find(skill => skill.id === id));
function context() {
  const ctx = {
    console, window: { addEventListener() {} }, selectedTeam: [34, 1, null, null],
    operators: [{ id: 34, skills: structuredClone(argentFlowSkills) }],
    operatorForms: [{ operatorId: 34, formKey: argentFlowForm.form_key, name: 'Bolt Rush', activationSkillId: 3403, durationSeconds: 20, enabled: true }],
    operatorFormActionVariants: [{ operatorId: 34, formKey: argentFlowForm.form_key, actionKey: 'skill:3402', actionOverride: argentFlowFormVariant.action_override }],
    ARTS_REACTIONS: [], rotation: [], getSkillById: id => byId(id)
  };
  vm.createContext(ctx);
  for (const file of ['logic/comboEngine.js', 'logic/operatorStateEngine.js', 'ui/rotationGrid.js']) {
    vm.runInContext(fs.readFileSync(`endfield/js/${file}`, 'utf8'), ctx);
  }
  return ctx;
}

test('Argent Flow ships six actions, local source icons and reproducible guarded SQL', () => {
  assert.equal(argentFlowSkills.length, 6);
  assert.equal(new Set(argentFlowSkills.map(skill => skill.id)).size, 6);
  for (const skill of argentFlowSkills) {
    assert.ok(fs.existsSync(`endfield/${skill.iconSmall}`), skill.name);
    assert.match(skill.simulationLimitations, /Sunderization/);
  }
  const sql = buildArgentFlowSkillsSql();
  assert.equal(fs.readFileSync('supabase/argent_flow_skill_update.sql', 'utf8'), sql);
  assert.match(sql, /raise exception 'Argent Flow skills already exist/);
  assert.match(sql, /lock table public\.operators, public\.operator_skills, public\.operator_forms/);
  assert.match(sql, /insert into public\.operator_form_action_variants/);
  assert.doesNotMatch(sql, /on conflict|delete from/i);
});

test('Stars Shifted replaces the Battle Skill only within its 20-second form', () => {
  const ctx = context(), base = byId(3402);
  const intervals = ctx.buildOperatorFormIntervals([{ time: 5, sourceOperatorId: 34, skillData: byId(3403) }], 40);
  assert.equal(ctx.resolveOperatorFormAction(base, 34, 4, intervals).name, 'Darkness Cowed');
  const transformed = ctx.resolveOperatorFormAction(base, 34, 6, intervals);
  assert.equal(transformed.name, 'Bolt Rush');
  assert.equal(transformed.damageProfile.atkMultiplier, 7);
  assert.equal(transformed.damageProfile.element, 'electric');
  assert.equal(transformed.physicalStatusResolution, null);
  assert.equal(ctx.resolveOperatorFormAction(base, 34, 25, intervals).name, 'Darkness Cowed');
  assert.equal(ctx.resolveOperatorFormAction(base, 1, 6, intervals).name, 'Darkness Cowed');
  assert.equal(base.name, 'Darkness Cowed');
});

test('Bolt Rush forces Electrification, consumes Electric Infliction and conditionally applies Vulnerability', () => {
  const ctx = context(), original = byId(3405);
  const empty = ctx.resolveSlotModeSkillData(original, {});
  assert.equal(empty.forcedArtsStatusState.statusLevel, 1);
  assert.equal(empty.debuffs.some(effect => effect.id === 'vulnerable'), false);
  const three = ctx.resolveSlotModeSkillData(original, { electric_infliction: 3 });
  assert.equal(three.forcedArtsStatusState.statusLevel, 4);
  assert.equal(three.debuffs.find(effect => effect.id === 'electrification').statusLevel, 4);
  assert.equal(three.debuffs.filter(effect => effect.id === 'vulnerable').length, 1);
  assert.equal(ctx.resolveSlotModeSkillData(three, { electric_infliction: 3 }).debuffs.filter(effect => effect.id === 'vulnerable').length, 1);
  const state = { electric_infliction: 3 };
  ctx.applySkillEffectsToComboMap(original, state, true, false, { ...state });
  assert.equal(state.electric_infliction, undefined);
  assert.equal(state.electrification, 1);
  assert.equal(state.vulnerable, 1);
  assert.equal(ctx.collectEffectsFromSkill(original, { electric_infliction: 3 }).electric_infliction_consumed, 3);
  assert.equal(original.debuffs, undefined);
});

test('physical actions follow existing Lift and Crush rules, and the Ultimate records charge assumptions', () => {
  const ctx = context();
  const lift = ctx.collectEffectsFromSkill(byId(3402), { vulnerable: 1 });
  assert.equal(lift.lift, 1);
  assert.equal(lift.vulnerable, 1);
  const noVulnerability = ctx.resolveSlotModeSkillData(byId(3402), {});
  assert.equal(noVulnerability.physicalStatusState.convertedToVulnerable, true);
  const ultimate = byId(3404);
  assert.equal(ultimate.energy, 80);
  assert.equal(ultimate.damageSequences.reduce((total, sequence) => total + sequence.atkMultiplier, 0), 14.25);
  assert.match(ultimate.description, /stop the charge early/);
  assert.equal(ctx.resolveSlotModeSkillData(ultimate, { vulnerable: 2 }).physicalStatusState.consumedStacks, 2);
});

test('automatic Stars Shifted activates Bolt Rush for later actions without replacing its trigger retroactively', () => {
  const ctx = context();
  ctx.BUFF_REGISTRY = {}; ctx.DEBUFF_REGISTRY = {};
  ctx.window.__simulationOperatorFormIntervals = [];
  const events = [
    { kind: 'manual', time: 1, order: 0, sourceOperatorId: 34, skillData: byId(3402) },
    { kind: 'manual', time: 2, order: 1, sourceOperatorId: 34, skillData: byId(3402) }
  ];
  const automatic = ctx.collectSimulationFinalStrikeComboSkills(34, [], events);
  assert.equal(automatic.find(event => event.kind === 'auto')?.skillData.id, 3403);
  const intervals = ctx.window.__simulationOperatorFormIntervals;
  const resolved = ctx.resolveSimulationEventsWithOperatorForms(events, intervals);
  assert.equal(resolved[0].skillData.name, 'Darkness Cowed');
  assert.equal(resolved[1].skillData.name, 'Bolt Rush');
  assert.equal(ctx.resolveOperatorFormAction(byId(3402), 34, 21, intervals).name, 'Darkness Cowed');
});
