import { spawn } from 'node:child_process';
import { mkdtemp, rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNet } from './net';
import type { StreamRef } from './types';

async function fetchBytes(url: string, headers: Record<string, string>): Promise<Uint8Array> {
  const net = createNet();
  const response = await net(url, { headers });

  if (!response.ok) {
    throw new Error(`download failed: ${String(response.status)}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffmpeg', args);
    let stderr = '';

    process.stderr.on('data', (chunk: Buffer) => {
      stderr = stderr + chunk.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg error: ${stderr}`));
      }
    });
  });
}

export async function downloadToTempFile(
  stream: StreamRef,
  extension = 'mp4',
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'extract-'));
  const filePath = join(dir, `media.${extension}`);

  try {
    const bytes = await fetchBytes(stream.url, stream.headers);

    await writeFile(filePath, bytes);

    return filePath;
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}

export async function downloadAndMergeToTempFile(
  video: StreamRef,
  audio: StreamRef,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'extract-'));
  const videoPath = join(dir, 'video.mp4');
  const audioPath = join(dir, 'audio.m4a');
  const outputPath = join(dir, 'merged.mp4');

  try {
    const [videoBytes, audioBytes] = await Promise.all([
      fetchBytes(video.url, video.headers),
      fetchBytes(audio.url, audio.headers),
    ]);

    await Promise.all([writeFile(videoPath, videoBytes), writeFile(audioPath, audioBytes)]);

    await runFfmpeg([
      '-y',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    return outputPath;
  } catch (error) {
    await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}
