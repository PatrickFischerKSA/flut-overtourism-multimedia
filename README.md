# Flut Overtourism Multimedia

## Status
Dieses Paket enthaelt:
- Interaktive Story-Seite (`index.html`)
- Gesprochene Narration (`exports/audio/narration.m4a`)
- Musikbett (`exports/audio/music-bed.m4a`)
- Untertitel (`exports/subtitles/flut-overtourism.de.srt` und `.vtt`)
- Finale MP4 (`exports/video/flut-overtourism.mp4`)
- Rich MP4 mit Szenenbildern und Overlays (`exports/video/flut-overtourism-rich.mp4`)

## Rebuild
Falls du neu rendern willst:

```bash
cd "/Users/patrickfischer/Documents/New project/flut-overtourism-multimedia"
node build-media.mjs
node build-rich-video.mjs
```

## Eingangsdateien
- Kapiteltexte: `chapters.json`
- Narrative Seite: `script.js`
- Sprechertext-Referenz: `sprechertext.md`
