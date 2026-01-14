import { INSTAGRAM_URL_REGEX, TIKTOK_URL_REGEX, YOUTUBE_URL_REGEX } from '@/constants/regex';

export function validateInstagramUrl(url: string) {
  return INSTAGRAM_URL_REGEX.test(url);
}

export function validateTikTokUrl(url: string) {
  return TIKTOK_URL_REGEX.test(url);
}

export function validateYoutubeUrl(url: string) {
  return YOUTUBE_URL_REGEX.test(url);
}
