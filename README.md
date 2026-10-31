# Flut Overtourism Multimedia

## Status
Dieses Paket enthaelt:
- Interaktive Story-Seite (`index.html`)
- Gesprochene Narration (`exports/audio/narration.m4a`)
- Kapitel-Audios (`exports/audio/01.m4a` bis `09.m4a`)
- Musikbett (`exports/audio/music-bed.m4a`)
- Untertitel (`exports/subtitles/flut-overtourism.de.srt` und `.vtt`)
- Rich MP4 mit Szenenbildern und Overlays (`exports/video/flut-overtourism-rich.mp4`)

## Rebuild
Falls du neu rendern willst:

```bash
cd "/Users/patrickfischer/Documents/New project/flut-overtourism-multimedia"
node build-media.mjs
node build-rich-video.mjs
```

Die Build-Skripte erzeugen einige Zwischenprodukte lokal, etwa AIFF-Roh-Audios und temporäre MP4-Dateien. Diese sind bewusst in `.gitignore` ausgeschlossen: Für die Website werden die finalen M4A-, Untertitel- und das Rich-MP4 versioniert. Das einfache Basis-MP4 ist nur ein lokal erzeugbares Zwischenprodukt und wird nicht mehr im Repository bereitgestellt.

## Eingangsdateien
- Kapiteltexte: `chapters.json`
- Narrative Seite: `script.js`
- Sprechertext-Referenz: `sprechertext.md`
