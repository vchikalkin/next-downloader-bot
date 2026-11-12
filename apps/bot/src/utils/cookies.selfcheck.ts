import assert from 'node:assert/strict';
import { cookieHeaderFromNetscape, cookieValue, mergeCookieHeaders } from './cookies';

const sample = `# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	9999999999	sessionid	abc%3Adef
.instagram.com	TRUE	/	FALSE	9999999999	ds_user_id	42
.instagram.com	TRUE	/	FALSE	1	csrftoken	expired
.youtube.com	TRUE	/	TRUE	9999999999	SID	yt-only
`;

const ig = cookieHeaderFromNetscape(sample, 'instagram.com');

assert.ok(ig);
assert.equal(cookieValue(ig, 'sessionid'), 'abc%3Adef');
assert.equal(cookieValue(ig, 'ds_user_id'), '42');
assert.equal(cookieValue(ig, 'csrftoken'), null);
assert.equal(cookieValue(ig, 'SID'), null);

assert.equal(cookieValue(cookieHeaderFromNetscape(sample, 'youtube.com'), 'SID'), 'yt-only');
assert.equal(
  mergeCookieHeaders('csrftoken=guest; mid=1', 'sessionid=s; csrftoken=real'),
  'csrftoken=real; mid=1; sessionid=s',
);

assert.equal(cookieHeaderFromNetscape(sample, 'example.com'), null);
