import { readFile } from 'node:fs/promises';

/** Netscape cookies.txt path from env, if set. */
export function cookiesFilePath(): string | undefined {
  // ponytail: read process.env so selfcheck can import parser without loading env schema
  return process.env.COOKIES_FILE || undefined;
}

/**
 * Parse Netscape / cookies.txt into a Cookie header for one host.
 * Later lines win on duplicate names. Skips expired entries (expires \> 0).
 */
export function cookieHeaderFromNetscape(text: string, domain: string): string | null {
  const host = domain.replace(/^\./u, '').toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const cookies = new Map<string, string>();

  for (const line of text.split(/\r?\n/u)) {
    if (!line || (line.startsWith('#') && !line.startsWith('#HttpOnly_'))) {
      continue;
    }

    const raw = line.startsWith('#HttpOnly_') ? line.slice('#HttpOnly_'.length) : line;
    const parts = raw.split('\t');

    if (parts.length < 7) {
      continue;
    }

    const [cookieDomain, , , , expiresRaw, name, ...valueParts] = parts;
    const value = valueParts.join('\t');

    if (!cookieDomain || !name) {
      continue;
    }

    const expires = Number(expiresRaw);

    if (Number.isFinite(expires) && expires > 0 && expires < now) {
      continue;
    }

    const cookieHost = cookieDomain.replace(/^\./u, '').toLowerCase();

    if (host !== cookieHost && !host.endsWith(`.${cookieHost}`)) {
      continue;
    }

    cookies.set(name, value);
  }

  return cookies.size > 0 ? [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') : null;
}

/** Read COOKIES_FILE each call so ops can replace the file without restart. */
export async function cookieHeader(domain: string): Promise<string | null> {
  const path = cookiesFilePath();

  if (!path) {
    return null;
  }

  try {
    return cookieHeaderFromNetscape(await readFile(path, 'utf8'), domain);
  } catch {
    return null;
  }
}

export function cookieValue(header: string | null, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');

    if (separator <= 0) {
      continue;
    }

    if (trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }

  return null;
}

/** Later non-empty parts win on duplicate cookie names. */
export function mergeCookieHeaders(...parts: (string | null | undefined)[]): string {
  const cookies = new Map<string, string>();

  for (const part of parts) {
    if (!part) {
      continue;
    }

    for (const pair of part.split(';')) {
      const trimmed = pair.trim();
      const separator = trimmed.indexOf('=');

      if (separator <= 0) {
        continue;
      }

      cookies.set(trimmed.slice(0, separator), trimmed.slice(separator + 1));
    }
  }

  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}
