import assert from 'node:assert/strict';
import { extractDownloadableUrls } from './extract';

const text =
  'see https://www.instagram.com/reel/ABC123/ and https://www.youtube.com/watch?v=dQw4w9WgXcQ later';

const urls = extractDownloadableUrls(text);

assert.equal(urls.length, 2);
assert.ok(urls[0]?.includes('instagram.com'));
assert.ok(urls[1]?.includes('youtube.com'));
assert.deepEqual(extractDownloadableUrls('no links here'), []);

const tiktok =
  'https://www.tiktok.com/@user/video/7123456789012345678?is_from_webapp=1&sender_device=pc';

assert.deepEqual(
  extractDownloadableUrls(tiktok, [{ length: tiktok.length, offset: 0, type: 'url' }]),
  [tiktok],
);
