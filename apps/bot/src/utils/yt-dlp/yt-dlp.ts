import { spawn } from 'node:child_process';
import { env } from '@/config/env';

function getYtDlpPath(): string {
  return env.YTDLP_PATH || 'yt-dlp';
}

export function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const process = spawn(ytDlpPath, args);

    let output = '';
    let error = '';

    process.stdout.on('data', (data: Buffer) => {
      output = output + data.toString();
    });

    process.stderr.on('data', (data: Buffer) => {
      error = error + data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp error: ${error}`));
      }
    });
  });
}
