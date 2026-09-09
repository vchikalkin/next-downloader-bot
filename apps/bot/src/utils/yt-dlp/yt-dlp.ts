import { spawn } from 'node:child_process';
import { env } from '@/config/env';

const YTDLP_TIMEOUT_MS = 120_000;

function getYtDlpPath(): string {
  return env.YTDLP_PATH || 'yt-dlp';
}

export function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const child = spawn(ytDlpPath, ['--socket-timeout', '30', '--no-warnings', ...args]);

    let output = '';
    let error = '';
    let isSettled = false;

    const timer = setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      child.kill('SIGKILL');
      reject(new Error(`yt-dlp timed out after ${String(YTDLP_TIMEOUT_MS)}ms`));
    }, YTDLP_TIMEOUT_MS);

    child.stdout.on('data', (data: Buffer) => {
      output = output + data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      error = error + data.toString();
    });

    child.on('error', (spawnError) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timer);
      reject(spawnError);
    });

    child.on('close', (code) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      clearTimeout(timer);

      if (code === 0) {
        resolve(output.trim());

        return;
      }

      const exitCode = String(code);

      reject(new Error(error || `yt-dlp error: exit ${exitCode}`));
    });
  });
}
