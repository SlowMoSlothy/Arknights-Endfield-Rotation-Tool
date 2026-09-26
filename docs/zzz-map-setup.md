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

## Etagen pro Gebiet

Im Zeicheneditor unter dem gewählten Gebiet **+ Etage** wählen und einen Namen vergeben. **Aktive Etage** bestimmt, wo neue Pfade entstehen. **Etage anzeigen** steuert die gespeicherte Sichtbarkeit; mehrere Etagen können gleichzeitig sichtbar bleiben. Bestehende Zeichnungen erhalten automatisch ein Erdgeschoss, ohne ihre Geometrie zu verändern.

Bei einem ausgewählten Pfad lässt sich **Etage des Pfads** ändern. Beim Verschieben in ein anderes Gebiet wird dessen aktive Etage verwendet. Einrasten und Verbinden gelten nur innerhalb desselben Gebiets und derselben Etage. Teilen und Weiterzeichnen behalten die Etagenzuordnung. Gesperrte Gebiete sperren auch ihre Etagen.

Nur leere Etagen können gelöscht werden; mindestens eine bleibt pro Gebiet erhalten. Alle Änderungen unterstützen Rückgängig und Cloud-Speicherung. SVG exportiert nur sichtbare Etagen. Das Vorlagenbild bleibt für die gesamte Karte gemeinsam; Fundstellen sind noch nicht Etagen zugeordnet.

Das Zeichnungsformat ist jetzt Version 3. Version 1 und 2 werden beim Laden übernommen. Keine SQL-Erweiterung erforderlich; alte Browser-Tabs nach dem Update neu laden.

## Fundstellen nach Gebiet und Etage

Einmal `supabase/zzz_point_locations.sql` in Supabase ausführen. Die zwei optionalen Spalten verändern die bestehenden RLS-Regeln nicht. Alte Punkte bleiben ohne Zuordnung erhalten; Screenshots bleiben am jeweiligen Punkt gespeichert.

Im Punktdialog **Gebiet** und optional **Etage** wählen. Verwendbar sind die bereits in der Cloud gespeicherten Gebiete und Etagen. Die Filter **Gebiet filtern** und **Etage filtern** wirken gemeinsam mit Suche, Kategorie und Erledigt-Filter auf Punktliste und Marker. Sie verändern weder die Zeichnung noch deren gespeicherte Etagen-Sichtbarkeit. Bei neuen Punkten wird eine konkrete Filterauswahl als Zuordnung vorbelegt.

**Nicht zugeordnet** zeigt ältere oder bewusst nicht zugeordnete Punkte. Nach dem Löschen eines Gebiets oder dem Import einer anderen Zeichnung bleiben betroffene Fundstellen samt Screenshots erhalten; ihre Zuordnung heißt dann **Entferntes Gebiet / Entfernte Etage** und lässt sich ändern. Etagen mit bekannten Fundstellen lassen sich im Editor nicht als leere Etagen löschen. Vor der Migration ist das Speichern ohne Zuordnung weiterhin möglich; beim Speichern einer Zuordnung weist die Oberfläche auf die fehlende SQL-Einrichtung hin und hält die Eingaben geöffnet.

## Zeichnung mit der Hand pausieren

Der Wechsel von Linie/Fläche zur Hand behält die begonnenen Eckpunkte. Zurück zum ursprünglichen Zeichenwerkzeug wechseln, um weiterzuzeichnen. **Abschließen** funktioniert auch während der Hand-Pause. **Speichern** schließt eine gültige begonnene Zeichnung automatisch ab und speichert sie mit; bei zu wenigen Punkten bleibt sie erhalten und ein Hinweis erklärt, was fehlt. Beim Wechsel zu einem anderen Zeichenwerkzeug wird eine gültige Zeichnung abgeschlossen; eine unvollständige Zeichnung muss erst vervollständigt oder ausdrücklich abgebrochen werden. Noch nicht abgeschlossene Zeichnungen sind nur in der geöffneten Sitzung vorhanden.

## Knoten hinzufügen und Werkzeug-Symbole

Die obere Werkzeugleiste nutzt Symbole mit Tooltips und zugänglichen Beschriftungen. Pfad oder Fläche auswählen, **Knoten hinzufügen** (Knoten mit Plus) aktivieren und auf die gewünschte Kante klicken. Der neue Knoten kann direkt gezogen werden. Das funktioniert auch auf der schließenden Flächenkante und auf Kurven. Doppelklick im Auswahlwerkzeug bleibt möglich. Klicks unmittelbar neben bestehenden Knoten erzeugen keine Duplikate. Rückgängig und Speichern gelten wie bei anderen Pfadänderungen.

## Vollbildansicht

Das Vollbildsymbol rechts neben **Einpassen** vergrößert Karte und Seitenleiste gemeinsam. Zeichenwerkzeuge und Fundstellen-Dialoge bleiben bedienbar. Erneutes Klicken oder **Escape** verlässt die Ansicht; ein geöffneter Dialog wird zuerst geschlossen. Unterstützt der Browser kein natives Vollbild, füllt die Karte das Browserfenster. Dafür ist keine SQL-Änderung erforderlich.
