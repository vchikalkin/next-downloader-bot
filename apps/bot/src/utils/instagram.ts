import { getClient } from './client';
import { logger } from './logger';
import { retry } from './retry';

const INSTAGRAM_DOWNLOAD_RETRY_COUNT = 5;
const INSTAGRAM_DOWNLOAD_RETRY_DELAY_MS = 500;

export type InfoRoot = {
  author: string;
  error: boolean;
  like_count: number;
  medias: Media[];
  music_attribution_info: unknown;
  owner: Owner;
  shortcode: string;
  source: string;
  thumbnail: string;
  time_end: number;
  title: string;
  type: string;
  url: string;
  view_count: unknown;
};

export type Media = {
  bandwidth?: number;
  codec?: string;
  extension: string;
  frameRate: unknown;
  id: string;
  is_audio: boolean;
  mimeType?: string;
  quality: string;
  resolution?: string;
  thumbnail?: string;
  type: string;
  url: string;
};

export type Owner = {
  __typename: string;
  ai_agent_owner_username: unknown;
  friendship_status: unknown;
  id: string;
  is_private: boolean;
  is_unpublished: boolean;
  is_verified: boolean;
  pk: string;
  profile_pic_url: string;
  show_account_transparency_details: boolean;
  transparency_label: unknown;
  transparency_product: unknown;
  transparency_product_enabled: boolean;
  username: string;
};

export async function getInstagramDownloadUrl(url: string) {
  const client = await getClient();

  const { data } = await retry(
    () =>
      client.post<InfoRoot>('https://downr.org/.netlify/functions/nyt', {
        url,
      }),
    {
      delayMs: INSTAGRAM_DOWNLOAD_RETRY_DELAY_MS,
      factor: 2,
      onRetry: (error, attempt) => {
        logger.warn(
          { attempt, error: (error as Error)?.message, url },
          `Instagram download attempt ${attempt}/${INSTAGRAM_DOWNLOAD_RETRY_COUNT} failed, retrying...`,
        );
      },
      retries: INSTAGRAM_DOWNLOAD_RETRY_COUNT,
    },
  );

  if (!data) throw new Error('err-invalid-instagram-response');

  const video = data.medias.find((media) => media.type === 'video');

  if (video) {
    return {
      caption: data.title,
      images: [],
      play: video.url,
    };
  }

  return {
    caption: data.title,
    images: data.medias.map((media) => media.url),
    play: undefined,
  };
}
