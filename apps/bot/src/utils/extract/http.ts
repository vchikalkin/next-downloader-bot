import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  Agent,
  type Dispatcher,
  fetch as undiciFetch,
  type RequestInfo,
  type RequestInit as UndiciRequestInit,
} from 'undici';

const agent = new Agent({
  bodyTimeout: 120_000,
  connectTimeout: 30_000,
  headersTimeout: 60_000,
  connect: {
    maxCachedSessions: 0,
  },
});

export async function mediaFetch(input: RequestInfo, init?: UndiciRequestInit): Promise<Response> {
  const response = await undiciFetch(input, { ...init, dispatcher: agent });

  return response as unknown as Response;
}

export async function downloadUrlToFile(
  url: string,
  filePath: string,
  headers: Record<string, string>,
  timeoutMs: number,
  dispatcher: Dispatcher = agent,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await undiciFetch(url, {
      dispatcher,
      headers,
      signal: controller.signal,
    });

    const fetchResponse = response as unknown as Response;

    if (!fetchResponse.ok) {
      throw new Error(`download failed: ${String(fetchResponse.status)}`);
    }

    if (!fetchResponse.body) {
      throw new Error('download failed: empty body');
    }

    await pipeline(Readable.fromWeb(fetchResponse.body as never), createWriteStream(filePath));
  } finally {
    clearTimeout(timer);
  }
}
