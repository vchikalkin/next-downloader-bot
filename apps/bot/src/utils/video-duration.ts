import { MAX_VIDEO_DURATION_SECONDS } from '@/constants/limits';

export const ERR_VIDEO_DURATION_EXCEEDED = 'err-video-duration-exceeded';

export function assertMaxVideoDuration(durationSeconds: number | null): void {
  if (durationSeconds !== null && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error(ERR_VIDEO_DURATION_EXCEEDED);
  }
}
