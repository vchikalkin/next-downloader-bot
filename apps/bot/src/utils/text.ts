export function removeHashtags(caption: string): string {
  return caption.replaceAll(/#[\p{L}\p{N}_-]+/gu, '').trim();
}
