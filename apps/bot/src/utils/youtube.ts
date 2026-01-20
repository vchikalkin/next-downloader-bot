import { getClient } from './client';
import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';

export type DownloadRoot = {
  duration: number;
  filename: string;
  status: string;
  url: string;
};

export type InfoRoot = {
  duration: number;
  medias: Media[];
  thumbnail: string;
  title: string;
};

export type Media = {
  extension: string;
  fileSize: number;
  quality: string;
  type: string;
};

const qualityOrder = ['144p', '240p', '360p', '480p', '1080p', '720p'].reverse();

export async function getYoutubeDownloadUrl(url: string) {
  const client = await getClient();
  // fetch info
  const { data: infoData } = await client.post<InfoRoot>(
    'https://downr.org/.netlify/functions/video-info',
    {
      url,
    },
  );

  if (!infoData?.medias.length) throw new Error('err-invalid-youtube-response');
  if (infoData.duration > MAX_VIDEO_DURATION_SECONDS)
    throw new Error('err-youtube-duration-exceeded');

  let quality: string | undefined;

  for (const q of qualityOrder) {
    const hasQuality = infoData.medias.find(
      (media) => media.type === 'video' && media.quality === q && media.extension === 'mp4',
    );

    if (hasQuality) {
      quality = q;
      break;
    }
  }

  if (!quality) throw new Error('err-youtube-no-quality');

  // fetch download link
  const { data: downloadData } = await client.post<DownloadRoot>(
    'https://downr.org/.netlify/functions/youtube-download',
    {
      downloadMode: 'video',
      url,
      videoQuality: quality,
    },
  );

  return {
    play: downloadData.url,
  };
}
