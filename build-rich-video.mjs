import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const projectDir = process.cwd();
const exportsDir = path.join(projectDir, "exports");
const videoDir = path.join(exportsDir, "video");
const audioDir = path.join(exportsDir, "audio");
const imagesDir = path.join(projectDir, "assets", "scene-images");

mkdirSync(videoDir, { recursive: true });
mkdirSync(audioDir, { recursive: true });

const manifestPath = path.join(exportsDir, "manifest.json");
const narrationPath = path.join(audioDir, "narration.m4a");

if (!existsSync(manifestPath)) {
  throw new Error("manifest.json fehlt. Bitte zuerst: node build-media.mjs");
}
if (!existsSync(narrationPath)) {
  throw new Error("Audio fehlt. Bitte zuerst: node build-media.mjs");
}
if (!existsSync(imagesDir)) {
  throw new Error("assets/scene-images fehlt.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const chapters = manifest.chapters;

if (!Array.isArray(chapters) || chapters.length === 0) {
  throw new Error("manifest.json enthaelt keine Kapitel.");
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
      const p = run(cmd).trim();
      if (p && existsSync(p)) {
        return p;
      }
    } catch {
      // next
    }
  }
  const fallback =
    "/Users/patrickfischer/.local/lib/python3.13/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1";
  if (existsSync(fallback)) {
    return fallback;
  }
  throw new Error("Kein ffmpeg gefunden.");
}

function runOrThrow(command, args) {
  const res = spawnSync(command, args, { encoding: "utf-8" });
  if (res.status !== 0) {
    throw new Error(`${command} fehlgeschlagen\n${res.stderr || res.stdout}`);
  }
}

function escText(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/,/g, "\\,");
}

const ffmpeg = getFfmpegPath();

const images = readdirSync(imagesDir)
  .filter((name) => name.toLowerCase().endsWith(".jpg"))
  .sort()
  .map((name) => path.join(imagesDir, name));

if (images.length === 0) {
  throw new Error("Keine JPG-Bilder in assets/scene-images gefunden.");
}

const imageByChapter = chapters.map((_, idx) => images[idx % images.length]);

const slideshowListPath = path.join(videoDir, "slideshow.txt");
const slideshowLines = [];

for (let i = 0; i < chapters.length; i += 1) {
  const currentImage = imageByChapter[i];
  const duration = Number((chapters[i].end - chapters[i].start).toFixed(3));
  slideshowLines.push(`file '${currentImage.replace(/'/g, "'\\''")}'`);
  slideshowLines.push(`duration ${duration}`);
}
slideshowLines.push(`file '${imageByChapter[imageByChapter.length - 1].replace(/'/g, "'\\''")}'`);
writeFileSync(slideshowListPath, slideshowLines.join("\n") + "\n", "utf-8");

const totalDuration = Number(manifest.durationSeconds || chapters[chapters.length - 1].end);

const musicPath = path.join(audioDir, "music-bed.m4a");
runOrThrow(ffmpeg, [
  "-y",
  "-f",
  "lavfi",
  "-i",
  `sine=frequency=110:sample_rate=44100:duration=${totalDuration}`,
  "-f",
  "lavfi",
  "-i",
  `sine=frequency=165:sample_rate=44100:duration=${totalDuration}`,
  "-filter_complex",
  `[0:a]volume=0.045[a0];[1:a]volume=0.03[a1];[a0][a1]amix=inputs=2,lowpass=f=900,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(totalDuration - 2, 0)}:d=2[m]`,
  "-map",
  "[m]",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  musicPath
]);

const visualOnlyPath = path.join(videoDir, "rich-visual.mp4");
runOrThrow(ffmpeg, [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  slideshowListPath,
  "-vf",
  "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=contrast=1.03:saturation=1.1,format=yuv420p",
  "-r",
  "25",
  "-pix_fmt",
  "yuv420p",
  "-t",
  String(totalDuration),
  "-c:v",
  "libx264",
  visualOnlyPath
]);

const chapterDraws = chapters.map((ch) => {
  const label = escText(`${ch.period} | ${ch.title}`);
  const start = Number(ch.start).toFixed(2);
  const end = Number(ch.end).toFixed(2);
  return `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${label}':fontsize=48:fontcolor=white:box=1:boxcolor=0x00000088:boxborderw=14:x=(w-text_w)/2:y=70:enable='between(t,${start},${end})'`;
});

const heading = escText("Von der Alpenidylle zur Flut");
const videoFilter = [
  "scale=1920:1080,format=yuv420p",
  `drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${heading}':fontsize=56:fontcolor=#f8e8b0:x=(w-text_w)/2:y=980`,
  ...chapterDraws
].join(",");

const richFinalPath = path.join(videoDir, "flut-overtourism-rich.mp4");
runOrThrow(ffmpeg, [
  "-y",
  "-i",
  visualOnlyPath,
  "-i",
  narrationPath,
  "-i",
  musicPath,
  "-filter_complex",
  `[0:v]${videoFilter}[vout];[1:a]volume=1.0[n];[2:a]volume=0.20[m];[n][m]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
  "-map",
  "[vout]",
  "-map",
  "[aout]",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  richFinalPath
]);

console.log("Rich-Video fertig:");
console.log(`- ${path.relative(projectDir, richFinalPath)}`);
console.log(`- Musikbett: ${path.relative(projectDir, musicPath)}`);
console.log(`- Bilder: ${path.relative(projectDir, imagesDir)} (${images.length} Dateien)`);
