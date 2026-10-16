import type { MessageEntity } from '@grammyjs/types';
import { instagramUrlRegex, tiktokUrlRegex, youtubeUrlRegex } from '@/constants/regex';
import { isSupportedMediaUrl } from '@/utils/urls';

const urlPatterns = [tiktokUrlRegex, instagramUrlRegex, youtubeUrlRegex];

export interface DownloadableLink {
  quote?: string;
  quotePosition?: number;
  url: string;
}

interface InlineInterface {
  caption?: string;
  caption_entities?: MessageEntity[];
  entities?: MessageEntity[];
  text?: string;
}
export function linksFromMessage(message: InlineInterface) {
  return extractDownloadableUrls(
    message.text ?? message.caption,
    message.entities ?? message.caption_entities,
  );
}

function linkBase(url: string) {
  return (url.split('?')[0] ?? url).replace(/\/+$/u, '');
}

function sameLink(left: string, right: string) {
  return linkBase(left) === linkBase(right);
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
      !isSupportedMediaUrl(url)
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
