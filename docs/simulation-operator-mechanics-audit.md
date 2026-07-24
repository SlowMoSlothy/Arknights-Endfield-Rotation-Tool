# Sim-Mode Operator Mechanics Audit

Stand: 22. Juli 2026

## Ergebnis in Kürze

- Nach Batch 08 enthält Supabase 30 Operatoren und 125 Skills. Die Triggerbedingungen der neuen Combo-Skills liegen ebenfalls in `operator_skills.raw_data`.
- 99 Skills besitzen ein verifiziertes Schadensprofil. Die übrigen 11 sind überwiegend nicht direkt schadende Skills; das Fehlen eines Profils ist dort nicht automatisch ein Fehler.
- Die Combo-Engine wertet die generischen Supabase-Regeln `effect`, `anyOf`, `allOf`, `noneOf` und `minStacks` aus. Operatornamen oder operatorabhängige Triggerbedingungen sind dafür nicht nötig.
- Drei Combo-Trigger können im aktuellen Sim grundsätzlich nicht natürlich entstehen: Catcher, Ember und Snowshine benötigen gegnerische Angriffe, HP-Zustand oder das Aufladen eines gegnerischen Skills.
- Mehrere Skill-Sondermechaniken sind nur als sichtbarer Buff/Debuff vorhanden, verändern Schaden, Heilung, Schild, Folgeangriff oder Zustandsautomat aber noch nicht vollständig.
- Talente und Potentials werden seit Batch 07 über den allgemeinen, Supabase-gesteuerten Passive-Resolver schrittweise ergänzt.
- Die aktuelle öffentliche Operatorliste umfasst 30 Operatoren. Arcane und Camille sind mit verifizierten Level-12-Kernwerten erfasst; Liino bleibt bis zur Veröffentlichung am 9. August 2026 ein klar gekennzeichneter Vorab-Datensatz ohne erfundene Multiplikatoren.

## Statuslegende

- 🟢 Combo-Trigger kann aus der Rotation automatisch entstehen.
- 🟡 Mindestens ein korrekter Triggerpfad oder eine zentrale Folgemechanik fehlt.
- 🔴 Trigger benötigt einen noch nicht vorhandenen Gegner-/HP-Ereignistyp.
- ⚪ Operator fehlt in Supabase.

Der Status bewertet primär den Combo-Trigger. Ein grüner Trigger bedeutet noch nicht, dass alle Talente, Potentials, Heilungs-, Schild- oder Mehrsequenzmechaniken vollständig simuliert werden.

## Operatorliste

| Operator | Combo-Status | Aktueller Befund / nächste Arbeit |
|---|---:|---|
| Akekuri | 🟢 | `stagger` funktioniert; Batch 02 ergänzt einen platzierbaren Stagger-Node-Treffer. Batch 07A berechnet Cheer of Victory aus dem aktuellen Intellect-Wert und enthält Positive Feedback als P1-Regel. |
| Alesh | 🟢 | Reaktions-/Statusverbrauch wird generisch erkannt. Batch 07B berechnet Rare Fin als reproduzierbaren Erwartungswert aus der Intellect-skalierten Chance sowie abweichendem Schaden/SP-Gewinn; Flash-frozen und P1 sind datengetrieben. |
| Antal | 🟢 | `focus` plus Physical Status/Arts Infliction und das erneute Anwenden desselben Effekts sind datengetrieben vorhanden. Die vollständige Physical-Status-Taxonomie bleibt zu verifizieren. |
| Arclight | 🟢 | Electrification sowie deren Verbrauch können aus Supabase-Effekten triggern. |
| Ardelia | 🟢 | Final Strike plus `noneOf` wird unterstützt. Batch 06B erzeugt beim BS drei 10-s-Dolly-Schatten als Battlefield Resource; ein platzierbares Pickup-Event verbraucht je einen Schatten und berechnet `63 + 0,53 × Will` Treatment. Zufällige Ult-Drops bleiben im Talent-/Randomness-Backlog. |
| Avywenna | 🟢 | Final Strike plus Electric Infliction/Electrification wird unterstützt. |
| Catcher | 🟢 | Batch 02 stellt die Triggerereignisse bereit. Batch 06B korrigiert BS/CS/Ult auf Level 12 und berechnet den 10-s-CS-Schild mit `810 + effektive DEF × 5,06`; Resilient Defense steuert dafür `Will × 0,12` DEF bei. Das exakte Guard-Fenster bleibt im Timing-Backlog. |
| Chen Qianyu | 🟢 | Das Entstehen von Vulnerability triggert die Combo automatisch. |
| Da Pan | 🟢 | Vier Vulnerability-Stacks und deren Verbrauch werden unterstützt. |
| Ember | 🟢 | Batch 06 berechnet den CS auf Level 12 mit `675 + 1,58 × Will`, zeigt Protection und berechnet den 10-s-Team-Schild der Ult aus 25% ihrer aktuellen Max-HP. Batch 07A stapelt Pay the Ferric Price nach Angriffen bis 3-mal als 9%-ATK-Buff für 7 s. |
| Endministrator | 🟢 | Das alte Stringformat des Supabase-Triggers wird jetzt generisch akzeptiert; Batch 01 normalisiert es zusätzlich. Originium-Crystal-Verbrauch durch BS/Ultimate ist vorhanden. |
| Estella | 🟢 | Solidification kann die Combo automatisch auslösen. Batch 07B bildet den einmaligen 15-SP-Refund nach Shatter, die P1-Anpassung der Physical Susceptibility und P5-Ultimate-Energie ab. Zusatzschaden gegen Solidification ist noch gesondert zu prüfen. |
| Fluorite | 🟢 | Stack-Trigger und Matching-Infliction funktionieren. Batch 05B trennt das Anheften von der nach exakt 3,65 s ausgelösten Explosion; Apex Prankster zündet vorzeitig mit 30% DMG Boost. |
| Gilberta | 🟢 | Arts Reaction triggert automatisch. Batch 05C bildet ihr Gravity Field ab; Batch 06B weist für BS/CS bei mindestens zwei getroffenen Gegnern `108 + 0,9 × Intellect` Treatment aus. |
| Laevatain | 🟢 | Combustion/Corrosion triggert; Melting-Flames-Stacks existieren. Batch 07B aktiviert bei vier Stacks 15 Heat-Resistance-Ignore für 20 s und bildet Re-Ignition mit Protection und Max-HP-Regeneration ab. Die vollständige BS-/Ultimate-Interaktion bleibt zu prüfen. |
| Last Rite | 🟢 | Drei Cryo-Infliction-Stacks triggern. Verbrauchsskalierung, Ultimate-Energie und Cryo Susceptibility sind generisch vorbereitet und benötigen die Migration `last_rite_winters_devourer_mechanics.sql` in Supabase. |
| Lifeng | 🟢 | Final Strike plus Physical Susceptibility/Breach wird unterstützt. Batch 05C macht Link bis 4 stapelbar, verbraucht alle Stacks beim nächsten BS/Ult, wendet den multiplikativen Stackwert an und ergänzt Lifengs dritten Ult-Hit. |
| Mi Fu | 🟢 | Drei Vulnerability-Stacks, Verbrauchsschwelle und Qingbo-Skillfolge sind umgesetzt. Batch 07B ergänzt World-Splitter-Bedingung, Vigilant-Fury-Schild sowie P1/P3/P4/P5 datengetrieben. |
| Perlica | 🟢 | Final Strike triggert automatisch. |
| Pogranichnik | 🟢 | Batch 05 erhält die verbrauchte Vulnerability-Anzahl im Trigger und löst daraus 1–3 Sequenzen, den verstärkten dritten Hieb bei 4 Stacks sowie 5/12/25/35 SP auf. |
| Rossi | 🟢 | Batch 05B trennt beide Combo-Sequenzen. Sequenz 2 läuft automatisch weiter; ein manuell gesetzter zweiter CS innerhalb des Supabase-Fensters ersetzt sie als Perfect Timing, verbraucht erst dann Inflictions und setzt den Crit-Buff. |
| Snowshine | 🟢 | Batch 06 berechnet den Team-CS aus aktuellem Will: Sofortheilung plus 6 HoT-Ticks über 3 s; unter 55% Ziel-HP wird der Talentbonus von 25% separat ausgewiesen. BS/Ult-Werte, Protection, SP Return und Snow-Zone sind auf Level 12. Das exakte BS-Parry-Zeitfenster bleibt im Timing-Backlog. |
| Tangtang | 🟢 | Batch 05D korrigiert CS/BS auf Level 12. OLDEN STARE endet regulär nach 4 s mit 400% Rogue Wave; ein Team-Dive beendet es vorher mit 700%, wandelt bis zu 2 Whirlpools plus 1 garantierten Waterspout um, nutzt +60% Waterspout-DMG und gewährt dabei bewusst keine SP. BS wandelt Whirlpools weiter in 20/40 SP sowie 5%/10% Arts Susceptibility um. |
| Wulfgard | 🟢 | Jede elementare Arts Infliction kann triggern. |
| Xaihi | 🟢 | Batch 06B macht beide Auxiliary-Crystal-Ladungen zu echten Treatment-Procs (`324 + 0,76 × Will`) nach Final Strikes. Bei voller HP wird der alternative 15%-Arts-Amp für 25 s ausgewiesen; nach der zweiten verbrauchten Ladung entsteht weiterhin datengetrieben `auxiliary_crystal_used_up`. |
| Yvonne | 🟡 | Final Strike plus Solidification triggert. Batch 04 verbraucht `yvonne_next_attack_final_strike` beim nächsten Basisangriff und erzeugt datengetrieben ein Final-Strike-Ereignis; die Supabase-Migration muss noch ausgeführt werden. |
| Zhuang Fangyi | 🟡 | Final-Strike-Pfad funktioniert. Batch 04 erzeugt nach einem platzierbaren Stagger-Zustand beim nächsten Basisangriff ein generisches Finisher-Ereignis; die Supabase-Migration muss noch ausgeführt werden. |
| Arcane | 🟡 | Batch 08 ergänzt Level-12-Basis-, BS-, CS-, Ultimate- und Dive-Werte. INT/WILL wird generisch aus den aktuellen Loadout-Attributen gewählt; Trigger und Varianten liegen in Supabase. Cluster-Strike-Automatik und die vollständige zweite Ultimate-Sequenz bleiben im Mehrsequenz-Backlog. |
| Camille | 🟢 | Batch 08 ergänzt Level-12-Werte, Firefang Vesperwings, Heat-Trigger und die 15-s-Form Hunter Pursuit als kostenlosen Combo Skill. Die markenabhängige 100%-Explosion wird datengetrieben zum CS addiert. |
| Liino | 🟡 | Batch 08 nimmt die veröffentlichten Skillbeschreibungen und den Supabase-Trigger „Vocalist Stance + Arts Reaction“ auf. Zahlen und Dauern bleiben bewusst unverifiziert/null, bis Liino am 9. August 2026 erscheint. |

## Abarbeitungsreihenfolge

- [x] Universeller Dive Attack: eigener Supabase-Skill pro vorhandenem Operator, Level-12-Schaden und gemeinsames Icon
- [ ] Dive Attack: `operator_dive_attacks.sql` in Supabase ausfuehren
- [x] Audit der Supabase-Skills, Schadensprofile und Combo-Trigger
- [x] Batch 01: Endministrator-Format, Catcher-Bedingung, Tangtang-Arts-Burst, Zhuang-Finisher und Fluorite-Namen korrigieren
- [x] Batch 02: generische externe Sim-Ereignisse (`operator_attacked`, HP-Schwelle, `enemy_skill_charging`, Stagger Node); Supabase-Migration muss ausgeführt sein
- [x] Batch 03: Arts-Burst-Ereignisse vor der Auto-Combo-Auswertung einspeisen
- [x] Batch 04: generischer Folgeangriff-/Finisher-/„next attack“-Resolver und Migration erstellt
- [ ] Batch 04: `operator_mechanics_audit_batch_04.sql` in Supabase ausführen
- [x] Batch 05A: verbrauchte Stack-Anzahl im Trigger erhalten; Pogranichnik-Sequenzen/SP und Rossi-Infliction-Skalierung generisch auflösen
- [ ] Batch 05A: `operator_mechanics_audit_batch_05.sql` in Supabase ausführen
- [x] Batch 05B: verzögerte Skills/Folgeereignisse und manuelle zweite Skillsequenzen (Fluorite, Rossi)
- [x] Batch 05C: persistente Felder und Ressourcen-Umwandlungen (Tangtang Whirlpool/Waterspout, Gilberta-Feld, Lifeng-Link)
- [ ] Batch 05C: `operator_mechanics_audit_batch_05c.sql` in Supabase ausführen
- [x] Batch 05D: Tangtang Level-12-Werte, OLDEN-STARE-Laufzeit, Team-Dive-Abbruch und Riot-Bringer-Waterspouts datengetrieben auflösen
- [ ] Batch 05D: `operator_mechanics_audit_batch_05d_tangtang.sql` in Supabase ausführen
- [x] Batch 06A: generisches Sustain-Profil sowie Ember- und Snowshine-Heilung/Schild/Protection auf Level 12
- [ ] Batch 06A: `operator_mechanics_audit_batch_06_sustain.sql` in Supabase ausführen
- [x] Batch 06B: Xaihi-Crystal-Treatments, Ardelia-Pickups, Gilberta-Mehrzielheilung und Catcher-DEF-Schilde
- [ ] Batch 06B: `operator_mechanics_audit_batch_06b_sustain.sql` in Supabase ausführen
- [x] Batch 07A: Talent-/Potential-Regelschema, generischer Resolver, Operator-Potential-Auswahl sowie Akekuri- und Ember-Referenzregeln
- [x] Batch 07B: weitere verifizierte Talente/Potentials (Mi Fu, Estella, Laevatain und Alesh-Erwartungswert)
- [ ] Batch 07B: `operator_mechanics_audit_batch_07b_passives.sql` in Supabase ausführen
- [x] Batch 08: Arcane, Camille und Liino in Supabase aufnehmen; Migration `operator_mechanics_audit_batch_08_new_operators.sql` erstellt
- [ ] Batch 08: `operator_mechanics_audit_batch_08_new_operators.sql` in Supabase ausführen
- [ ] Pro Batch: gezielte Unit-Tests, komplette Testsuite und Browserprüfung mit Share Codes

## Datenhaltung

Gameplaybedingungen gehören in Supabase. Der Client darf nur generische Operator-unabhängige Resolver enthalten. Für Combo-Trigger ist das Zielmodell:

```json
{
  "comboTriggerMode": "all",
  "comboTriggers": [
    { "effect": "final_strike", "minStacks": 1 },
    {
      "anyOf": [
        { "effect": "electric_infliction", "minStacks": 1 },
        { "effect": "electrification", "minStacks": 1 }
      ]
    }
  ]
}
```

Der Resolver kennt dabei keine Operator-ID und keinen Operatornamen. Neue Bedingungen werden als generische Ereignisse oder Vergleichsoperatoren ergänzt; die konkrete Kombination und alle Zahlenwerte bleiben in Supabase.

## Quellenbasis

- Aktuelle Operatorliste und einzelne Operatorseiten auf Endfield Talos Wiki
- Arts Infliction, Arts Burst, Arts Intensity und Combat Mechanic auf Endfield Talos Wiki
- Aktive Tabellen `operators`, `operator_skills`, `buff_registry`, `debuff_registry`, `infliction_mechanics`, `reaction_rules`, `effect_groups` und `effect_duration_overrides` in Supabase
