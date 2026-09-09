import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';
import { logger } from '../logger';
import { downloadToFile, getInfo } from '../yt-dlp';
import { downloadYoutubeInnertube } from './innertube';

export async function getYoutubeDownloadUrl(url: string) {
  try {
    const result = await downloadYoutubeInnertube(url);

    if (result.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error('err-youtube-duration-exceeded');
    }

    return { filePath: result.filePath, title: result.title };
  } catch (error) {
    if (error instanceof Error && error.message === 'err-youtube-duration-exceeded') {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    logger.warn({ error: message, url }, 'YouTube InnerTube failed, falling back to yt-dlp');
  }

  const infoData = await getInfo(url);

  if (!infoData.id) {
    throw new Error('err-invalid-youtube-response');
  }

  if (infoData.duration > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error('err-youtube-duration-exceeded');
  }

  const filePath = await downloadToFile(url);

  return { filePath, title: infoData.title };
}
