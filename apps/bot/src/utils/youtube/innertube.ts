import {
  asNumber,
  asString,
  asUrl,
  browserUserAgent,
  cookieHeaderFromResponse,
  createNet,
  downloadAndMergeToTempFile,
  downloadToTempFile,
  isRecord,
  type Net,
} from '../extract';

type Json = Record<string, unknown>;

interface YoutubeSession {
  cookie: string;
  signatureTimestamp: number;
  visitorData: string;
}

const PREFERRED_WIDTH = 720;
const BROWSER_COOKIE = 'PREF=hl=en&tz=UTC; SOCS=CAI';

const androidVrClient = {
  name: 'ANDROID_VR',
  number: '28',
  userAgent:
    'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
  version: '1.65.10',
};

export interface YoutubeInnertubeResult {
  durationSeconds: number;
  filePath: string;
  title?: string;
}

export function youtubeVideoId(input: string): string | null {
  const url = asUrl(input);

  if (url.hostname === 'youtu.be') {
    return cleanId(url.pathname.split('/').find((part) => part.length > 0));
  }

  const fromQuery = cleanId(url.searchParams.get('v'));

  if (fromQuery) {
    return fromQuery;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.findIndex((part) => ['shorts', 'live', 'embed'].includes(part));

  return index >= 0 ? cleanId(parts[index + 1]) : null;
}

function cleanId(value: string | null | undefined): string | null {
  return typeof value === 'string' && /^[\w-]{11}$/u.test(value) ? value : null;
}

async function signatureTimestamp(net: Net, playerPath: string): Promise<number> {
  const response = await net(new URL(playerPath, 'https://www.youtube.com').toString(), {
    headers: { 'user-agent': browserUserAgent() },
  });

  if (!response.ok) {
    throw new Error(`YouTube player failed: ${String(response.status)}`);
  }

  const player = await response.text();
  const timestamp = asNumber(
    Number(player.match(/signatureTimestamp[:=](\d+)/u)?.[1] ?? player.match(/sts[:=](\d+)/u)?.[1]),
  );

  if (!timestamp) {
    throw new Error('YouTube signature timestamp not found');
  }

  return timestamp;
}

async function youtubeSession(net: Net, id: string): Promise<YoutubeSession> {
  const response = await net(`https://www.youtube.com/watch?v=${id}&bpctr=9999999999&has_verified=1`, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-us,en;q=0.5',
      cookie: BROWSER_COOKIE,
      'sec-fetch-mode': 'navigate',
      'user-agent': browserUserAgent(),
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube page failed: ${String(response.status)}`);
  }

  const page = await response.text();
  const visitorData = asString(page.match(/"visitorData":"([^"]+)"/u)?.[1]);

  if (!visitorData) {
    throw new Error('YouTube visitor data not found');
  }

  const playerPath =
    asString(page.match(/"jsUrl":"([^"]+)"/u)?.[1]) ?? asString(page.match(/"PLAYER_JS_URL":"([^"]+)"/u)?.[1]);

  if (!playerPath) {
    throw new Error('YouTube player url not found');
  }

  return {
    cookie: cookieHeaderFromResponse(response.headers) ?? '',
    signatureTimestamp: await signatureTimestamp(net, playerPath),
    visitorData,
  };
}

function playerBody(id: string, session: YoutubeSession): Json {
  return {
    contentCheckOk: true,
    context: {
      client: {
        androidSdkVersion: 32,
        clientName: androidVrClient.name,
        clientVersion: androidVrClient.version,
        deviceMake: 'Oculus',
        deviceModel: 'Quest 3',
        gl: 'US',
        hl: 'en',
        osName: 'Android',
        osVersion: '12L',
        timeZone: 'UTC',
        userAgent: androidVrClient.userAgent,
        utcOffsetMinutes: 0,
        visitorData: session.visitorData,
      },
    },
    playbackContext: {
      contentPlaybackContext: {
        html5Preference: 'HTML5_PREF_WANTS',
        signatureTimestamp: session.signatureTimestamp,
      },
    },
    racyCheckOk: true,
    videoId: id,
  };
}

function playerHeaders(session: YoutubeSession): HeadersInit {
  return {
    'content-type': 'application/json',
    cookie: session.cookie ? `${BROWSER_COOKIE}; ${session.cookie}` : BROWSER_COOKIE,
    origin: 'https://www.youtube.com',
    'user-agent': androidVrClient.userAgent,
    'x-goog-visitor-id': session.visitorData,
    'x-youtube-client-name': androidVrClient.number,
    'x-youtube-client-version': androidVrClient.version,
  };
}

async function youtubePlayer(net: Net, body: Json, headers: HeadersInit): Promise<Json> {
  const response = await net('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    body: JSON.stringify(body),
    headers,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`YouTube player failed: ${String(response.status)}`);
  }

  const payload: unknown = await response.json();

  if (!isRecord(payload)) {
    throw new Error('YouTube video unavailable');
  }

  const status = isRecord(payload.playabilityStatus) ? asString(payload.playabilityStatus.status) : null;

  if (status !== 'OK') {
    const reason = isRecord(payload.playabilityStatus) ? asString(payload.playabilityStatus.reason) : null;

    throw new Error(reason ?? 'YouTube video unavailable');
  }

  return payload;
}

function adaptiveFormats(payload: Json): Json[] {
  const streaming = isRecord(payload.streamingData) ? payload.streamingData : null;

  return streaming && Array.isArray(streaming.adaptiveFormats)
    ? streaming.adaptiveFormats.filter(isRecord)
    : [];
}

function bestVideo(formats: Json[], preferredWidth: number): string | null {
  const candidates = formats.filter((format) => {
    const mimeType = asString(format.mimeType);

    return Boolean(asString(format.url)) && mimeType?.startsWith('video/mp4') === true && mimeType.includes('avc1');
  });

  let best: Json | null = null;

  for (const format of candidates) {
    if (!best) {
      best = format;
      continue;
    }

    const width = asNumber(format.width) ?? 0;
    const currentWidth = asNumber(best.width) ?? 0;

    if (Math.abs(width - preferredWidth) < Math.abs(currentWidth - preferredWidth)) {
      best = format;
    }
  }

  return best ? asString(best.url) : null;
}

function bestAudio(formats: Json[]): string | null {
  const candidates = formats.filter(
    (format) => { return Boolean(asString(format.url)) && asString(format.mimeType)?.startsWith('audio/mp4') === true },
  );

  let best: Json | null = null;

  for (const format of candidates) {
    if (!best) {
      best = format;
      continue;
    }

    if ((asNumber(format.bitrate) ?? 0) > (asNumber(best.bitrate) ?? 0)) {
      best = format;
    }
  }

  return best ? asString(best.url) : null;
}

function height(format: Json): number {
  return asNumber(format.height) ?? Number(asString(format.qualityLabel)?.match(/(\d+)p/u)?.[1] ?? 0);
}

function selectProgressive(payload: Json): string | null {
  const streaming = isRecord(payload.streamingData) ? payload.streamingData : null;
  const formats = streaming && Array.isArray(streaming.formats) ? streaming.formats.filter(isRecord) : [];
  const mp4 = formats.filter((format) => {
    return asString(format.url) && asString(format.mimeType)?.startsWith('video/mp4');
  });

  let best: Json | null = null;

  for (const format of mp4) {
    if (!best || height(format) > height(best)) {
      best = format;
    }
  }

  return best ? asString(best.url) : null;
}

function selectStreams(
  payload: Json,
  preferredWidth: number,
): { audio: string | null; video: string } | null {
  const adaptive = adaptiveFormats(payload);
  const video = bestVideo(adaptive, preferredWidth);
  const audio = bestAudio(adaptive);

  if (video && audio) {
    return { audio, video };
  }

  const progressive = selectProgressive(payload);

  return progressive ? { audio: null, video: progressive } : null;
}

async function probeStream(net: Net, url: string, headers: Record<string, string>): Promise<void> {
  const response = await net(url, { headers }, 1);

  await response.body?.cancel();

  if (!response.ok) {
    throw new Error(`YouTube stream failed: ${String(response.status)}`);
  }
}

export async function downloadYoutubeInnertube(url: string): Promise<YoutubeInnertubeResult> {
  const id = youtubeVideoId(url);

  if (!id) {
    throw new Error('err-invalid-youtube-response');
  }

  const net = createNet();
  const session = await youtubeSession(net, id);
  const payload = await youtubePlayer(net, playerBody(id, session), playerHeaders(session));
  const streams = selectStreams(payload, PREFERRED_WIDTH);

  if (!streams) {
    throw new Error('YouTube mp4 stream not found');
  }

  const headers = { 'user-agent': androidVrClient.userAgent };

  await Promise.all(
    [streams.video, streams.audio]
      .filter((streamUrl): streamUrl is string => streamUrl !== null)
      .map((streamUrl) => probeStream(net, streamUrl, headers)),
  );

  const details = isRecord(payload.videoDetails) ? payload.videoDetails : null;
  const title = details ? (asString(details.title) ?? undefined) : undefined;
  const durationSeconds = details ? (asNumber(Number(details.lengthSeconds)) ?? 0) : 0;

  const filePath = streams.audio
    ? await downloadAndMergeToTempFile(
        { headers, url: streams.video },
        { headers, url: streams.audio },
      )
    : await downloadToTempFile({ headers, url: streams.video });

  return { durationSeconds, filePath, title };
}
