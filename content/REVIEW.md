# Fachliche Prüfliste

Alle Lerninhalte sind Entwürfe und werden von der Gruppe fachlich geprüft.
Diese Liste zeigt, woher jeder Inhalt stammt.

**Legende**
- **ANF**: wörtlich aus `konfliktspiel_anforderungen.md` übernommen
- **ERGÄNZT**: von Claude geschrieben, muss geprüft werden. In den JSON-Dateien steht dazu ein Feld `_review`.

## Übersicht

| Datei | Inhalt | Herkunft | Status |
|---|---|---|---|
| `chapters.json` | `learning_goals` (Lernziele 1–5) | ANF (Abschnitt 3, gekürzt formuliert) | offen |
| `chapters.json` | Kapiteltitel, Raumnamen, Einleitungstexte | ERGÄNZT | offen |
| `chapters.json` | 15 Checkpoint-Fragen (3 pro Kapitel) | ERGÄNZT | offen |
| `conflicts.json` | `conflict_01` Lena (Kapitel 4) | ANF (Abschnitt 8) | offen |
| `conflicts.json` | 19 weitere Fälle `c1_1` … `c5_4`: Situation, Antworten, Konsequenzen, Theorie, Kurzfrage | ERGÄNZT | offen |
| `glossary.json` | 28 Glossareinträge | ERGÄNZT | offen |
| `final_quiz.json` | 8 Quizfragen, Gastgeberin „Frau Berger“, Einleitung | ERGÄNZT | offen |
| `game.json` | `intro`, `npc_done`, `consequence_good/bad`, `result_feedback_*` | ERGÄNZT | offen |

Alle übrigen Texte in `game.json` sind reine Bedientexte ohne fachliche Aussage.

## Fälle im Überblick (zum Abhaken)

| Kapitel | ID | Person | Modell / Thema | geprüft |
|---|---|---|---|---|
| 1 | c1_1 | Marco, Backend-Entwickler | Konfliktsignale | ☐ |
| 1 | c1_2 | Sara, UX-Designerin | Sachkonflikt | ☐ |
| 1 | c1_3 | Jonas, Software-Tester | Beziehungskonflikt | ☐ |
| 1 | c1_4 | Aylin, Business Analystin | Rollenkonflikt (RACI) | ☐ |
| 2 | c2_1 | Nina, Frontend-Entwicklerin | Glasl Ebene 1 | ☐ |
| 2 | c2_2 | Felix, DevOps-Engineer | Glasl Stufe 3 | ☐ |
| 2 | c2_3 | Lisa, Projektmitarbeiterin | Glasl Ebene 2, Mediation | ☐ |
| 2 | c2_4 | Daniel, Partnerfirma | Glasl Stufe 6 / Ebene 3 | ☐ |
| 3 | c3_1 | Kevin, Entwickler | TKI: Konkurrieren | ☐ |
| 3 | c3_2 | Mia, Product Owner | TKI: Zusammenarbeiten | ☐ |
| 3 | c3_3 | Eva, Datenbank-Expertin | TKI: Kompromiss | ☐ |
| 3 | c3_4 | Leon, Werkstudent | TKI: Vermeiden / Entgegenkommen | ☐ |
| 4 | conflict_01 | Lena, Entwicklerin | Harvard: Interessen statt Positionen (ANF) | ☐ |
| 4 | c4_2 | Robert, Senior-Entwickler | Harvard: Menschen und Probleme trennen | ☐ |
| 4 | c4_3 | Carla, Marketing-Leiterin | Harvard: Optionen entwickeln | ☐ |
| 4 | c4_4 | Herr Huber, Lieferant | Harvard: Objektive Kriterien, BATNA | ☐ |
| 5 | c5_1 | Frau Meier, Auftraggeberin | Zielkonflikt, magisches Dreieck | ☐ |
| 5 | c5_2 | Thomas, Leiter IT-Betrieb | Verteilungskonflikt, Eskalationsweg | ☐ |
| 5 | c5_3 | Herr Schneider, Kundendienst | Stakeholder-Konflikt | ☐ |
| 5 | c5_4 | Julia, neue Projektleiterin | Konfliktprävention | ☐ |

## Hinweise von Claude zur Prüfung (keine Fachaussagen)

1. **Lena-Fall: Theorie-Beispiel und Situation passen nicht ganz zusammen.** Die Situation sagt „verschiebt Termine“, das Beispiel sagt „Lena will weniger Termine“. Vorschlag: einheitlich „Deadlines“ oder „Abgabetermine“ verwenden. Außerdem hat dieser Fall nur 2 Antworten, alle anderen haben 3.
2. **Glasl-Stufennamen:** In der Literatur gibt es leicht unterschiedliche Bezeichnungen (z. B. „Sorge um Image und Koalition“ statt „Images und Koalitionen“). Bitte an die Kursliteratur angleichen.
3. **Thomas-Kilmann:** Im Englischen heißen die Stile Competing, Collaborating, Compromising, Avoiding, Accommodating. Die deutschen Begriffe variieren je nach Quelle (z. B. „Anpassen“ statt „Entgegenkommen“).
4. **Quellen fehlen:** Für Glasl, Thomas-Kilmann und das Harvard-Konzept (Fisher/Ury/Patton) sollten die Quellen festgelegt und ggf. im E-Learning genannt werden. Laut Anforderungen sind die Modelle nicht in U1 bis U3 enthalten.
5. **Gleiche Erklärung bei richtig und falsch:** Jede Frage hat ein Feld `explanation`, das bei jeder Antwort erscheint. Wenn ihr pro falscher Antwort eine eigene Rückmeldung wollt, kann das Format erweitert werden.
6. **Bewertung „richtig/falsch“ bei Antworten:** Manche „ungünstigen“ Antworten sind in anderen Situationen durchaus sinnvoll (z. B. Kompromiss). Die Konsequenztexte erklären das. Bitte prüfen, ob die Einordnung für euch stimmt.
