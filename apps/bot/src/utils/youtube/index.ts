import { downloadToFile } from '../yt-dlp';

export async function getYoutubeDownloadUrl(url: string) {
  const filePath = await downloadToFile(url);

  return { filePath };
}
