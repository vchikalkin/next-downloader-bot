import { logger } from './logger';
import { YtDlp } from 'ytdlp-nodejs';

export const getDownloadUrl = async (url: string): Promise<string | undefined> => {
  try {
    const ytdlp = new YtDlp();
    const [downloadUrl] = await ytdlp.getUrlsAsync(url, { format: 'b' });
    return downloadUrl;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('yt-dlp not found. Please install yt-dlp.');
    }

    logger.error(`Failed to get download URL for ${url}: ${error.message}`);
  }
};
