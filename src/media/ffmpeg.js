import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";
import { logger } from "../logger.js";

const execFileAsync = promisify(execFile);

/** Split a long audio file into ~5 min parts (stays under Whisper 25 MB limit). */
export async function splitAudio(audioFile, { tmpDir, segmentSeconds } = {}) {
  const outDir = tmpDir ?? config.audioTmpDir;
  const segTime = String(segmentSeconds ?? config.audioSegmentSeconds);
  logger.info("Splitting audio...");
  fs.mkdirSync(outDir, { recursive: true });

  const outputPattern = path.join(outDir, "part_%03d.mp3");
  await execFileAsync("ffmpeg", [
    "-i",
    audioFile,
    "-f",
    "segment",
    "-segment_time",
    segTime,
    "-acodec",
    "libmp3lame",
    "-b:a",
    "96k",
    outputPattern,
    "-y",
  ]);

  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith(".mp3"))
    .sort()
    .map((f) => path.join(outDir, f));
  logger.info(`Created ${files.length} audio parts.`);
  return files;
}

/** Extract a single mp3 track from a video file. */
export async function extractAudioFromVideo(videoFile, { tmpDir } = {}) {
  const outDir = tmpDir ?? config.videoTmpDir;
  fs.mkdirSync(outDir, { recursive: true });
  const audioFile = path.join(outDir, "audio.mp3");
  logger.info("Extracting audio from video...");
  await execFileAsync("ffmpeg", [
    "-i",
    videoFile,
    "-vn",
    "-acodec",
    "libmp3lame",
    "-b:a",
    "96k",
    audioFile,
    "-y",
  ]);
  logger.info(`Audio extracted: ${audioFile}`);
  return audioFile;
}

export function removePathIfExists(p) {
  try {
    if (p && fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
      else fs.unlinkSync(p);
    }
  } catch (err) {
    logger.warn(`Cleanup failed for ${p}: ${err.message}`);
  }
}
