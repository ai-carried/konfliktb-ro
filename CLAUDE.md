# Hinweise für Claude Code

Projekt: Browser-Lernspiel „Der Streit um 9 Uhr“ (Konfliktmanagement, HWZ). Anforderungen: `konfliktspiel_anforderungen.md`. Diese Datei ist verbindlich.

## Regeln
- Vor jeder größeren Änderung kurz den Plan nennen und auf Bestätigung warten.
- Inhalte nur in `content/` ändern, nie im Code. Auch Bedientexte gehören nach `content/game.json` und werden über `t('key')` aus `src/systems/Texts.js` geholt.
- Jede inhaltliche Aussage, die Claude ergänzt, mit `_review` in der JSON-Datei markieren und in `content/REVIEW.md` eintragen.
- Keine Pakete hinzufügen. Phaser (`lib/phaser.min.js`, 3.90.0) ist die einzige Abhängigkeit. Kein Build-Tool, ES-Module direkt im Browser.
- Neue Assets nur frei lizenziert und sofort in `CREDITS.md` eintragen.
- Code-Kommentare und Dateinamen auf Englisch, Spielertexte auf Deutsch (korrekte Umlaute).
- Alles muss per Tastatur bedienbar sein. Textfarben mindestens WCAG AA auf dem Panel `#14213d`.
- Git erledigt der Nutzer selbst: nicht committen oder pushen.
- Nach Änderungen an `content/` oder `assets/` die Version in `src/systems/Version.js` erhöhen (Cache-Busting für GitHub Pages).

## Testen
- Server: `py -m http.server 8080`
- Automatischer Test nach jeder Änderung (spielt das ganze Spiel durch, dauert ca. 1–3 Min.):
  `chrome --headless=new --window-size=1280,800 --virtual-time-budget=400000 --dump-dom "http://127.0.0.1:8080/index.html?autotest"`.
  Das Ergebnis steht in `<pre id="autotest">`. Neue Funktionen bekommen neue Prüfungen in `src/systems/AutoTest.js`.
- Headless-Chrome drosselt requestAnimationFrame. Deshalb nutzt `?autotest` eine Timer-Schleife (`fps.forceSetTimeOut`) und einen eigenen Speicherplatz (`…_autotest`).
- Der Test muss nach dem Öffnen eines Fensters > 180 ms warten, bevor er eine Taste drückt (absichtliche Eingabesperre der UI).
- Bei Headless-Screenshots ist der sichtbare Bereich kleiner als `--window-size`. Ein schwarzer Streifen unten ist ein Artefakt und kein Fehler.
- GitHub-Pages-Unterpfad testen: den Ordner darüber ausliefern und `/Konfliktb%C3%BCro/index.html?autotest` öffnen.

## Architektur in Kürze
- Phaser `Scale.RESIZE`: Das Canvas füllt immer das Fenster. `UIScene` skaliert über `uiScale()`, `OfficeScene` zoomt so, dass eine Raumhöhe (13 Kacheln) ins Fenster passt.
- `UIScene` läuft parallel über `OfficeScene` (Panels: `ui.showPanel({heading, sections, choices, onChoose, closable})`, `setHud`, `setPrompt`, `toast`). `OfficeScene` bekommt Tastenereignisse vor `UIScene`.
- Fallablauf in `DialogSystem`, alle Fragen (Kurzfrage, Kapitel-Checkpoint, Abschlussquiz) über `QuestionRunner` (Modi `checkpoint` / `quiz`, Antworten werden gemischt), Glossar in `GlossarySystem`, Fortschritt und localStorage in `GameState`.
- Karte (Tiled, erzeugt von `tools/build_map.js`): 6 Räume nebeneinander. Objekte `room`, `npc_slot`, `card_slot`, `door`, `quiz_host`. Welche Fälle und Karten in den Slots erscheinen, entscheidet das Spiel zur Laufzeit anhand von `content/chapters.json` und `content/glossary.json`.
- Tileset ist extrudiert (margin 1, spacing 2), damit bei nicht-ganzzahligem Zoom keine Linien zwischen Kacheln entstehen.
