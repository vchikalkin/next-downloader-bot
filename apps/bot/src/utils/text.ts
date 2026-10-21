import { tagsRegex } from '@/constants/regex';

export function removeHashtags(caption: string): string {
  return caption.replaceAll(tagsRegex, '').trim();
}
