import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';

const jar = new tough.CookieJar();

const headers = {
  accept: '*/*',
  'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json',
  dnt: '1',
  priority: 'u=1, i',
  'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
};

const client = wrapper(
  axios.create({
    headers,
    jar,
    withCredentials: true,
  }),
);

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
  // get session cookie
  await client.get('https://downr.org/.netlify/functions/analytics');

  // fetch video info
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
