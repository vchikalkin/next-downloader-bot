import { getInstagramDownloadUrl } from '@/utils/instagram';
import { getTiktokDownloadUrl } from '@/utils/tiktok';
import { validateInstagramUrl, validateTikTokUrl, validateYoutubeUrl } from '@/utils/urls';
import { getYoutubeDownloadUrl } from '@/utils/youtube';

export interface DownloadResult {
  caption?: string;
  imagesUrls?: string[];
  videoFilePath?: string;
  videoUrl?: string;
}

export type Platform = 'instagram' | 'tiktok' | 'youtube';

export function detectPlatform(url: string): null | Platform {
  if (validateTikTokUrl(url)) {
    return 'tiktok';
  }

  if (validateInstagramUrl(url)) {
    return 'instagram';
  }

  if (validateYoutubeUrl(url)) {
    return 'youtube';
  }

  return null;
}

export async function fetchDownload(url: string, platform: Platform): Promise<DownloadResult> {
  switch (platform) {
    case 'instagram': {
      const result = await getInstagramDownloadUrl(url);

      return {
        caption: result.caption,
        imagesUrls: result.images,
        videoFilePath: result.filePath,
      };
    }

    case 'tiktok': {
      const result = await getTiktokDownloadUrl(url);

      return {
        caption: result.caption,
        imagesUrls: result.images,
        videoFilePath: result.filePath,
      };
    }

    case 'youtube': {
      const result = await getYoutubeDownloadUrl(url);

      return { videoFilePath: result.filePath };
    }

    default: {
      const exhaustiveCheck: never = platform;

      throw new Error(`Unhandled platform: ${String(exhaustiveCheck)}`);
    }
  }
}

export function hasDownloadableMedia(result: DownloadResult): boolean {
  return Boolean(result.videoUrl || result.videoFilePath || result.imagesUrls?.length);
}
