import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectDir = process.cwd();
const chaptersPath = path.join(projectDir, "chapters.json");
const outDir = path.join(projectDir, "exports");
const audioDir = path.join(outDir, "audio");
const subtitleDir = path.join(outDir, "subtitles");
const videoDir = path.join(outDir, "video");

mkdirSync(audioDir, { recursive: true });
mkdirSync(subtitleDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

const chapters = JSON.parse(readFileSync(chaptersPath, "utf-8"));
if (!Array.isArray(chapters) || chapters.length === 0) {
  throw new Error("chapters.json ist leer oder ungueltig.");
}

function run(command) {
  return execSync(command, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8"
  });
}

function getFfmpegPath() {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  const probes = [
    "/opt/anaconda3/bin/python3 -c \"import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())\"",
    "python3 -c \"import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())\""
  ];

  for (const cmd of probes) {
    try {
      const ffmpegPath = run(cmd).trim();
      if (ffmpegPath && existsSync(ffmpegPath)) {
        return ffmpegPath;
      }
    } catch {
      // Probe failed; continue with next fallback.
    }
  }

  const staticFallback =
    "/Users/patrickfischer/.local/lib/python3.13/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1";
  if (existsSync(staticFallback)) {
    return staticFallback;
  }

  throw new Error(
    "Kein ffmpeg gefunden. Setze FFMPEG_PATH oder installiere imageio-ffmpeg."
  );
}

function ensureCommandExists(cmd) {
  const check = spawnSync("sh", ["-lc", `command -v ${cmd}`], { encoding: "utf-8" });
  if (check.status !== 0) {
    throw new Error(`Benoetigter Befehl fehlt: ${cmd}`);
  }
}

function toTimestamp(sec, sep = ",") {
  const totalMs = Math.round(sec * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
}

function escapeSubtitleText(text) {
  return text.replace(/\r?\n/g, " ").trim();
}

function getDurationSeconds(ffmpegPath, filePath) {
  const probe = spawnSync(ffmpegPath, ["-i", filePath], {
    encoding: "utf-8"
  });
  const stderr = probe.stderr ?? "";
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Dauer konnte nicht gelesen werden: ${filePath}`);
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  return h * 3600 + m * 60 + s;
}

function sayToAiff(text, outFile) {
  const args = ["-v", "Anna", "-r", "172", "-o", outFile, text];
  const res = spawnSync("say", args, { encoding: "utf-8" });
  if (res.status !== 0) {
    throw new Error(`say fehlgeschlagen fuer ${outFile}: ${res.stderr || res.stdout}`);
  }
}

function runSpawnOrThrow(command, args) {
  const res = spawnSync(command, args, { encoding: "utf-8" });
  if (res.status !== 0) {
    throw new Error(
      `${command} fehlgeschlagen.\n${(res.stderr || "").trim() || (res.stdout || "").trim()}`
    );
  }
}

function escapeDrawtext(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

ensureCommandExists("say");
const ffmpegPath = getFfmpegPath();

const segmentFiles = [];
const timings = [];

let cursor = 0;
for (const chapter of chapters) {
  const segmentPath = path.join(audioDir, `${chapter.id}.aiff`);
  sayToAiff(chapter.text, segmentPath);
  const duration = getDurationSeconds(ffmpegPath, segmentPath);
  const start = cursor;
  const end = cursor + duration;
  cursor = end;

  segmentFiles.push(segmentPath);
  timings.push({
    ...chapter,
    duration,
    start,
    end
  });
}

const concatFile = path.join(audioDir, "concat.txt");
writeFileSync(
  concatFile,
  segmentFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  "utf-8"
);

const narrationPath = path.join(audioDir, "narration.m4a");
runSpawnOrThrow(ffmpegPath, [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatFile,
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  narrationPath
]);

const srtLines = [];
const vttLines = ["WEBVTT", ""];

timings.forEach((entry, index) => {
  const text = `${entry.period}: ${escapeSubtitleText(entry.text)}`;
  srtLines.push(String(index + 1));
  srtLines.push(`${toTimestamp(entry.start)} --> ${toTimestamp(entry.end)}`);
  srtLines.push(text);
  srtLines.push("");

  vttLines.push(`${toTimestamp(entry.start, ".")} --> ${toTimestamp(entry.end, ".")}`);
  vttLines.push(text);
  vttLines.push("");
});

const srtPath = path.join(subtitleDir, "flut-overtourism.de.srt");
const vttPath = path.join(subtitleDir, "flut-overtourism.de.vtt");
writeFileSync(srtPath, srtLines.join("\n"), "utf-8");
writeFileSync(vttPath, vttLines.join("\n"), "utf-8");

const totalDuration = timings[timings.length - 1].end + 0.25;
const baseVideoPath = path.join(videoDir, "base.mp4");
const finalVideoPath = path.join(videoDir, "flut-overtourism.mp4");

const heading = escapeDrawtext("Von der Alpenidylle zur Flut");
const subheading = escapeDrawtext("Zeitraffer 1771 bis heute");
const footer = escapeDrawtext("Historische Entwicklung und Overtourism");

runSpawnOrThrow(ffmpegPath, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  `color=c=#162f3b:s=1920x1080:d=${totalDuration}`,
  "-i",
  narrationPath,
  "-vf",
  `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${heading}':fontcolor=white:fontsize=78:x=(w-text_w)/2:y=220,drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${subheading}':fontcolor=#e9d9a8:fontsize=48:x=(w-text_w)/2:y=340,drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${footer}':fontcolor=#92d5cf:fontsize=42:x=(w-text_w)/2:y=920`,
  "-r",
  "25",
  "-pix_fmt",
  "yuv420p",
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  baseVideoPath
]);

runSpawnOrThrow(ffmpegPath, [
  "-y",
  "-i",
  baseVideoPath,
  "-i",
  srtPath,
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-c:s",
  "mov_text",
  "-metadata:s:s:0",
  "language=deu",
  finalVideoPath
]);

const manifest = {
  generatedAt: new Date().toISOString(),
  voice: "Anna",
  narration: path.relative(projectDir, narrationPath),
  subtitles: {
    srt: path.relative(projectDir, srtPath),
    vtt: path.relative(projectDir, vttPath)
  },
  video: path.relative(projectDir, finalVideoPath),
  durationSeconds: Number(totalDuration.toFixed(2)),
  chapters: timings.map((t) => ({
    id: t.id,
    period: t.period,
    title: t.title,
    start: Number(t.start.toFixed(3)),
    end: Number(t.end.toFixed(3))
  }))
};

writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf-8"
);

console.log("Medienexport fertig:");
console.log(`- Audio: ${manifest.narration}`);
console.log(`- Untertitel SRT: ${manifest.subtitles.srt}`);
console.log(`- Untertitel VTT: ${manifest.subtitles.vtt}`);
console.log(`- Video: ${manifest.video}`);
