import assert from 'node:assert/strict';
import { extractDownloadableUrls } from './extract';

const text =
  'see https://www.instagram.com/reel/ABC123/ and https://www.youtube.com/watch?v=dQw4w9WgXcQ later';

const links = extractDownloadableUrls(text);

assert.equal(links.length, 2);
assert.ok(links.every((link) => link.url && link.quote !== undefined && link.quotePosition !== undefined));
assert.ok(links.some((link) => link.url.includes('instagram.com')));
assert.ok(links.some((link) => link.url.includes('youtube.com')));
assert.deepEqual(extractDownloadableUrls('no links here'), []);

const tiktok =
  'https://www.tiktok.com/@user/video/7123456789012345678?is_from_webapp=1&sender_device=pc';

assert.deepEqual(extractDownloadableUrls(tiktok, [{ length: tiktok.length, offset: 0, type: 'url' }]), [
  { quote: tiktok, quotePosition: 0, url: tiktok },
]);

const withQuery = 'https://www.instagram.com/reel/ABC123/?igsh=xyz';
const withoutSlash = 'https://www.instagram.com/reel/ABC123';

assert.equal(extractDownloadableUrls(`${withoutSlash} ${withQuery}`).length, 1);

assert.equal(
  extractDownloadableUrls(
    'https://www.instagram.com/reel/ABC123/ https://www.instagram.com/reel/ABC123XYZ/',
  ).length,
  2,
);
