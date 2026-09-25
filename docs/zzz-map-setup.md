# ZZZ-Karten aktivieren

Der neue Bereich liegt unter `/zzz/`. Ein Link erscheint im bestehenden Admin-Control-Bereich. Es gibt absichtlich noch keinen öffentlichen Startseiten-Link.

## Einmalige Einrichtung

1. Im SQL-Editor des bestehenden Supabase-Projekts `supabase/zzz_maps.sql` ausführen. Voraussetzung ist die bestehende Admin-Einrichtung aus `supabase/admin_panel.sql` mit `app_admins` und `is_app_admin()`.
2. Website-Dateien wie bisher veröffentlichen.
3. Als bestehender Admin `/zzz/` öffnen und **Karte anlegen** wählen. Als Hintergrund die Datei `Screenshot_2026-09-20_141524.png` auswählen. Titel und Urheberangabe sind vorbelegt. Das Bild wird bewusst nicht in das öffentlich ausgelieferte GitHub-Pages-Verzeichnis kopiert.
4. **Punkt setzen** wählen und auf das Bild klicken. Titel, Kategorie, Notizen und Screenshots ergänzen und speichern. Bestehende Bildsymbole sind noch keine interaktiven Punkte.

Karten, Punkte und Bilddateien werden in Supabase gespeichert und sind geräteübergreifend verfügbar. Es werden nur PNG/JPEG/WebP bis jeweils 10 MB angenommen.

## Sichtbarkeit

Eine neue Karte hat immer `is_public = false`. Nur der Eigentümer mit bestehender Admin-Rolle kann sie und ihre Punkte lesen und bearbeiten. Andere Admins erhalten ebenfalls keinen Zugriff auf private Karten. RLS schützt Tabellen und den privaten Storage-Bucket `zzz-maps`; das Ausblenden der Oberfläche ist nicht der Zugriffsschutz.

**Für alle freigeben** veröffentlicht die gesamte Karte einschließlich Notizen, Erledigt-Status und Screenshots nach Bestätigung. Besucher können sie anschließend unter `/zzz/` ansehen, aber nicht bearbeiten. **Wieder privat machen** sperrt zukünftige Lesezugriffe. Bereits heruntergeladene Inhalte können damit nicht zurückgerufen werden. Eine Aufnahme in die öffentliche Navigation kann separat erfolgen.

## Prüfung nach der Migration

- Als Besitzer Karte anlegen, Punkte und mehrere Screenshots speichern; neu laden und erneut öffnen.
- In einem privaten Browserfenster prüfen, dass die private Karte nicht erscheint und direkte Storage-Downloads verweigert werden.
- Mit einem normalen Konto und einem zweiten Admin-Konto denselben Zugriff prüfen.
- Karte freigeben: ohne Anmeldung müssen Bild und Punkte lesbar sein; Schreibzugriffe bleiben gesperrt.
- Wieder privat machen: neue anonyme Downloads und Tabellenabfragen dürfen keine Inhalte mehr liefern.

Die automatischen lokalen Tests prüfen Koordinatenberechnung, kombinierte Filter und Datei-Validierung. Die RLS-Prüfung gegen das echte Projekt benötigt die ausgeführte Migration und entsprechende Testkonten.

## Straßen und Flächen nachzeichnen

Zusätzlich einmal `supabase/zzz_map_vectors.sql` im Supabase-SQL-Editor ausführen. Die Migration ergänzt nur Zeichnungsdaten und eine Versionsnummer an bestehenden Karten. Die bisherigen Besitzer- und Veröffentlichungsregeln gelten weiterhin, auch für Vektoren.

1. Eigene Karte öffnen und **Karte zeichnen** wählen.
2. **+ Gebiet** legt einen Ordner an. Namen und Farbe festlegen.
3. **Linie** zeichnet Straßen mit einstellbarer Breite; **Fläche** zeichnet gefüllte Umrisse. Klicken setzt Eckpunkte, Enter oder **Abschließen** beendet den Pfad.
4. **Auswahl** erlaubt das Ziehen von Eckpunkten. Ein Doppelklick auf eine Kante ergänzt einen Eckpunkt; ausgewählte Punkte lassen sich löschen. **Hand** verschiebt die Karte.
5. Gebiete können zugeklappt, ausgeblendet und gesperrt werden. Ein Pfad lässt sich über seine Gebietsauswahl verschieben.
6. Die Vorlage lässt sich ausblenden oder transparent stellen. Position und Maßstab bleiben mit den Pfaden verbunden.
7. **Speichern** sichert die Zeichnung in Supabase. Rückgängig/Wiederholen und lokale Entwürfe helfen während der Bearbeitung. Lokale Entwürfe liegen nur in diesem Browser, nicht geräteübergreifend. Nach Neuladen können sie im Editor wiederhergestellt werden. Eine noch nicht abgeschlossene Linie gehört nicht zum lokalen Entwurf.
8. **SVG exportieren** exportiert sichtbare Vektoren ohne Vorlagenbild. **Entwurf exportieren/importieren** sichert bzw. lädt die gesamte Zeichnung als JSON.

Gleichzeitige Bearbeitungen werden durch eine Versionsprüfung erkannt. Bei einem Konflikt den eigenen Entwurf exportieren, neu laden und die Versionen abgleichen. Vor Ausführung der Migration ist Zeichnen mit lokalem Entwurf möglich; Cloud-Speichern meldet die fehlende Einrichtung. Die Karte bleibt privat, bis der Besitzer sie ausdrücklich freigibt.

## Kurven, Verbindungen und Verlängerungen

- Straße auswählen und **Als weiche Kurve zeichnen** aktivieren. Die Kurve läuft durch die Eckpunkte und wird beim Ziehen automatisch neu berechnet. Gerade Straßen bleiben standardmäßig gerade; Flächen bleiben Polygone.
- Einen inneren Eckpunkt anklicken und **Am Eckpunkt teilen** wählen. Beide Teile liegen im selben Gebiet. Bei Kurven werden die Endbereiche der beiden Teile neu geglättet.
- Einen Endpunkt anklicken, unter **Verbinden mit** die zweite Straße und deren Anfang oder Ende auswählen und **Straßen verbinden** wählen. Beide Straßen müssen im selben Gebiet liegen. Die ausgewählte Straße bestimmt Namen, Breite und Kurvenmodus; eine Lücke wird durch ein Verbindungsstück geschlossen. Überlappende Endpunkte werden nur einmal übernommen. Das verbindet zwei Straßen zu einem Pfad, erzeugt aber keinen Routing-Graphen.
- Einen Endpunkt anklicken und **Am Endpunkt weiterzeichnen** wählen. Weitere Punkte setzen, dann **Abschließen**. **Abbrechen** oder Escape lässt die bestehende Straße unverändert.
- Alle abgeschlossenen Operationen unterstützen Rückgängig/Wiederholen, Cloud-Speicherung und Export. SVG enthält echte kubische Kurven. Keine zusätzliche SQL-Migration nötig.

Neue Zeichnungen verwenden das JSON-Format Version 2; Version-1-Zeichnungen werden beim Laden übernommen. Ältere Editor-Versionen lehnen Version 2 ab, damit sie Kurven nicht versehentlich als Geraden speichern. Nach dem Update alte Browser-Tabs neu laden. Die automatische Glättung kann sich beim Einfügen, Teilen und Verbinden in der Umgebung der bearbeiteten Punkte ändern.
