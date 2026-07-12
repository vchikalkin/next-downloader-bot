import { downloadToFile, getInfo } from '../yt-dlp';
import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';

export async function getYoutubeDownloadUrl(url: string) {
  const infoData = await getInfo(url);

  if (!infoData) throw new Error('err-invalid-youtube-response');

  if (infoData.duration > MAX_VIDEO_DURATION_SECONDS)
    throw new Error('err-youtube-duration-exceeded');

  const filePath = await downloadToFile(url);

  return { filePath, title: infoData.title };
}
