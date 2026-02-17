import { runYtDlp } from './yt-dlp';

export async function ytDlpGetUrl(url: string): Promise<string> {
  const output = await runYtDlp([
    '-f',
    // '298+ba/136+ba/22+ba/247+251/best[height<=720]+ba/bv+ba',
    'best[height<=720]+ba/bv+ba',
    '-g',
    '--no-playlist',
    '--no-warnings',
    url,
  ]);

  // yt-dlp может вернуть несколько строк — берём первую
  const directUrl = output.split('\n')[0];

  if (!directUrl?.startsWith('http')) {
    throw new Error('Failed to get direct video URL');
  }

  return directUrl;
}
