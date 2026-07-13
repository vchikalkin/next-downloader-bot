import { instagramUrlRegex, tiktokUrlRegex, youtubeUrlRegex } from '@/constants/regex';

export function validateInstagramUrl(url: string) {
  return instagramUrlRegex.test(url);
}

export function validateTikTokUrl(url: string) {
  return tiktokUrlRegex.test(url);
}

export function validateYoutubeUrl(url: string) {
  return youtubeUrlRegex.test(url);
}
