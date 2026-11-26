import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { MAX_DOWNLOAD_BYTES } from '@/constants/limits';
import { cookieHeader, cookiesFilePath } from '../cookies';
import { asNumber, asString, isRecord } from '../extract';
import { assertMaxVideoDuration } from '../video-duration';
import { runYtDlp } from './yt-dlp';

const execFileAsync = promisify(execFile);

// Progressive ~360p via android client. Adaptive needs PO tokens and hangs/403s.
const YOUTUBE_FORMAT = 'b[height<=360]/b[width<=360]/18/worst';
const YOUTUBE_EXTRACTOR_ARGS = 'youtube:player_client=android';
const INSTAGRAM_FORMAT =
  'b[height<=720][ext=mp4]/b[ext=mp4]/bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720]/b/best';
const FFPROBE_TIMEOUT_MS = 15_000;

export interface YtDlpVideoResult {
  caption?: string;
  filePath: string;
}

export function parseYtDlpMeta(stdout: string): { caption?: string; duration: number | null } {
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index = index - 1) {
    const line = lines[index];

    if (!line?.startsWith('{')) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(line);

      if (isRecord(parsed)) {
        return {
          caption: asString(parsed.description) ?? undefined,
          duration: asNumber(parsed.duration),
        };
      }
    } catch {
      // Ignore non-JSON lines emitted by yt-dlp
    }
  }

  return { duration: null };
}

async function probeDurationSeconds(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: FFPROBE_TIMEOUT_MS },
    );
    const parsed = Number(stdout.trim());

    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function findLargestVideoFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const candidates = await Promise.all(
    files
      .filter((file) => /\.(?:mp4|mkv|webm)$/iu.test(file))
      .map(async (file) => {
        const path = join(dir, file);
        const { size } = await stat(path);

        return { path, size };
      }),
  );

  let videoFile = candidates[0];

  for (const candidate of candidates) {
    if (!videoFile || candidate.size > videoFile.size) {
      videoFile = candidate;
    }
  }

  if (!videoFile) {
    throw new Error('yt-dlp did not produce an output file');
  }

  if (videoFile.size < 1024) {
    throw new Error(`yt-dlp produced empty file (${String(videoFile.size)} bytes)`);
  }

  return videoFile.path;
}

async function copyInstagramCookies(dir: string): Promise<string | undefined> {
  const sourcePath = cookiesFilePath();

  if (!sourcePath || !(await cookieHeader('instagram.com'))) {
    return undefined;
  }

  // Copy off :ro mount so yt-dlp's save_cookies on exit cannot fail.
  const targetPath = join(dir, 'cookies.txt');

  try {
    await copyFile(sourcePath, targetPath);

    return targetPath;
  } catch {
    return undefined;
  }
}

async function assertUrlDuration(url: string): Promise<void> {
  const raw = await runYtDlp([
    '--print',
    'duration',
    '--extractor-args',
    YOUTUBE_EXTRACTOR_ARGS,
    '--force-ipv4',
    '--no-playlist',
    url,
  ]);
  const duration = Number(raw.trim());

  assertMaxVideoDuration(Number.isFinite(duration) ? duration : null);
}

export async function downloadToFile(url: string, outDir?: string): Promise<string> {
  await assertUrlDuration(url);

  const dir = outDir ?? (await mkdtemp(join(tmpdir(), 'yt-dlp-')));
  const outputTemplate = join(dir, '%(id)s.%(ext)s');

  try {
    await runYtDlp([
      '-f',
      YOUTUBE_FORMAT,
      '--extractor-args',
      YOUTUBE_EXTRACTOR_ARGS,
      '--force-ipv4',
      '--no-playlist',
      '--max-filesize',
      String(MAX_DOWNLOAD_BYTES),
      '-o',
      outputTemplate,
      url,
    ]);

    return await findLargestVideoFile(dir);
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}

export async function downloadInstagramVideo(url: string): Promise<YtDlpVideoResult> {
  const dir = await mkdtemp(join(tmpdir(), 'yt-dlp-'));
  const outputTemplate = join(dir, '%(id)s.%(ext)s');

  try {
    const tempCookies = await copyInstagramCookies(dir);
    const stdout = await runYtDlp([
      '--no-update',
      '--playlist-items',
      '1',
      '--force-ipv4',
      '--max-filesize',
      String(MAX_DOWNLOAD_BYTES),
      '-f',
      INSTAGRAM_FORMAT,
      '--merge-output-format',
      'mp4',
      '--print-json',
      ...(tempCookies ? ['--cookies', tempCookies] : []),
      '-o',
      outputTemplate,
      url,
    ]);
    const filePath = await findLargestVideoFile(dir);
    const { caption, duration } = parseYtDlpMeta(stdout);
    const resolvedDuration = duration ?? (await probeDurationSeconds(filePath));

    assertMaxVideoDuration(resolvedDuration);

    return { caption, filePath };
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}
