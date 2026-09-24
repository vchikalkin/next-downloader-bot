import {
  asNumber,
  asString,
  asUrl,
  browserFingerprint,
  browserUserAgent,
  createNet,
  downloadToTempFile,
  instagramAppUserAgent,
  isRecord,
  navigationHeaders,
  type Net,
} from './extract';
import { logger } from './logger';
import { retry } from './retry';
import { assertMaxVideoDuration } from './video-duration';

const PREFERRED_WIDTH = 720;
const APP_ID = '936619743392459';
const INSTAGRAM_DOWNLOAD_RETRY_COUNT = 5;
const INSTAGRAM_DOWNLOAD_RETRY_DELAY_MS = 500;

type Json = Record<string, unknown>;

export interface InstagramDownloadResult {
  caption?: string;
  filePath?: string;
  images: string[];
}

function mobileHeaders(): Record<string, string> {
  return {
    'accept-language': 'en-US',
    'content-length': '0',
    'user-agent': instagramAppUserAgent(),
    'x-fb-client-ip': 'True',
    'x-fb-http-engine': 'Liger',
    'x-fb-server-cluster': 'True',
    'x-ig-app-locale': 'en_US',
    'x-ig-device-locale': 'en_US',
    'x-ig-mapped-locale': 'en_US',
  };
}

function embedHeaders(): Record<string, string> {
  const fingerprint = browserFingerprint();

  return {
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': fingerprint.acceptLanguage,
    'Cache-Control': 'max-age=0',
    Dnt: '1',
    Priority: 'u=0, i',
    'Sec-Ch-Ua': fingerprint.secChUa,
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': fingerprint.secChUaPlatform,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': fingerprint.userAgent,
  };
}

function shortcode(input: string): string {
  const path = asUrl(input).pathname.split('/').filter(Boolean);
  const index = path.findIndex((part) => ['p', 'reel', 'reels', 'tv'].includes(part));
  const code = index >= 0 ? path[index + 1] : path.at(-1);

  if (!code) {
    throw new Error('err-invalid-instagram-response');
  }

  return code;
}

function selectVersion(value: unknown, preferredWidth: number): string | null {
  const versions = Array.isArray(value) ? value.filter(isRecord) : [];
  let best: Json | null = null;

  for (const candidate of versions) {
    const width = asNumber(candidate.width);

    if (width === null) {
      continue;
    }

    const currentWidth = best ? asNumber(best.width) : null;

    if (currentWidth === null || Math.abs(width - preferredWidth) < Math.abs(currentWidth - preferredWidth)) {
      best = candidate;
    }
  }

  const selected = best ?? versions[0] ?? null;

  return selected ? asString(selected.url) : null;
}

function selectImage(media: Json): string | null {
  const imageVersions =
    isRecord(media.image_versions2) && Array.isArray(media.image_versions2.candidates)
      ? media.image_versions2.candidates.filter(isRecord)
      : [];
  const first = imageVersions[0] ? asString(imageVersions[0].url) : null;

  return first ?? asString(media.display_url);
}

function mediaCaption(media: Json): string | undefined {
  if (isRecord(media.caption)) {
    return asString(media.caption.text) ?? undefined;
  }

  const direct = asString(media.caption);

  if (direct) {
    return direct;
  }

  const edges =
    isRecord(media.edge_media_to_caption) && Array.isArray(media.edge_media_to_caption.edges)
      ? media.edge_media_to_caption.edges
      : [];
  const node = isRecord(edges[0]) && isRecord(edges[0].node) ? edges[0].node : null;

  return node ? (asString(node.text) ?? undefined) : undefined;
}

function mediaVideoDuration(media: Json): number | null {
  const duration = asNumber(media.video_duration);

  if (duration !== null) {
    return duration;
  }

  const video = isRecord(media.video) ? media.video : null;

  return video ? asNumber(video.duration) : null;
}

function collectMediaUrls(media: Json): { images: string[]; videoDuration: number | null; videoUrl: string | null } {
  const sidecar =
    isRecord(media.edge_sidecar_to_children) && Array.isArray(media.edge_sidecar_to_children.edges)
      ? media.edge_sidecar_to_children.edges
      : [];

  if (sidecar.length > 0) {
    const images: string[] = [];
    let videoDuration: number | null = null;
    let videoUrl: string | null = null;

    for (const edge of sidecar) {
      const node = isRecord(edge) && isRecord(edge.node) ? edge.node : null;

      if (!node) {
        continue;
      }

      const itemVideo = selectVersion(node.video_versions, PREFERRED_WIDTH) ?? asString(node.video_url);

      if (itemVideo && !videoUrl) {
        videoDuration = mediaVideoDuration(node);
        videoUrl = itemVideo;
      } else {
        const itemImage = selectImage(node);

        if (itemImage) {
          images.push(itemImage);
        }
      }
    }

    return { images, videoDuration, videoUrl };
  }

  const carousel = Array.isArray(media.carousel_media) ? media.carousel_media.filter(isRecord) : [];

  if (carousel.length > 0) {
    const images: string[] = [];
    let videoDuration: number | null = null;
    let videoUrl: string | null = null;

    for (const item of carousel) {
      const itemVideo = selectVersion(item.video_versions, PREFERRED_WIDTH) ?? asString(item.video_url);

      if (itemVideo && !videoUrl) {
        videoDuration = mediaVideoDuration(item);
        videoUrl = itemVideo;
      } else {
        const itemImage = selectImage(item);

        if (itemImage) {
          images.push(itemImage);
        }
      }
    }

    return { images, videoDuration, videoUrl };
  }

  const video = selectVersion(media.video_versions, PREFERRED_WIDTH) ?? asString(media.video_url);

  if (video) {
    return { images: [], videoDuration: mediaVideoDuration(media), videoUrl: video };
  }

  const image = selectImage(media);

  return { images: image ? [image] : [], videoDuration: null, videoUrl: null };
}

function hasUsableMedia(media: Json, isVideoRequired: boolean): boolean {
  const { images, videoUrl } = collectMediaUrls(media);

  if (isVideoRequired) {
    return Boolean(videoUrl);
  }

  return Boolean(videoUrl) || images.length > 0;
}

function searchMedia(node: unknown, code: string): Json | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const media = searchMedia(child, code);

      if (media) {
        return media;
      }
    }

    return null;
  }

  if (!isRecord(node)) {
    return null;
  }

  const hasMedia =
    Array.isArray(node.video_versions) ||
    Array.isArray(node.carousel_media) ||
    (isRecord(node.image_versions2) && Array.isArray(node.image_versions2.candidates));

  if (hasMedia && node.code === code) {
    return node;
  }

  for (const key of Object.keys(node)) {
    const media = searchMedia(node[key], code);

    if (media) {
      return media;
    }
  }

  return null;
}

function inlineMedia(html: string, code: string): Json | null {
  for (const match of html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(match[1] ?? '');
    } catch {
      continue;
    }

    const media = searchMedia(parsed, code);

    if (media) {
      return media;
    }
  }

  return null;
}

async function pageMedia(net: Net, code: string, isVideoRequired: boolean): Promise<Json | null> {
  const response = await net(`https://www.instagram.com/p/${code}/`, { headers: navigationHeaders() });

  if (!response.ok) {
    return null;
  }

  const media = inlineMedia(await response.text(), code);

  return media && hasUsableMedia(media, isVideoRequired) ? media : null;
}

async function mediaId(net: Net, code: string): Promise<string | null> {
  const url = new URL('https://i.instagram.com/api/v1/oembed/');

  url.searchParams.set('url', `https://www.instagram.com/p/${code}/`);
  const response = await net(url.href, { headers: mobileHeaders() }, 1);

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);

  return isRecord(payload) ? asString(payload.media_id) : null;
}

async function mobileInfo(net: Net, id: string): Promise<Json | null> {
  const response = await net(`https://i.instagram.com/api/v1/media/${id}/info/`, { headers: mobileHeaders() }, 1);

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);
  const items = isRecord(payload) && Array.isArray(payload.items) ? payload.items : [];
  const first = items[0];

  return isRecord(first) ? first : null;
}

async function mobileMedia(net: Net, code: string, isVideoRequired: boolean): Promise<Json | null> {
  const id = await mediaId(net, code);

  if (!id) {
    return null;
  }

  const media = await mobileInfo(net, id);

  return media && hasUsableMedia(media, isVideoRequired) ? media : null;
}

function gqlShortcodeMedia(data: Json): Json | null {
  const webInfo = isRecord(data.xdt_api__v1__media__shortcode__web_info)
    ? data.xdt_api__v1__media__shortcode__web_info
    : null;
  const webItems = webInfo && Array.isArray(webInfo.items) ? webInfo.items : [];
  const webMedia = webItems[0];

  if (isRecord(webMedia)) {
    return webMedia;
  }

  const gqlData = isRecord(data.gql_data) ? data.gql_data : null;
  const media =
    (gqlData && (gqlData.shortcode_media ?? gqlData.xdt_shortcode_media)) ??
    data.shortcode_media ??
    data.xdt_shortcode_media;

  return isRecord(media) ? media : null;
}

async function embedMedia(net: Net, code: string, isVideoRequired: boolean): Promise<Json | null> {
  const response = await net(`https://www.instagram.com/p/${code}/embed/captioned/`, {
    headers: embedHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const init = html.match(/"init",\[\],\[(.*?)\]\],/su)?.[1];

  if (!init) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(init);
  } catch {
    return null;
  }

  const contextJson = isRecord(parsed) ? asString(parsed.contextJSON) : null;

  if (!contextJson) {
    return null;
  }

  let context: unknown;

  try {
    context = JSON.parse(contextJson);
  } catch {
    return null;
  }

  if (!isRecord(context)) {
    return null;
  }

  const embedded =
    isRecord(context.context) && isRecord(context.context.media) ? context.context.media : null;
  const media = embedded ?? gqlShortcodeMedia(context);

  return media && hasUsableMedia(media, isVideoRequired) ? media : null;
}

function entryObject(name: string, html: string): Json | null {
  const raw = html.match(new RegExp(`\\\\["${name}",.*?,({.*?}),\\\\d+\\\\]`, 'u'))?.[1];

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function queryNumber(name: string, html: string): number | null {
  const raw = html.match(new RegExp(`${name}=(\\d+)`, 'u'))?.[1];
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function randomToken(length = 8): string {
  return crypto
    .getRandomValues(new Uint8Array(length))
    .reduce((value, byte) => value + (byte % 36).toString(36), '');
}

function instagramCookies(headers: Headers, fallback: Record<string, string | null>): string {
  const getter = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const raw =
    typeof getter === 'function' ? getter.call(headers) : (headers.get('set-cookie')?.split(/,(?=[^;]+?=)/u) ?? []);
  const cookies = new Map<string, string>();

  for (const value of raw) {
    const pair = value.split(';', 1)[0]?.trim();
    const separator = pair?.indexOf('=') ?? -1;

    if (pair && separator > 0) {
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }

  for (const [name, value] of Object.entries(fallback)) {
    if (value && !cookies.has(name)) {
      cookies.set(name, value);
    }
  }

  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function graphqlParams(
  net: Net,
  code: string,
): Promise<{ body: Record<string, string>; headers: Record<string, string> } | null> {
  const response = await net(`https://www.instagram.com/p/${code}/`, {
    headers: embedHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const site = entryObject('SiteData', html);
  const polaris = entryObject('PolarisSiteData', html);
  const web = entryObject('DGWWebConfig', html);
  const push = entryObject('InstagramWebPushInfo', html);
  const lsd = entryObject('LSD', html)?.token ?? randomToken();
  const csrf = entryObject('InstagramSecurityConfig', html)?.csrf_token;
  const cookie = instagramCookies(response.headers, {
    csrftoken: asString(csrf),
    dpr: '2',
    ig_did: asString(polaris?.device_id),
    ig_nrcb: '1',
    mid: asString(polaris?.machine_id),
    wd: '1280x720',
  });

  return {
    body: {
      __a: '1',
      __ccg: 'EXCELLENT',
      __comet_req: String(queryNumber('__comet_req', html) ?? 7),
      __csr: randomToken(154),
      __d: 'www',
      __dyn: randomToken(154),
      __hs: asString(site?.haste_session) ?? '20126.HYP:instagram_web_pkg.2.1...0',
      __hsi: asString(site?.hsi) ?? '7436540909012459023',
      __req: 'b',
      __rev: asString(push?.rollout_hash) ?? '1019933358',
      __s: `::${Math.random().toString(36).replaceAll(/\d/gu, '').slice(2, 8)}`,
      __spin_b: asString(site?.__spin_b) ?? 'trunk',
      __spin_r: asString(site?.__spin_r) ?? '1019933358',
      __spin_t: String(asNumber(site?.__spin_t) ?? Math.floor(Date.now() / 1000)),
      __user: '0',
      av: '0',
      dpr: '2',
      jazoest: String(queryNumber('jazoest', html) ?? Math.floor(Math.random() * 10_000)),
      lsd: asString(lsd) ?? randomToken(),
    },
    headers: {
      'X-CSRFToken': asString(csrf) ?? '',
      'X-FB-LSD': asString(lsd) ?? randomToken(),
      'X-Bloks-Version-Id': asString(entryObject('WebBloksVersioningID', html)?.versioningID) ?? '',
      cookie,
      'x-asbd-id': '129477',
      'x-ig-app-id': asString(web?.appId) ?? APP_ID,
    },
  };
}

async function graphqlMedia(net: Net, code: string, isVideoRequired: boolean): Promise<Json | null> {
  const params = await graphqlParams(net, code);

  if (!params) {
    return null;
  }

  const body = new URLSearchParams({
    ...params.body,
    av: '0',
    doc_id: '8845758582119845',
    fb_api_caller_class: 'RelayModern',
    fb_api_req_friendly_name: 'PolarisPostActionLoadPostQueryQuery',
    server_timestamps: 'true',
    variables: JSON.stringify({
      fetch_tagged_user_count: null,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
      shortcode: code,
    }),
  });

  const response = await net('https://www.instagram.com/graphql/query', {
    body,
    headers: {
      ...embedHeaders(),
      ...params.headers,
      'X-FB-Friendly-Name': 'PolarisPostActionLoadPostQueryQuery',
      'X-Requested-With': 'XMLHttpRequest',
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });

  if (!response.ok) {
    return null;
  }

  const payload: unknown = await response.json().catch(() => null);
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  const media = data ? gqlShortcodeMedia(data) : null;

  return media && hasUsableMedia(media, isVideoRequired) ? media : null;
}

async function resolveInstagramMedia(url: string): Promise<Json> {
  const code = shortcode(url);
  const isVideoRequired = /\/(?:reel|reels|tv)\//u.test(asUrl(url).pathname);
  const net = createNet();
  const resolvers: (() => Promise<Json | null>)[] = [
    () => { return pageMedia(net, code, isVideoRequired) },
    () => { return mobileMedia(net, code, isVideoRequired) },
    () => { return embedMedia(net, code, isVideoRequired) },
    () => { return graphqlMedia(net, code, isVideoRequired) },
  ];

  for (const resolve of resolvers) {
    const candidate = await resolve();

    if (candidate) {
      return candidate;
    }
  }

  throw new Error('err-invalid-instagram-response');
}

export async function getInstagramDownloadUrl(url: string): Promise<InstagramDownloadResult> {
  const media = await retry(() => resolveInstagramMedia(url), {
    delayMs: INSTAGRAM_DOWNLOAD_RETRY_DELAY_MS,
    factor: 2,
    onRetry: (error, attempt) => {
      const message = error instanceof Error ? error.message : String(error);

      logger.warn(
        { attempt, error: message, url },
        `Instagram download attempt ${String(attempt)}/${String(INSTAGRAM_DOWNLOAD_RETRY_COUNT)} failed, retrying...`,
      );
    },
    retries: INSTAGRAM_DOWNLOAD_RETRY_COUNT,
  });

  const { images, videoDuration, videoUrl } = collectMediaUrls(media);
  const caption = mediaCaption(media);

  if (videoUrl) {
    assertMaxVideoDuration(videoDuration);

    const filePath = await downloadToTempFile({
      headers: { 'user-agent': browserUserAgent() },
      url: videoUrl,
    });

    return { caption, filePath, images: [] };
  }

  if (images.length === 0) {
    throw new Error('err-invalid-instagram-response');
  }

  return { caption, images };
}
