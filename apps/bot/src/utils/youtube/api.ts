import axios from 'axios';

type DlsrvResponse = {
  duration: number;
  filename: string;
  status: string;
  url: string;
};

export async function getYoutubeDownload(url: string) {
  const videoId = getYouTubeVideoId(url);

  const { data } = await axios.post<DlsrvResponse>('https://embed.dlsrv.online/api/download/mp4', {
    format: 'mp4',
    quality: '720',
    videoId,
  });

  return data.url;
}

export function getYouTubeVideoId(link: string) {
  const url = new URL(link);

  // 1. shorts
  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/')[2] || null;
  }

  // 2. обычное видео: watch?v=
  const vParam = url.searchParams.get('v');
  if (vParam) return vParam;

  // 3. короткая ссылка youtu.be
  if (url.hostname.includes('youtu.be')) {
    return url.pathname.slice(1) || null;
  }

  return null;
}
