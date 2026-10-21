import { ERR_VIDEO_DURATION_EXCEEDED } from '@/constants/i18n';
import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';

/** Fail-closed: unknown duration must not download. */
export function assertMaxVideoDuration(durationSeconds: number | null): void {
  if (durationSeconds === null || durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(ERR_VIDEO_DURATION_EXCEEDED);
  }
}
