/* eslint-disable sonarjs/regex-complexity */
export const TIKTOK_URL_REGEX =
  /https:\/\/(?:m|t|www|vm|vt|lite)?\.?tiktok\.com\/(.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|&item_id=)(\d+)|\w+)/u;

export const INSTAGRAM_URL_REGEX =
  /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/([\w-]+)(\/)?(\?utm_source=ig_web_copy_link&igshid=[a-z0-9]+)?/u;

export const YOUTUBE_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})(?:[?&]\S*)?/u;
