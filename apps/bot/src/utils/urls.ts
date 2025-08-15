import { TIKTOK_URL_REGEX } from '@/constants/regex';

export function validateTikTokUrl(url: string) {
  return TIKTOK_URL_REGEX.test(url);
}
