import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';

const jar = new tough.CookieJar();

const headers = {
  accept: '*/*',
  // 'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json',
  dnt: '1',
  priority: 'u=1, i',
  'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'sec-gpc': '1',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
};

export const getClient = async () => {
  const client = wrapper(
    axios.create({
      headers,
      jar,
      withCredentials: true,
    }),
  );

  // get session cookie
  await client.get('https://downr.org/.netlify/functions/analytics');

  return client;
};
