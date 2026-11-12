import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_DOWNLOAD_BYTES } from '@/constants/limits';
import { cookiesFilePath } from '../cookies';
import { assertMaxVideoDuration } from '../video-duration';
import { runYtDlp } from './yt-dlp';

// ≤720p either orientation (Shorts are often 720x1280 — height<=720 alone would under-pick).
// Prefer h264 via -S; fall back to progressive. No forced player_client — that hides adaptive HD.
const FORMAT =
  'bv*[vcodec^=avc1][height<=1280][width<=1280]+ba[ext=m4a]/bv*[height<=1280][width<=1280]+ba[ext=m4a]/b/18/worst';
const FORMAT_SORT = 'res:720,vcodec:h264';

function cookieArgs(): string[] {
  const path = cookiesFilePath();

  return path ? ['--cookies', path] : [];
}

async function assertUrlDuration(url: string): Promise<void> {
  const raw = await runYtDlp([
    '--print',
    'duration',
    '--force-ipv4',
    '--no-playlist',
    ...cookieArgs(),
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
      FORMAT,
      '-S',
      FORMAT_SORT,
      '--merge-output-format',
      'mp4',
      '--force-ipv4',
      '--no-playlist',
      '--max-filesize',
      String(MAX_DOWNLOAD_BYTES),
      ...cookieArgs(),
      '-o',
      outputTemplate,
      url,
    ]);

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

    candidates.sort((a, b) => b.size - a.size);
    const videoFile = candidates[0];

    if (!videoFile) {
      throw new Error('yt-dlp did not produce an output file');
    }

    if (videoFile.size < 1024) {
      throw new Error(`yt-dlp produced empty file (${String(videoFile.size)} bytes)`);
    }

    return videoFile.path;
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}
