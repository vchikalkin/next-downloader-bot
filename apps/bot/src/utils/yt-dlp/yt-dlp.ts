import { env } from '@/config/env';
import { spawn } from 'node:child_process';

export function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const process = spawn(ytDlpPath, args);

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
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

function getYtDlpPath(): string {
  return env.YTDLP_PATH || 'yt-dlp';
}
