import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from './logger';

const execFileAsync = promisify(execFile);

export const getDownloadUrl = async (url: string): Promise<string | undefined> => {
  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--get-url', url, '-f', 'b']);

    // Split by newlines and filter out empty strings
    const [downloadUrl] = stdout
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return downloadUrl ?? undefined;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('yt-dlp not found. Please install yt-dlp.');
    }

    logger.error(`Failed to get download URL for ${url}: ${error.message}`);
  }
};
