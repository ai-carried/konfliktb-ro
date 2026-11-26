# Anforderungen: Konfliktmanagement-Lernspiel (Browser)

> Dokument für die Entwicklung mit Claude Code. Alle Punkte mit **[OFFEN]** müssen vor oder während der Umsetzung von der Gruppe entschieden werden.

## 1. Ausgangslage und Ziel

Im Modul Projektmanagement (HWZ, BDA-A25) erstellt die Gruppe ein E-Learning von ca. 60 Minuten zum Thema **Konfliktmanagement** für Mitstudierende. Das Spiel ist der interaktive Kern des E-Learnings. Es vermittelt Theorie anhand von Beispielen und prüft das Wissen.

**Ziel:** Die Lernenden verstehen typische Konfliktsituationen im Projektumfeld, kennen die zentralen Modelle und können sie auf Beispiele anwenden.

## 2. Zielgruppe

- Studierende im Modul Projektmanagement, keine Vorkenntnisse im Konfliktmanagement nötig
- Nutzung am eigenen Gerät im Browser (Desktop, Laptop)
- Deutsche Sprache

## 3. Lernziele

Nach dem Spiel können die Lernenden:

1. **Eskalationsstufen** nach dem Glasl-Modell einordnen und begründen
2. **Konfliktstile** nach Thomas-Kilmann unterscheiden und situativ passend wählen
3. **Positionen von Interessen** unterscheiden (Harvard-Konzept, „Interessen statt Positionen“)
4. Typische **Konfliktsignale** im Verhalten erkennen
5. Konflikte im **Projektkontext** (Stakeholder, Auftraggeber, Team) einordnen

> **[OFFEN]** Liste der Modelle final festlegen und Inhalte gegen die Kursliteratur prüfen. Die Modelle sind nicht in den Unterlagen U1 bis U3 enthalten.

## 4. Spielkonzept

Die Spielfigur bewegt sich in einem **2,5D- bzw. Top-down-Büro** (Pokémon-ähnlich) und spricht mit Personen, die jeweils einen Konflikt haben.

### 4.1 Spielelemente

- **Karte:** Ein Büro mit 4 bis 6 Räumen (Teambüro, Besprechungsraum, Kaffeeküche, Projektleitungsbüro, Flur)
- **NPCs (Personen):** 3 bis 4 Personen mit je einem Konfliktfall
- **Dialoge:** Gespräch mit Antwortwahl; jede Wahl hat eine Konsequenz
- **Theorie-Einschub:** Nach jedem Konfliktfall erklärt ein Infokasten das passende Modell mit Beispiel
- **Wissens-Checkpoints:** Quizfragen, die vor dem Weitergehen beantwortet werden müssen
- **Konfliktkarten:** Sammelobjekte im Büro mit Begriffen und Modellen; sie bilden ein Glossar
- **Fortschrittsanzeige:** Anzeige, welche Konflikte und Checkpoints bearbeitet sind

### 4.2 Ablauf (Beispiel)

1. Start: kurze Einführung und Steuerung
2. Die Lernenden gehen durchs Büro und sprechen Personen an
3. Jede Person schildert einen Konflikt, die Lernenden wählen eine Reaktion
4. Die Konsequenz wird gezeigt, danach folgt der Theorie-Einschub
5. Checkpoint mit 2 bis 3 Fragen
6. Am Ende: Abschlussquiz mit 5 bis 8 Fragen und Auswertung

**Zeitbudget:** ca. 60 Minuten insgesamt, davon max. 15 Minuten freies Erkunden.

## 5. Funktionale Anforderungen

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Figur bewegt sich mit Pfeiltasten (WASD) über die Karte, Kollisionen mit Wänden und Möbeln | Muss |
| F2 | Interaktion mit Personen per Taste (Enter/Leertaste), Dialogfenster öffnet sich | Muss |
| F3 | Dialoge mit Antwortoptionen und Verzweigung (mind. 2 Antworten pro Konflikt) | Muss |
| F4 | Konsequenz-Anzeige nach jeder Antwort mit kurzer Begründung | Muss |
| F5 | Theorie-Einschub nach jedem Konfliktfall (Modell, Kernaussage, Beispiel) | Muss |
| F6 | Checkpoints vor bestimmten Türen oder Bereichen; Weiterkommen nur mit richtiger Antwort oder nach Feedback | Muss |
| F7 | Richtig/falsch-Feedback mit Erklärung bei jeder Quizfrage | Muss |
| F8 | Abschlussquiz mit Auswertung (Punktzahl, Anteil richtig) | Muss |
| F9 | Konfliktkarten sammeln und in einem Glossar einsehbar | Soll |
| F10 | Fortschritt wird im Browser gespeichert (localStorage), Neustart möglich | Soll |
| F11 | Fortschrittsanzeige (z. B. Checkliste der Konflikte) | Soll |
| F12 | Übersprungsoption für Personen, die nur die Theorie wollen (Glossar, Lesemodus) | Kann |
| F13 | Lesemodus ohne Karte: alle Inhalte als Text (Fallback) | Soll |
| F14 | Einfache Sound-Effekte, abschaltbar | Kann |

## 6. Nicht-funktionale Anforderungen

- **Plattform:** aktuelle Versionen von Chrome, Firefox, Edge und Safari (Desktop)
- **Bedienung:** vollständig per Tastatur bedienbar, Maus als Ergänzung
- **Barrierefreiheit:** ausreichende Kontraste (WCAG AA), Text lesbar ohne Animation, Option zum Verlangsamen oder Abschalten von Bewegung
- **Sprache:** Deutsch, Texte in separaten Dateien (einfach austauschbar)
- **Performance:** flüssig bei 60 fps auf einem durchschnittlichen Laptop, Ladezeit unter 5 Sekunden
- **Kosten:** keine direkten Kosten; nur frei nutzbare Software und Assets (Lizenz prüfen und dokumentieren)
- **Verfügbarkeit:** mindestens 60 Tage online verfügbar (Anforderung aus den Unterlagen)
- **Hosting:** statisch (z. B. GitHub Pages), keine Server-Logik, keine Benutzerkonten

## 7. Technische Vorgaben

- **Framework:** Phaser 3 (JavaScript), kein Build-Tool, wenn möglich
- **Karte:** Tiled-Editor, Export als JSON
- **Texte und Inhalte:** als JSON-Dateien (siehe Abschnitt 8), nicht im Code fest verdrahtet
- **Assets:** nur frei lizenzierte Grafiken (z. B. Kenney, CC0) mit Quellennachweis in `CREDITS.md`
- **Struktur:** siehe Abschnitt 9
- **Code-Sprache:** Kommentare und Dateinamen auf Englisch, Inhalte auf Deutsch

> **[OFFEN]** Phaser 3 oder reines JavaScript mit Canvas? Phaser ist empfohlen, weil es Kollision, Tilemaps und Eingaben mitbringt.

## 8. Datenformat für Inhalte

Dialoge und Quizfragen liegen in `content/` als JSON. Beispiel für einen Konfliktfall:

```json
{
  "id": "conflict_01",
  "npc": "Lena, Entwicklerin",
  "situation": "Lena verschiebt seit zwei Wochen Termine und reagiert auf Nachfragen gereizt.",
  "options": [
    {
      "text": "Ich mache dir Vorwürfe und fordere Pünktlichkeit.",
      "consequence": "Lena zieht sich zurück. Das Problem bleibt.",
      "correct": false
    },
    {
      "text": "Ich frage nach, was hinter den Verschiebungen steckt.",
      "consequence": "Lena nennt eine Überlastung. Ihr könnt gemeinsam nach einer Lösung suchen.",
      "correct": true
    }
  ],
  "theory": {
    "model": "Interessen statt Positionen",
    "summary": "Hinter einer Position steht ein Interesse. Fragen nach dem Warum bringen es ans Licht.",
    "example": "Lena will weniger Termine. Ihr eigentliches Interesse ist eine realistische Arbeitslast."
  },
  "checkpoint": {
    "question": "Welche Aussage beschreibt ein Interesse statt einer Position?",
    "answers": ["Ich will sofort einen Termin.", "Ich brauche einen verlässlichen Zeitplan.", "Ich will recht haben."],
    "correct_index": 1,
    "explanation": "Ein Interesse beschreibt das Bedürfnis hinter einer Forderung."
  }
}
```

Quizfragen für das Abschlussquiz liegen in `content/final_quiz.json` mit demselben Aufbau für `checkpoint`.

> **[OFFEN]** Die Beispielinhalte sind Platzhalter. Sie müssen fachlich geprüft und auf die Kursliteratur abgestimmt werden.

## 9. Projektstruktur (Vorschlag)

```
konfliktspiel/
├── index.html
├── CLAUDE.md              # Hinweise für Claude Code (siehe unten)
├── CREDITS.md             # Quellen und Lizenzen der Assets
├── src/
│   ├── main.js
│   ├── scenes/            # Startbildschirm, Büro, Quiz, Abschluss
│   ├── systems/           # Dialog, Checkpoint, Fortschritt, Speicherung
│   └── entities/          # Spielfigur, NPCs
├── content/
│   ├── conflicts.json
│   ├── final_quiz.json
│   └── glossary.json
├── assets/
│   ├── maps/              # Tiled-Dateien und Export
│   ├── sprites/
│   └── audio/
└── README.md
```

## 10. Meilensteine

1. **MVP (Prototyp):** 1 Raum, 1 Person, 1 Dialog mit Wahl, 1 Theorie-Einschub, 1 Checkpoint (F1 bis F7)
2. **Inhalt:** alle Konfliktfälle und Modelle, Abschlussquiz (F8)
3. **Spielbarkeit:** Büro vollständig, Konfliktkarten, Fortschritt speichern (F9 bis F11)
4. **Zugang:** Fallback-Lesemodus (F13), Barrierefreiheit prüfen
5. **Test und Deployment:** Test mit 3 bis 5 Mitstudierenden, Hosting, Dokumentation

## 11. Abnahmekriterien

- Das Spiel startet ohne Installation im Browser.
- Ein kompletter Durchlauf dauert ca. 60 Minuten.
- Jeder Konfliktfall enthält mindestens eine Theorie-Erklärung und einen Checkpoint.
- Alle Lernziele (Abschnitt 3) werden durch mindestens eine Frage geprüft.
- Die Steuerung funktioniert vollständig per Tastatur.
- Alle Assets sind dokumentiert und frei lizenziert.

## 12. Nicht im Umfang

- Mehrspielermodus oder Konten
- Eigene Server-Anwendung oder Datenbank
- Mobile Optimierung (nur Desktop)
- Sprachausgabe oder Vertonung

## 13. Hinweise für Claude Code

- Vor jeder größeren Änderung kurz den Plan nennen und auf Bestätigung warten.
- Inhalte immer in `content/` ändern, nicht im Code.
- Nach jeder Funktion lokal testen (Live-Server) und den Test beschreiben.
- Keine Pakete ohne Rückfrage hinzufügen; Phaser ist die einzige Abhängigkeit.
- Lizenzen neuer Assets sofort in `CREDITS.md` eintragen.
