# DoYellow v1.1.1

Interaktive Produktvorschau von DoYellow, einer Browser-App für wiederkehrende Arbeit mit Mandanten:
Jahres-Prozesskalender, Kategorien, Aufgabengruppen, Serien, einfache Abhängigkeiten und Zustände.

Die Vorschau läuft komplett im Browser mit lokalen Muster-Daten (Muster1 GmbH, Muster2 GmbH und ein
Mini-Prozess "Monatsabschluss"). Es gibt kein Backend: Was du in der App anlegst, ist nach dem Neuladen weg.
Demo-Datum ist der 01.10.2026.

## Im Browser testen (GitHub Pages)

`index.html` im Repository-Root ist der fertige Build: eine einzelne Datei, alle Skripte und Styles eingebettet.
GitHub Pages: Settings → Pages → Source "Deploy from a branch" → Branch `main`, Ordner `/ (root)`.

## Entwickeln

    npm install
    npm run dev      # Dev-Server, öffnet app.html
    npm run build    # Typecheck, Build, danach neue index.html im Root

`app.html` ist der Einstieg für Vite (Quelle). `index.html` wird von `scripts/postbuild.mjs` erzeugt
und muss nach Änderungen neu gebaut und mit committet werden.

## Struktur

- `src/types.ts` – Datenmodell (Feldnamen Supabase-tauglich)
- `src/data/mock.ts` – alle Muster-Daten zentral
- `src/lib/generate.ts` – erzeugt Instanzen aus Aufgabengruppen (inkl. Abhängigkeiten); `regenerate` für "Serie bearbeiten"
- `src/lib/recurrence.ts` – Anker, Intervalle, Monatsende, Verschiebung, Feiertage NRW, Periodenschlüssel
- `src/lib/select.ts` – Status, Filter, Kennzahlen (reine Funktionen)
- `src/state/store.tsx` – Zustand per useReducer
- `src/components/` – Sidebar, TopBar, QuickFilters, Calendar, YearView, TaskList, ContextPanel, Drawer
- `src/views/Views.tsx` – Übersicht, Kalender, Aufgaben, Termine, Abwesenheiten, Wiedervorlagen, Notizen, Stammdaten

## Designregel

Farbe = Mandant. Form + Icon + Text = Status. Gelb nur Marke und Primäraktion.

## Prozessstruktur

Kategorie → Aufgabengruppe (Serie) → Instanz (konkreter Termin).
Zustände: Entwurf, Vorläufig, Bestätigt, Erledigt, Abgesagt.
Eine einzeln verschobene Instanz ist gesperrt (`overridden`); "Serie bearbeiten" schreibt sie nicht um.
