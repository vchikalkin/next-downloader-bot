import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadUrlToFile } from './http';
import type { StreamRef } from './types';

const DOWNLOAD_TIMEOUT_MS = 120_000;
const DOWNLOAD_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function describeFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (error.name === 'AbortError') {
    return 'download timed out';
  }

  if (error.cause instanceof Error) {
    return `${error.message} (${error.cause.message})`;
  }

  if (typeof error.cause === 'string') {
    return `${error.message} (${error.cause})`;
  }

  return error.message;
}

async function fetchToFile(url: string, filePath: string, headers: Record<string, string>): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt = attempt + 1) {
    try {
      await downloadUrlToFile(url, filePath, headers, DOWNLOAD_TIMEOUT_MS);

      return;
    } catch (error) {
      lastError = error;

      if (attempt === DOWNLOAD_ATTEMPTS) {
        break;
      }

      await sleep(500 * 2 ** (attempt - 1));
    }
  }

  throw new Error(describeFetchError(lastError));
}

export async function downloadToTempFile(stream: StreamRef, extension = 'mp4'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'extract-'));
  const filePath = join(dir, `media.${extension}`);

  try {
    await fetchToFile(stream.url, filePath, stream.headers);

    return filePath;
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}
