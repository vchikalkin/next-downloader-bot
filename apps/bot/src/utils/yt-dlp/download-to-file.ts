import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ERR_VIDEO_DURATION_EXCEEDED } from '@/constants/i18n';
import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';
import { runYtDlp } from './yt-dlp';

// Progressive ~360p via android client. Adaptive needs PO tokens and hangs/403s.
const FORMAT = 'b[height<=360]/b[width<=360]/18/worst';
const EXTRACTOR_ARGS = 'youtube:player_client=android';

export async function downloadToFile(url: string, outDir?: string): Promise<string> {
  const dir = outDir ?? (await mkdtemp(join(tmpdir(), 'yt-dlp-')));
  const outputTemplate = join(dir, '%(id)s.%(ext)s');

  try {
    await runYtDlp([
      '-f',
      FORMAT,
      '--extractor-args',
      EXTRACTOR_ARGS,
      '--force-ipv4',
      '--no-playlist',
      '--match-filter',
      `duration <= ${String(MAX_VIDEO_DURATION_SECONDS)}`,
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

    if (error instanceof Error && /match.?filter/iu.test(error.message)) {
      throw new Error(ERR_VIDEO_DURATION_EXCEEDED);
    }

    throw error;
  }
}
