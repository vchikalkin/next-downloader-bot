import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  Agent,
  type Dispatcher,
  fetch as undiciFetch,
  type RequestInfo,
  type RequestInit as UndiciRequestInit,
} from 'undici';
import { MAX_DOWNLOAD_BYTES } from '@/constants/limits';

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

function sizeLimitError(): Error {
  return new Error(`download failed: exceeds ${String(MAX_DOWNLOAD_BYTES)} bytes`);
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

    const contentLength = Number(fetchResponse.headers.get('content-length'));

    if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
      throw sizeLimitError();
    }

    let bytes = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, encoding, callback) {
        bytes = bytes + chunk.length;

        if (bytes > MAX_DOWNLOAD_BYTES) {
          callback(sizeLimitError());

          return;
        }

        callback(null, chunk);
      },
    });

    await pipeline(
      Readable.fromWeb(fetchResponse.body as never),
      limiter,
      createWriteStream(filePath),
    );
  } finally {
    clearTimeout(timer);
  }
}
