import Tiktok from '@tobyg74/tiktok-api-dl';

Tiktok.Downloader(url_pictures, {
  version: 'v3', // "v1" | "v2" | "v3"
}).then((result) => console.log(result));
