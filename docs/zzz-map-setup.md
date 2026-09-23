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
