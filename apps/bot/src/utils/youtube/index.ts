import { getInfo, ytDlpGetUrl } from '../yt-dlp';
import { getYoutubeDownload } from './api';
import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';

export async function getYoutubeDownloadUrl(url: string) {
  const infoData = await getInfo(url);

  if (!infoData) throw new Error('err-invalid-youtube-response');

  if (infoData.duration > MAX_VIDEO_DURATION_SECONDS)
    throw new Error('err-youtube-duration-exceeded');

  let play: string | undefined;
  try {
    play = await getYoutubeDownload(url);
  } catch {
    play = await ytDlpGetUrl(url);
  }

  return { play, title: infoData.title };
}
