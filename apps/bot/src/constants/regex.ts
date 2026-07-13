export const tiktokUrlRegex =
  /https:\/\/(?:m|t|www|vm|vt|lite)?\.?tiktok\.com\/(.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|&item_id=)(\d+)|\w+)/u;

export const instagramUrlRegex =
  /https?:\/\/(www\.)?instagram\.com\/(p|reels?|tv|stories)\/([\w-]+)(\/)?(\?.+)?/u;

export const youtubeUrlRegex =
  /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})(?:[?&]\S*)?/u;

export const tagsRegex = /#[\p{L}\p{N}_]+/gu;
