# Operator Implementation / Validation Progress

Track combo / CS / reaction logic validation for each operator.

---

## Completed

- [x] Tangtang
- [x] Last Rite
- [x] Xaihi
- [x] Yvonne
- [x] Ardelia
- [x] Antal
- [x] Alesh

---

## Pending Review / Validation

- [ ] Akekuri
- [ ] Arclight
- [ ] Avywenna
- [ ] Catcher
- [x] Chen
- [ ] Dapan
- [ ] Ember
- [ ] Estella
- [ ] Gilberta
- [x] Lifeng
- [x] Pogranichnik 
- [ ] Rossi
- [ ] Snowshine
- [x] Wulfgard
- [x] Zhuang 

---
### Snowshine
- Data implementation appears correct
- Requires dedicated enemy/event trigger: `operator_attacked_low_hp`
- Current engine only supports normal `operator_attacked`
- Full validation deferred until low HP attack event is implemented
- 
## Validation Checklist

Mark an operator as complete only after verifying:

- Combo Skill trigger conditions
- Cooldowns
- Buff / Debuff application
- Arts Reaction interactions
- Consume / Stack mechanics
- Self Trigger behavior
- Cross-Operator interactions
- Edge Case testing

---

## Notes

- Re-test completed operators after major engine changes.
- Add newly released operators to Pending Review.
- Keep cooldown values updated with latest game patches.
- Future Engine Enhancement: Catcher retaliation mechanic
  - If `operator_attacked` and Catcher has `shield`/`protection` active
  - Then apply `vulnerable` to attacker / target
