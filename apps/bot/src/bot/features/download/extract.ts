import type { MessageEntity } from '@grammyjs/types';
import { instagramUrlRegex, tiktokUrlRegex, youtubeUrlRegex } from '@/constants/regex';
import { validateInstagramUrl, validateTikTokUrl, validateYoutubeUrl } from '@/utils/urls';

const urlPatterns = [tiktokUrlRegex, instagramUrlRegex, youtubeUrlRegex];

export interface DownloadableLink {
  quote?: string;
  quotePosition?: number;
  url: string;
}

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
): DownloadableLink[] {
  const found: DownloadableLink[] = [];
  const seen = new Set<string>();

  const add = (urlRaw: string, quote?: string, quotePosition?: number) => {
    const url = urlRaw.trim();

    if (
      !url ||
      seen.has(url) ||
      found.some((existing) => sameLink(existing.url, url)) ||
      !isDownloadableUrl(url)
    ) {
      return;
    }

    seen.add(url);
    found.push({
      url,
      ...(quote
        ? {
            quote: quote.slice(0, 1024),
            quotePosition,
          }
        : {}),
    });
  };

  for (const entity of entities ?? []) {
    if (entity.type === 'url' && text) {
      const quote = text.slice(entity.offset, entity.offset + entity.length);

      add(quote, quote, entity.offset);
    } else if (entity.type === 'text_link' && text) {
      add(entity.url, text.slice(entity.offset, entity.offset + entity.length), entity.offset);
    }
  }

  if (text) {
    for (const pattern of urlPatterns) {
      for (const match of text.matchAll(withGlobalFlag(pattern))) {
        add(match[0], match[0], match.index);
      }
    }
  }

  return found;
}
