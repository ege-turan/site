// Ege Turan
// September 17, 2026
// Downloads Notion's temporary file links once at build time so images don't go stale on the live site.

import fs from 'node:fs';
import path from 'node:path';

// Notion's uploaded-file URLs (covers, image/file properties) are
// temporary signed links that expire after about an hour. If we put
// them straight into the HTML, the site looks fine right after a
// build and then has broken images an hour later. So instead: during
// the build, download the file once and save it into the site's own
// output — from then on it's just a normal, permanent static asset.

const ASSET_DIR = path.join(process.cwd(), 'dist', 'notion-assets');

export async function cacheNotionAsset(url, key) {
  if (!url) return null;

  // astro dev has no dist/ folder to write into, and a dev session is
  // short enough that the temporary link won't expire mid-session —
  // so just use it directly rather than caching.
  if (import.meta.env.DEV) return url;

  try {
    if (!fs.existsSync(ASSET_DIR)) fs.mkdirSync(ASSET_DIR, { recursive: true });

    const cleanUrl = url.split('?')[0];
    const ext = (cleanUrl.split('.').pop() || 'jpg').slice(0, 5).replace(/[^a-z0-9]/gi, '') || 'jpg';
    const filename = `${key}.${ext}`;
    const filePath = path.join(ASSET_DIR, filename);

    const res = await fetch(url);
    if (!res.ok) return url;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return `/notion-assets/${filename}`;
  } catch {
    // If the download fails for any reason, fall back to the live
    // (temporary) URL rather than breaking the build.
    return url;
  }
}
