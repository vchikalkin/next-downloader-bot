export const DESCRIPTION = 'description';
export const SHORT_DESCRIPTION = 'short-description';
export const START = 'start';

export function commandDescriptionKey(name: string) {
  return `${name}.description`;
}

export const DOWNLOADING_STARTED = 'downloading-started';
export const MSG_WELCOME = 'msg-welcome';
export const MSG_UNHANDLED = 'msg-unhandled';

export const ERR_GENERIC = 'err-generic';
export const ERR_INVALID_DOWNLOAD_URLS = 'err-invalid-download-urls';
export const ERR_INVALID_INSTAGRAM_RESPONSE = 'err-invalid-instagram-response';
export const ERR_INVALID_TIKTOK_RESPONSE = 'err-invalid-tiktok-response';
export const ERR_INVALID_URL = 'err-invalid-url';
export const ERR_LIMIT_EXCEEDED = 'err-limit-exceeded';
export const ERR_VIDEO_DURATION_EXCEEDED = 'err-video-duration-exceeded';
