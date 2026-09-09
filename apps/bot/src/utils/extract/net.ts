import { mediaFetch } from './http';

export type Net = (url: string, init?: RequestInit, attempts?: number) => Promise<Response>;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }

    const time = Date.parse(retryAfter);

    if (!Number.isNaN(time) && time > Date.now()) {
      return time - Date.now();
    }
  }

  return Math.min(500 * 2 ** (attempt - 1), 10_000);
}

export function createNet(baseFetch: FetchLike = mediaFetch as FetchLike, timeoutMs = 30_000): Net {
  return async function net(url, init = {}, attempts = 3): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt = attempt + 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const response = await baseFetch(url, { ...init, signal: controller.signal });

        if (!retryable(response.status) || attempt === attempts) {
          return response;
        }

        await sleep(retryDelay(response, attempt));
      } catch (error) {
        lastError = error;

        if (attempt === attempts) {
          break;
        }

        await sleep(500 * 2 ** (attempt - 1));
      } finally {
        clearTimeout(timeout);
      }
    }

    if (lastError instanceof Error) {
      if (lastError.name === 'AbortError') {
        throw new Error('request timed out');
      }

      if (lastError.cause instanceof Error) {
        throw new Error(`${lastError.message} (${lastError.cause.message})`);
      }

      if (typeof lastError.cause === 'string') {
        throw new TypeError(`${lastError.message} (${lastError.cause})`);
      }

      throw new Error(lastError.message);
    }

    throw new Error('request failed');
  };
}

export function cookieHeaderFromResponse(headers: Headers): string | null {
  const readable = headers as Headers & { getSetCookie?: () => string[] };
  const raw =
    typeof readable.getSetCookie === 'function'
      ? readable.getSetCookie()
      : headers.get('set-cookie')?.split(/,(?=[^;]+?=)/u) ?? [];

  const cookies = raw
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean);

  return cookies.length > 0 ? cookies.join('; ') : null;
}

export function asUrl(input: string): URL {
  try {
    return new URL(input);
  } catch {
    throw new Error('invalid url');
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
