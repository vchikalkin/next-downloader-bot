/* eslint-disable sonarjs/regex-complexity */
export const TIKTOK_URL_REGEX =
  /https:\/\/(?:m|t|www|vm|vt|lite)?\.?tiktok\.com\/(.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|&item_id=)(\d+)|\w+)/u;

export const INSTAGRAM_URL_REGEX =
  /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/([a-zA-Z0-9_-]+)(\/)?(\?utm_source=ig_web_copy_link&igshid=[a-z0-9]+)?/u;
