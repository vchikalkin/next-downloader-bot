import {
  asNumber,
  asString,
  asUrl,
  browserUserAgent,
  cookieHeaderFromResponse,
  createNet,
  downloadToTempFile,
  firefoxNavigationHeaders,
  isRecord,
  navigationHeaders,
  type Net,
} from './extract';
import { assertMaxVideoDuration } from './video-duration';

const MARKER = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">';
const PAGE_ATTEMPT_COUNT = 12;

type Json = Record<string, unknown>;

export interface TiktokDownloadResult {
  caption?: string;
  filePath?: string;
  images: string[];
}

function isShortlinkHost(hostname: string): boolean {
  return hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com';
}

function videoId(input: string): string | null {
  const match = asUrl(input).pathname.match(/\/(?:video|photo)\/(\d+)/u);

  return match?.[1] ?? null;
}

function username(input: string): string | null {
  return asUrl(input).pathname.match(/@([^/]+)/u)?.[1] ?? null;
}

async function followShortlink(net: Net, userAgent: string, input: string): Promise<string> {
  const url = asUrl(input);

  if (!isShortlinkHost(url.hostname)) {
    return input;
  }

  // Cobalt-style: truncated UA avoids HTML interstitial on vt/vm redirects
  const shortlinkUa = userAgent.split(' Chrome/')[0] ?? userAgent;
  const response = await net(input, { headers: { 'user-agent': shortlinkUa }, redirect: 'manual' }, 1);
  const location = response.headers.get('location');

  if (location) {
    return new URL(location, input).href;
  }

  const html = await response.text();

  if (html.startsWith('<a href="https://')) {
    const extracted = html.split('<a href="')[1]?.split('?')[0];

    if (extracted) {
      return extracted;
    }
  }

  const href = html.match(/href=["']([^"']+)["']/iu)?.[1];

  if (href) {
    return new URL(href, input).href;
  }

  throw new Error('err-invalid-tiktok-response');
}

function itemStruct(html: string): Json {
  if (html.includes('Please wait') || html.includes('_wafchallenge')) {
    throw new Error('TikTok WAF challenge');
  }

  const start = html.indexOf(MARKER);
  const end = html.indexOf('</script>', start + MARKER.length);

  if (start === -1 || end === -1) {
    throw new Error('TikTok hydration not found');
  }

  const parsed: unknown = JSON.parse(html.slice(start + MARKER.length, end));
  const scope = isRecord(parsed) && isRecord(parsed.__DEFAULT_SCOPE__) ? parsed.__DEFAULT_SCOPE__ : null;
  const detail = scope && isRecord(scope['webapp.video-detail']) ? scope['webapp.video-detail'] : null;

  if (!detail) {
    throw new Error('TikTok itemStruct not found');
  }

  if (asString(detail.statusMsg)) {
    throw new Error('err-invalid-tiktok-response');
  }

  const info = isRecord(detail.itemInfo) ? detail.itemInfo : null;
  const item = info && isRecord(info.itemStruct) ? info.itemStruct : null;

  if (!item) {
    throw new Error('TikTok itemStruct not found');
  }

  if (item.isContentClassified === true) {
    throw new Error('err-invalid-tiktok-response');
  }

  return item;
}

function firstString(value: unknown): string | null {
  return Array.isArray(value)
    ? (value.map(asString).find((candidate): candidate is string => candidate !== null) ?? null)
    : asString(value);
}

function downloadUrl(item: Json): string | null {
  const video = isRecord(item.video) ? item.video : null;

  return video ? (asString(video.playAddr) ?? asString(video.downloadAddr)) : null;
}

function videoDurationSeconds(item: Json): number | null {
  const video = isRecord(item.video) ? item.video : null;

  return video ? asNumber(video.duration) : null;
}

function embedDurationSeconds(value: unknown): number | undefined {
  const duration = asNumber(value);

  if (duration === null) {
    return undefined;
  }

  // Embed videoMeta.duration is milliseconds when the value is large.
  return duration >= 1000 ? duration / 1000 : duration;
}

function imageUrls(item: Json): string[] {
  const imagePost = isRecord(item.imagePost) ? item.imagePost : null;
  const images = imagePost && Array.isArray(imagePost.images) ? imagePost.images.filter(isRecord) : [];

  return images.flatMap((image) => {
    const imageUrl = isRecord(image.imageURL) ? image.imageURL : null;
    const list = imageUrl && Array.isArray(imageUrl.urlList) ? imageUrl.urlList : [];
    const url = list.map(asString).find(Boolean) ?? null;

    return url ? [url] : [];
  });
}

function author(item: Json): string | null {
  const user = isRecord(item.author) ? item.author : null;

  return user ? asString(user.uniqueId) : null;
}

function recoverablePageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';

  return message === 'TikTok WAF challenge' || message === 'TikTok hydration not found';
}

async function fetchVideoPage(
  net: Net,
  id: string,
  headers: Record<string, string>,
): Promise<{ cookie: string | null; item: Json }> {
  const page = await net(`https://www.tiktok.com/@i/video/${id}`, { headers });

  return { cookie: cookieHeaderFromResponse(page.headers), item: itemStruct(await page.text()) };
}

async function fetchEmbedPage(
  net: Net,
  id: string,
  headers: Record<string, string>,
): Promise<{ cookie: string | null; item: Json }> {
  const page = await net(`https://www.tiktok.com/embed/v2/${id}`, { headers });
  const html = await page.text();
  const raw = html.match(/<script[^>]*id=["']__FRONTITY_CONNECT_STATE__["'][^>]*>([\s\S]*?)<\/script>/iu)?.[1];

  if (!raw) {
    throw new Error('TikTok embed state not found');
  }

  const parsed: unknown = JSON.parse(raw);
  const source = isRecord(parsed) && isRecord(parsed.source) ? parsed.source : null;
  const data = source && isRecord(source.data) ? source.data : null;
  const rawRoute = data ? data[`/embed/v2/${id}`] : null;
  const route = isRecord(rawRoute) ? rawRoute : null;
  const videoData = route && isRecord(route.videoData) ? route.videoData : null;
  const item = videoData && isRecord(videoData.itemInfos) ? videoData.itemInfos : null;

  if (!videoData || !item) {
    throw new Error('TikTok embed item not found');
  }

  const authorInfo = isRecord(videoData.authorInfos) ? videoData.authorInfos : {};
  const musicInfo = isRecord(videoData.musicInfos) ? videoData.musicInfos : {};
  const video = isRecord(item.video) ? item.video : {};
  const videoMeta = isRecord(video.videoMeta) ? video.videoMeta : {};
  const imagePost = isRecord(videoData.imagePostInfo) ? videoData.imagePostInfo : null;
  const displayImages =
    imagePost && Array.isArray(imagePost.displayImages) ? imagePost.displayImages.filter(isRecord) : [];

  if (displayImages.length === 0 && !asString(video.playAddr)) {
    throw new Error('TikTok video hydration not found');
  }

  return {
    cookie: cookieHeaderFromResponse(page.headers),
    item: {
      ...item,
      author: {
        nickname: asString(authorInfo.nickName),
        uniqueId: asString(authorInfo.uniqueId),
      },
      desc: asString(item.text),
      imagePost: {
        images: displayImages.map((image) => { return {
          imageURL: {
            urlList: Array.isArray(image.urlList)
              ? image.urlList.map(asString).filter(Boolean)
              : [],
          },
        } }),
      },
      music: {
        authorName: asString(musicInfo.authorName),
        playUrl: firstString(musicInfo.playUrl),
        title: asString(musicInfo.musicName),
      },
      video: {
        duration: embedDurationSeconds(videoMeta.duration),
        downloadAddr: asString(video.downloadAddr),
        playAddr: asString(video.playAddr),
      },
    },
  };
}

async function videoPage(
  net: Net,
  id: string,
  isPhoto: boolean,
): Promise<{ cookie: string | null; item: Json; userAgent: string }> {
  for (let attempt = 0; attempt < PAGE_ATTEMPT_COUNT; attempt = attempt + 1) {
    const attemptHeaders = attempt % 2 === 0 ? navigationHeaders() : firefoxNavigationHeaders();
    const attemptUserAgent = attemptHeaders['user-agent'];
    const requestHeaders = {
      ...attemptHeaders,
      referer: 'https://www.tiktok.com/',
      'sec-fetch-site': 'same-origin',
    };

    try {
      return { ...(await fetchVideoPage(net, id, requestHeaders)), userAgent: attemptUserAgent };
    } catch (error) {
      if (!recoverablePageError(error)) {
        throw error;
      }
    }
  }

  if (!isPhoto) {
    throw new Error('err-invalid-tiktok-response');
  }

  const fallbackHeaders = navigationHeaders();
  const fallbackUserAgent = fallbackHeaders['user-agent'];
  const embedHeaders = {
    ...fallbackHeaders,
    referer: 'https://www.tiktok.com/',
    'sec-fetch-site': 'same-origin',
  };

  return { ...(await fetchEmbedPage(net, id, embedHeaders)), userAgent: fallbackUserAgent };
}

export async function getTiktokDownloadUrl(url: string): Promise<TiktokDownloadResult> {
  const net = createNet();
  const pageUrl = await followShortlink(net, browserUserAgent(), url);
  const id = videoId(pageUrl);

  if (!id) {
    throw new Error('err-invalid-tiktok-response');
  }

  const page = await videoPage(net, id, asUrl(pageUrl).pathname.includes('/photo/'));
  const user = author(page.item) ?? username(pageUrl) ?? 'i';
  const headers: Record<string, string> = {
    referer: `https://www.tiktok.com/@${encodeURIComponent(user)}/video/${encodeURIComponent(id)}`,
    'user-agent': page.userAgent,
  };

  if (page.cookie) {
    headers.cookie = page.cookie;
  }

  const images = imageUrls(page.item);
  const caption = asString(page.item.desc) ?? undefined;
  const mediaUrl = downloadUrl(page.item);

  if (mediaUrl) {
    assertMaxVideoDuration(videoDurationSeconds(page.item));

    const filePath = await downloadToTempFile({ headers, url: mediaUrl });

    return { caption, filePath, images: [] };
  }

  if (images.length === 0) {
    throw new Error('err-invalid-tiktok-response');
  }

  return { caption, images };
}
