import type { MessageEntity } from '@grammyjs/types';
import { instagramUrlRegex, tiktokUrlRegex, youtubeUrlRegex } from '@/constants/regex';
import { validateInstagramUrl, validateTikTokUrl, validateYoutubeUrl } from '@/utils/urls';

const urlPatterns = [tiktokUrlRegex, instagramUrlRegex, youtubeUrlRegex];

function isDownloadableUrl(url: string) {
  return validateTikTokUrl(url) || validateInstagramUrl(url) || validateYoutubeUrl(url);
}

function sameLink(left: string, right: string) {
  const a = left.replace(/\/+$/u, '');
  const b = right.replace(/\/+$/u, '');
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;

  return shorter === longer || longer.startsWith(`${shorter}?`) || longer.startsWith(`${shorter}/`);
}

function withGlobalFlag(regex: RegExp): RegExp {
  return new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
}

export function extractDownloadableUrls(
  text: string | undefined,
  entities?: MessageEntity[],
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const url = raw.trim();

    if (!url || seen.has(url) || found.some((existing) => sameLink(existing, url)) || !isDownloadableUrl(url)) {
      return;
    }

    seen.add(url);
    found.push(url);
  };

  for (const entity of entities ?? []) {
    if (entity.type === 'url' && text) {
      add(text.slice(entity.offset, entity.offset + entity.length));
    } else if (entity.type === 'text_link') {
      add(entity.url);
    }
  }

  if (text) {
    for (const pattern of urlPatterns) {
      for (const match of text.matchAll(withGlobalFlag(pattern))) {
        add(match[0]);
      }
    }
  }

  return found;
}
