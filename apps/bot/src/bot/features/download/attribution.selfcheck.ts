import assert from 'node:assert/strict';
import { fmt, link as platformLink } from '@grammyjs/parse-mode';

const url = 'https://www.instagram.com/reel/ABC123/';
const formatted = fmt`Прислал @vasya из ${platformLink(url)}Instagram${platformLink}`;
const [entity] = formatted.caption_entities;

assert.equal(formatted.caption, 'Прислал @vasya из Instagram');
assert.equal(formatted.caption_entities.length, 1);
assert.ok(entity);
assert.equal(entity.type, 'text_link');
assert.ok('url' in entity);
assert.equal(entity.url, url);
