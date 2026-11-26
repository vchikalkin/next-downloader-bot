import assert from 'node:assert/strict';
import { parseYtDlpMeta } from './download-to-file';

assert.deepEqual(parseYtDlpMeta('{"description":"hello world","duration":14.5}\n'), {
  caption: 'hello world',
  duration: 14.5,
});

assert.deepEqual(
  parseYtDlpMeta('some log line\n{"description":"  trimmed  ","duration":null}\n'),
  {
    caption: 'trimmed',
    duration: null,
  },
);

assert.deepEqual(parseYtDlpMeta('{"description":"   ","duration":0}'), {
  caption: undefined,
  duration: 0,
});

assert.deepEqual(parseYtDlpMeta('not json at all'), { duration: null });
