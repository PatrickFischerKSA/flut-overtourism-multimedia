# Overtourism Lernreise (Flut x Enzensberger x Groebner)

Dramaturgisch choreografierte, interaktive Reflexionseinheit als **Reise durch eine Lernlandschaft**.

## Neu in dieser Version

- Sichtbarer, animierter Video-Hintergrund (`SwissTourismus.mp4`) mit transparenter Glasoberflaeche.
- Mehrere waehlbare Reiserouten (inkl. Distance-Learning-Route).
- Stark vertiefte Textarbeit mit
  - Enzensberger-Paradoxon
  - Groebner **Abgefahren** (insb. Kap. 4-7)
  - Groebner **Ferienmuede**
  - Wiedmers *Flut* (Dropbox-Link)
- Begegnungsformate als "Reisebekanntschaften".
- Intellektueller Reiseblog inkl. lokaler Speicherung im Browser.
- Lehrerversion: Kommentare pro Blogeintrag plus automatisch generiertes, textgestuetztes Feedback (Wiedmer/Enzensberger/Groebner) mit kritisch-motivierendem Impuls.

## Struktur

- `index.html`: Hauptoberflaeche mit Routenwahl
- `styles.css`: Transparenz-/Video-Look + responsive Layout
- `app.js`: Mehr-Routen-Logik, Etappenfortschritt, Debattenkarten, Begegnungen, Bilanztool, Blog
- `docs/choreografie.md`: Route-basierte Durchfuehrung ohne Lektionstakt
- `docs/quellen-und-positionen.md`: Quellenmatrix und inhaltliche Achsen
- `material/*.pdf`: lokale Textgrundlagen

## Start

```bash
cd overtourism-reflexionseinheit
python3 -m http.server 8080
```

Dann im Browser: `http://localhost:8080`

## Lizenz

Der Code steht unter MIT (`LICENSE`).
Urheberrechtlich geschuetzte Primaertexte sind davon ausgenommen.
