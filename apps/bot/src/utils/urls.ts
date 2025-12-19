import { INSTAGRAM_URL_REGEX, TIKTOK_URL_REGEX } from '@/constants/regex';

export function validateTikTokUrl(url: string) {
  return TIKTOK_URL_REGEX.test(url);
}

export function validateInstagramUrl(url: string) {
  return INSTAGRAM_URL_REGEX.test(url);
}
