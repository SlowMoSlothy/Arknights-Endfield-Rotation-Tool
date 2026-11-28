# Bedingte Effekte in der Slot-Ansicht

Stand: 28. November 2026

## Umfang

Die öffentlich lesbaren Planner-Daten wurden für 36 Operator-Datensätze und 172 Skills auf bedingte Effekte untersucht. Die Prüfung betrifft die Auswertung der vorhandenen Regeln und deren Darstellung in der Slot-Ansicht, einschließlich des Zustands vor dem Skill, Stack-Verbrauch und explizit erzeugter Ressourcen. Sie ist keine erneute Verifizierung sämtlicher Talente, Potentials, Schadenswerte oder noch nicht implementierter Katalog-Operatoren.

Die relevanten Regeln sind als offline ausführbarer Test-Datensatz in `tests/fixtures/slot-conditional-effects.json` festgehalten. Die Tests rufen die tatsächliche Slot-Darstellung auf und prüfen die an die Buff-/Debuff-Anzeige übergebenen Effekte; bei betroffenen gemeinsamen Regeln werden zusätzlich Simulation und Combo-Erkennung ausgeführt. Kay, Si, physische Statusumwandlungen und Argent Flows Varianten bleiben außerdem durch ihre bestehenden Tests abgedeckt.

## Gefundene und korrigierte Abweichungen

| Operator | Fehler | Korrektur |
|---|---|---|
| Wulfgard | Nach dem Verbrauch von Combustion oder Electrification erschien zusätzlich Heat Infliction, weil die Ausschlussbedingung erst nach dem Verbrauch ausgewertet wurde. Dies betraf Slot und Simulation. | Bedingungen verwenden den Zielzustand vor dem Skill. Ohne Reaktion entsteht weiterhin Heat Infliction. |
| Lifeng | Die Slot-Ansicht erkannte Physical Susceptibility bei vorher fehlender Vulnerability korrekt, die Combo-Erkennung prüfte jedoch erst nach dem Hinzufügen des neuen Vulnerability-Stacks. | Auch die Combo-Erkennung prüft den Zustand vor dem Treffer. |
| Laevatain | Die Slot-Ansicht behandelte die Vier-Stack-Variante korrekt. In der Combo-Erkennung fehlten dagegen die Buff-Stack-Schwelle, das Ersetzen der normalen Effekte und der Verbrauch der vier Melting-Flames-Stacks. | Schwelle, ersetzte Effekte und einmaliger Stack-Verbrauch werden auch beim Wiederaufbau der Combo-Ketten berücksichtigt. |
| Tangtang | Die Slot-Ansicht wertete vorhandene Whirlpools beim Battle Skill nicht aus. Dadurch fehlte die Arts Susceptibility aus der Ein-/Zwei-Whirlpool-Variante. | Der vorhandene Ressourcen-Resolver wird auch für Slots verwendet; getestete Varianten: null, ein, zwei Whirlpools und Ressourcenlimit. |
| Zhuang Fangyi | Die Slot-Ansicht verwendete die Grundwerte für Electrification und Electric Amp anstelle der von verbrauchten Stacks und Sunderblades abhängigen Werte. | Verbrauchsskalierung und Ressourcen-Resolver werden vor dem Anzeigen der Effekte angewendet. |

Tangtangs hinterlegte Varianten stimmen mit der veröffentlichten Skillbeschreibung überein: zusätzliche Waterspouts durch Whirlpools, einmalige Cryo Infliction und Arts Susceptibility bei mehreren Waterspouts. Quelle: [Tangtang – Skill-Daten](https://www.endfieldtools.dev/characters/tangtang/).

## Bestätigte Prüffälle

| Operator | Geprüfte Bedingung |
|---|---|
| Last Rite | Cryo Infliction beim Final Strike nur mit Hypothermic Perfusion; der verbrauchende Treffer erhält den Effekt noch. |
| Fluorite | Passende Cryo-/Nature-Infliction erst ab zwei Stacks, einschließlich Stack-Limit. |
| Antal | Erneute Anwendung eines vorhandenen konfigurierten Effekts; kein erfundener Effekt bei leerem Zielzustand. |
| Xaihi | Zwei Auxiliary-Crystal-Ladungen, Verbrauch durch genau zwei Final Strikes. |
| Lifeng | Link bleibt beim Final Strike erhalten und wird beim Battle Skill vollständig verbraucht. |
| Mimino | Ohne Device kein Detonations-Effekt; ein angebrachtes Device wird einmal verbraucht. |
| Argent Flow | Bolt Rush erzwingt Electrification; zusätzliche Vulnerability nur bei tatsächlich verbrauchter Electric Infliction. |
| Pogranichnik | Der übernommene Vulnerability-Verbrauch bestimmt die Full-Moon-Slash-Sequenzen und den Steel-Oath-Verbrauch. |
| Kay | Ressourcen, Salvage und erzwungene Combustion ab drei verbrauchten Stacks; bestehende Regressionstests. |
| Si | Teamabhängige Heat-/Cryo-Infliction bei Brushwork Realm und keine erneute Anwendung durch die zwei Folgestufen; bestehende Regressionstests. |
| Mi Fu / Rossi | Vulnerability-Voraussetzungen und physische Statusumwandlung; bestehende Regressionstests. |

## Grenzen der Slot-Ansicht

Slots bilden eine Reihenfolge ohne feste Uhrzeit ab. Ressourcen bleiben daher bis zum expliziten Verbrauch erhalten; ihr zeitlicher Ablauf wird in der Simulation geprüft. Heilungs-/HP-Bedingungen, Positionen, verzögerte Treffer und zeitlich begrenzte Formen werden durch diese Prüfung nicht zu vollständigen Slot-Simulationen erweitert. Es werden weder neue Spielregeln erfunden noch Datenbankwerte geändert.

Die Korrektur benötigt keine SQL-Migration. Der Release-Eintrag „Conditional operator effects“ wird mit dem Code unter Recent fixes am 28. November 2026 veröffentlicht und mit Report-Einträgen desselben Tages gruppiert. Der bereits veröffentlichte Kay-Report und sein Dank bleiben über die bestehende Datenbank-Anbindung erhalten.
