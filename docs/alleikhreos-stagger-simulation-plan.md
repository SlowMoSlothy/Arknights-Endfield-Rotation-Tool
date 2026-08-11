# Alleikhreos Stagger Simulation Plan

Stand: 11. August 2026

## Ziel

Für das Team **Mi Fu / Chen Qianyu / Pogranichnik / Catcher Lv. 1** soll der Sim nicht nur Gesamt-DPS, sondern den Burst rund um Alleikhreos' Stagger-Fenster vergleichen.

## Verifizierte Boss-/Combat-Annahmen

- Vulnerability stapelt bis 4 und wird durch Crush/Breach vollständig verbraucht.
- Staggered-Gegner nehmen 30% mehr Schaden.
- Der erste Basic Attack des kontrollierten Operators während Stagger wird zum Finisher und stellt SP wieder her.
- Alleikhreos besitzt Stagger Nodes und lässt an diesen Foundite Weapons fallen.
- Phase 1 wechselt bei 50% HP in den Skript-/Übergangsabschnitt, sofern Alleikhreos nicht gerade gestaggered ist. RE:Crisis besitzt laut aktueller Wiki-Dokumentation nicht den Story-Damage-Cap bei ~45%.

Quellen:
- https://endfield.wiki.gg/wiki/Stagger
- https://endfield.wiki.gg/wiki/Vulnerable
- https://endfield.wiki.gg/wiki/Alleikhreos%2C_Chiliarch
- https://endfield.gryphline.com/en-us/news/1340

## Bereits im Rotation Tool vorhanden

Laut `docs/simulation-operator-mechanics-audit.md`:

- Chen Qianyu: Vulnerability-Erzeugung kann Combo automatisch triggern.
- Pogranichnik: verbrauchte Vulnerability-Anzahl bleibt im Trigger erhalten; 1–3 Sequenzen, verstärkter dritter Hit bei 4 Stacks sowie 5/12/25/35 SP sind implementiert.
- Mi Fu: 3-Vulnerability-Schwelle, Verbrauch, Qingbo-Skillfolge, World-Splitter-Bedingung sowie relevante Passive/Potentials sind implementiert.
- Catcher: Triggerereignisse sind vorhanden; für diesen Test bleibt er Lv. 1 und wird zunächst nicht als Damage-Carry bewertet.
- Damage Breakdown berücksichtigt Loadout-ATK, aktive ATK-Buffs, Crit und Weapon-Passive-State.

## Fehlende Boss-Ebene

Vor einem belastbaren Alleikhreos-Vergleich braucht die Simulation eine generische Enemy-State-Schicht. Sie soll keine Operatornamen kennen.

Minimal benötigte Zustände:

```js
enemyState = {
  maxHp: null,
  hp: null,
  staggerMax: 320,
  stagger: 0,
  staggeredUntil: null,
  damageTakenMultiplier: 1,
  phase: 1,
  staggerNodes: [],
  triggeredStaggerNodes: []
};
```

`staggerMax: 320` ist bis zur erneuten Quellenprüfung als Bossprofilwert zu behandeln, nicht als universeller Standard.

### Damage-Regel

Wenn `event.time < enemyState.staggeredUntil`, erhält der finale Schaden nach den bestehenden Buff-/Debuff-/Mitigation-Schritten einen separaten Faktor:

```text
staggerMultiplier = 1.30
```

Der Breakdown muss diesen Faktor separat ausweisen, damit kein Double-Dipping mit Physical Susceptibility/Breach entsteht.

### Finisher

Beim ersten Basic Attack des kontrollierten Operators innerhalb des Staggers:

- Event als `finisher` markieren,
- nur einmal pro Stagger zulassen,
- SP-Return separat protokollieren,
- vorhandene operator-/skillbezogene Finisher-Daten verwenden; keine pauschale erfundene Damage-Zahl einsetzen.

## Zu vergleichende Rotationsstrategien

### A — Fast Stagger

Stagger so früh wie möglich auslösen. Skills werden nicht gezielt für das Fenster gehalten.

Baseline: zeigt, wie viel ein unvorbereiteter früher Stagger bringt.

### B — Prepared Breach

1. Stagger-Leiste knapp unter den Trigger bringen.
2. 4 Vulnerability aufbauen.
3. Pogranichnik verbraucht 4 Vulnerability für maximales Breach.
4. Stagger auslösen.
5. Finisher + erneuter Vulnerability-Aufbau.
6. Mi Fu Crush/World Splitter im Stagger.

### C — Double Crush Stagger

Wie B, aber mit dem Ziel, innerhalb desselben Stagger-/Breach-Fensters zwei möglichst hoch gestackte Mi-Fu-Crush-Zyklen unterzubringen.

Dies ist der primäre Speedkill-Kandidat.

### D — Ultimate Loaded Stagger

Stagger bewusst verzögern, bis wichtige Ultimates/Buffs verfügbar sind. Danach Breach + Stagger + Finisher + Ult-/Mi-Fu-Burst.

Diese Variante darf nur gewinnen, wenn die zusätzliche Vorbereitungszeit durch eine niedrigere tatsächliche Kill Time kompensiert wird.

## Metriken

Für jede Variante ausgeben:

- Kill Time / simulierte Zeit bis Ziel-HP 0
- Zeitpunkt des ersten Staggers
- Gesamtschaden
- Schaden während Stagger
- Anteil des Gesamtschadens während Stagger
- Schaden je Operator während Stagger
- erster/zweiter Mi-Fu-Crush: Zeit, verbrauchte Vulnerability, Schaden
- World Splitter: Zeit und Schaden
- Breach: Start, Ende, verbrauchte Vulnerability
- SP beim Eintritt in Stagger und beim Ende
- Finisher-Operator, Finisher-Schaden und SP-Return
- verlorene Stagger-Zeit durch Animationen/Leerlauf
- Phase-1-HP am Ende des ersten Staggers

## Optimierungsziel

Nicht `max DPS over arbitrary window`, sondern zunächst:

```text
minimize(time_to_50_percent_hp)
```

und anschließend für RE:Crisis bzw. ein vollständig modelliertes Bossprofil:

```text
minimize(time_to_kill)
```

Das verhindert, dass ein theoretisch hoher langer DPS-Wert eine schlechtere Speedkill-Rotation gewinnt.

## Implementierungsreihenfolge

1. Generischen Enemy-State + Stagger-Multiplikator ergänzen.
2. Stagger-Gauge pro Damage-/Skill-Event aus vorhandenen Skilldaten speisen; fehlende Stagger-Werte explizit als unbekannt markieren.
3. Einmaligen Finisher pro Stagger modellieren.
4. Alleikhreos als Bossprofil/Datenobjekt hinzufügen, nicht als hardcodierte Operator-Logik.
5. Breakdown um Stagger-Metriken erweitern.
6. Vier Rotationsvarianten A–D als reproduzierbare Fixtures/Share-Codes anlegen.
7. Varianten gegeneinander ausführen und nach `time_to_50_percent_hp`, danach `time_to_kill`, sortieren.

## Validierungsregel

Keine erfundenen Timing-, Stagger- oder Damage-Werte ergänzen. Fehlt ein Wert, muss der Sim ihn als `unknown/unverified` kennzeichnen. Erst verifizierte Ingame-/Datenbankwerte dürfen den Gewinner der vier Varianten bestimmen.
