# Der Streit um 9 Uhr

Ein Lernspiel im Browser zum Thema Konfliktmanagement im Projektumfeld. Es ist der interaktive Teil des E-Learnings im Modul Projektmanagement (HWZ, BDA-A25).

**Stand:** Version 2.0. Das Spiel hat 5 Kapitel mit 20 Konfliktfällen, Kapitel-Checkpoints, ein Abschlussquiz, ein Glossar mit Konfliktkarten, speichert den Spielstand und läuft im Vollbild. Damit sind F1–F11 umgesetzt. Ein Durchlauf dauert etwa 80–90 Minuten.

## Aufbau

| Kapitel | Raum | Thema | Lernziel |
|---|---|---|---|
| 1 | Teambüro | Konfliktsignale, Sach-, Beziehungs-, Rollenkonflikt | 4 |
| 2 | Besprechungsraum | Eskalationsstufen nach Glasl | 1 |
| 3 | Kaffeeküche | Konfliktstile nach Thomas-Kilmann | 2 |
| 4 | Projektleitungsbüro | Harvard-Konzept | 3 |
| 5 | Raum der Auftraggeberin | Konflikte im Projektkontext | 5 |
| – | Flur | Abschlussquiz (8 Fragen) mit Auswertung pro Lernziel | alle |

Jeder Raum hat 4 Personen mit je einem Fall. Ein Fall läuft so ab: Situation → Antwort wählen → Konsequenz → Theorie → Kurzfrage. Die Tür zum nächsten Raum öffnet sich nach einem Checkpoint mit 3 Fragen. Im Raum liegen außerdem Konfliktkarten, die man einsammelt. Sie füllen das Glossar.

## Starten (lokal)

Das Spiel braucht einen lokalen Webserver, weil der Browser JSON-Dateien nicht direkt von der Festplatte (`file://`) lädt.

```
py -m http.server 8080
```

Danach http://localhost:8080 öffnen. Die VS-Code-Erweiterung „Live Server“ funktioniert ebenso.

## Auf GitHub Pages veröffentlichen

Es gibt keinen Build-Schritt, das Repository wird so ausgeliefert, wie es ist.

1. Den Projektordner als Repository auf GitHub pushen. `index.html` muss im Hauptverzeichnis liegen.
2. Auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, dann Branch `main` und Ordner `/ (root)` wählen und speichern.
3. Nach 1–2 Minuten ist das Spiel unter `https://<benutzername>.github.io/<repository>/` erreichbar.

Hinweise:
- Die Datei `.nojekyll` sorgt dafür, dass GitHub die Dateien unverändert ausliefert. Bitte nicht löschen.
- Alle Pfade sind relativ, deshalb funktioniert das Spiel auch im Unterordner `/<repository>/`.
- **Nach Änderungen an Inhalten oder Grafiken** die Versionsnummer in `src/systems/Version.js` erhöhen (z. B. `2.0.1`). Sonst zeigen Browser eventuell noch alte Texte aus dem Cache.
- Der Spielstand wird im Browser der Spielenden gespeichert (localStorage). Er gilt pro Gerät und Browser, es gibt keinen Server.

## Steuerung

| Taste | Aktion |
|---|---|
| Pfeiltasten / W A S D | gehen |
| Enter / Leertaste | sprechen, bestätigen |
| ↑/↓ oder 1–9 | Antwort wählen |
| G | Glossar |
| F | Vollbild an/aus |
| Esc | Menü (Glossar, Steuerung, Vollbild, Bewegung reduzieren, neu beginnen) bzw. Fenster schließen |
| B (Startbildschirm) | Bewegung reduzieren an/aus |
| N (Startbildschirm) | neues Spiel statt weiterspielen |

Das Spiel füllt immer das ganze Browserfenster und passt Schrift und Kartenausschnitt an die Fenstergröße an. Mit F geht es in den echten Vollbildmodus.

## Inhalte bearbeiten

Alle Texte liegen in `content/`, im Code steht kein Inhalt:

| Datei | Inhalt |
|---|---|
| `chapters.json` | Kapitel (Reihenfolge, Titel, Einleitung, Lernziel, zugeordnete Fälle, Checkpoint-Fragen an der Tür), Liste der Lernziele |
| `conflicts.json` | Konfliktfälle (Person, Situation, Antworten, Konsequenzen, Theorie, Kurzfrage) |
| `glossary.json` | Glossar bzw. Konfliktkarten (pro Kapitel max. 6) |
| `final_quiz.json` | Abschlussquiz (pro Frage ein `learning_goal`) |
| `game.json` | Einstellungen und alle Bedientexte |
| `REVIEW.md` | Prüfliste: was fachlich geprüft werden muss |

Wichtig zu wissen:
- **Antwortreihenfolge:** Das Spiel mischt die Antworten (Einstellung `shuffle_answers`). Die richtige Antwort darf deshalb überall in der Liste stehen.
- **Fälle pro Kapitel:** maximal 4, so viele Plätze hat jeder Raum. Welche Person wo steht, ergibt sich aus der Reihenfolge in `chapters.json`.
- **Fehlerprüfung:** Bei einem Fehler in einer Datei zeigt das Spiel beim Start eine deutsche Fehlermeldung mit Datei, Fall und Feld. Beispiele sind ein fehlendes Feld, ein falscher `correct_index` oder ein Fall, der keinem Kapitel zugeordnet ist.
- **Checkpoint-Regel:** Nach einer falschen Antwort gibt es Feedback und einen neuen Versuch. Nach `checkpoint_max_attempts` Fehlversuchen (Standard: 2) wird die richtige Antwort gezeigt. Im Abschlussquiz hat jede Frage genau einen Versuch.

## Karte bearbeiten

`assets/maps/office.tmj` ist eine Tiled-Karte (https://www.mapeditor.org) mit 6 Räumen nebeneinander. Ebenen:

- `floor`, `walls`, `furniture`: Kacheln. Kollision über die Kachel-Eigenschaft `collides`.
- `objects`:
  - `player_spawn`: Startpunkt
  - `room`: Rechteck pro Raum, Eigenschaft `chapter` (1–5; 6 = Flur)
  - `npc_slot`: Eigenschaften `chapter`, `slot`, `sprite`. Platz für eine Person.
  - `card_slot`: Eigenschaften `chapter`, `slot`. Platz für eine Karte.
  - `door`: Kapiteltür, Eigenschaft `chapter`
  - `quiz_host`: Person für das Abschlussquiz

Die Karte enthält nur Plätze. Welcher Fall oder welche Karte auf einem Platz erscheint, entscheidet das Spiel anhand von `content/`. Die Karte erzeugt `node tools/build_map.js`. Das Skript prüft auch, ob jede Person, Karte und Tür erreichbar ist. Wer die Karte in Tiled von Hand bearbeitet, sollte das Skript danach nicht mehr ausführen, sonst wird sie überschrieben. Die Platzhalter-Grafiken erzeugt `node tools/build_assets.js`. Node.js braucht ihr nur für diese Werkzeuge, nicht für das Spiel.

## Automatischer Test

http://localhost:8080/?autotest spielt das ganze Spiel mit simulierten Tastendrücken durch:
- alle 20 Fälle, alle 5 Türen, das Abschlussquiz
- Bewegung, Kollision, Karten, Glossar, Menü
- Speichern, Fenstergröße ändern, Neustart

Das Ergebnis erscheint im Tab-Titel und unten auf der Seite. Der Test nutzt einen eigenen Speicherplatz und überschreibt keinen echten Spielstand.

Ohne Fenster (Chrome):

```
chrome --headless=new --window-size=1280,800 --virtual-time-budget=400000 --dump-dom "http://127.0.0.1:8080/index.html?autotest"
```

## Projektstruktur

```
index.html          Einstieg
.nojekyll           für GitHub Pages
lib/phaser.min.js   Phaser 3.90.0 (einzige Abhängigkeit)
src/main.js         Konfiguration (Vollbild/RESIZE, Taste F)
src/scenes/         BootScene (Laden, Prüfen), StartScene, OfficeScene (Karte, Kapitel, Quiz), UIScene (Fenster, HUD)
src/systems/        DialogSystem, QuestionRunner, GlossarySystem, GameState (Speichern),
                    ContentLoader (Prüfung), Texts, Version, Fullscreen, AutoTest
src/entities/       Player, Npc
content/            Inhalte als JSON
assets/             Karte und Grafiken
tools/              Generatoren für Platzhalter-Grafik und Karte (nur Entwicklung)
```
