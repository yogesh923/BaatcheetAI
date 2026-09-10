import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";
import { logger } from "../logger.js";

const execFileAsync = promisify(execFile);

/** Run ffmpeg/ffprobe with a short, readable error instead of a full dump. */
const runMediaTool = async (tool, args) => {
  try {
    return await execFileAsync(tool, args, { maxBuffer: 16 * 1024 * 1024 });
  } catch (err) {
    if (err?.code === "ENOENT") throw err;
    const stderr = (err?.stderr ?? "")
      .toString()
      .trim()
      .split("\n")
      .filter((l) => !l.startsWith("ffmpeg version") && !l.startsWith("  configuration:"))
      .slice(-3)
      .join(" ");
    throw new Error(`ffmpeg failed: ${stderr || err.message}`);
  }
};

/**
 * True when the file has at least one audio stream. Falls back to true when
 * ffprobe is unavailable — ffmpeg then reports the real problem itself.
 */
export async function hasAudioStream(file) {
  try {
    const { stdout } = await runMediaTool("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=index",
      "-of",
      "csv=p=0",
      file,
    ]);
    return stdout.trim().length > 0;
  } catch {
    return true;
  }
}

/** Split a long audio file into ~5 min parts (stays under Whisper 25 MB limit). */
export async function splitAudio(audioFile, { tmpDir, segmentSeconds } = {}) {
  const outDir = tmpDir ?? config.audioTmpDir;
  const segTime = String(segmentSeconds ?? config.audioSegmentSeconds);
  logger.info("Splitting audio...");
  fs.mkdirSync(outDir, { recursive: true });

  const outputPattern = path.join(outDir, "part_%03d.mp3");
  await runMediaTool("ffmpeg", [
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
  if (!(await hasAudioStream(videoFile))) {
    throw new Error(
      "This video has no audio track, so there is nothing to transcribe. " +
        "Upload a video with narration or sound and try again."
    );
  }
  await runMediaTool("ffmpeg", [
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
