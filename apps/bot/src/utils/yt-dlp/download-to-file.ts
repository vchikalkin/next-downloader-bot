import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runYtDlp } from './yt-dlp';

// Prefer exact 720p (height for landscape, width for Shorts), then best ≤720
const FORMAT = [
  'bv*[height=720]+ba',
  'bv*[width=720]+ba',
  'bv*[height<=720]+ba',
  'bv*[width<=720]+ba',
  'b[height=720]/b[width=720]/b[height<=720]/b[width<=720]',
].join('/');

export async function downloadToFile(url: string, outDir?: string): Promise<string> {
  const dir = outDir ?? (await mkdtemp(join(tmpdir(), 'yt-dlp-')));
  const outputTemplate = join(dir, '%(id)s.%(ext)s');

  try {
    await runYtDlp([
      '-f',
      FORMAT,
      '--no-playlist',
      '--merge-output-format',
      'mp4',
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

    return videoFile.path;
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}
