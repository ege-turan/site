// Ege Turan
// September 17, 2026
// Downloads Notion's temporary file links once at build time, resizes/compresses images to WebP, so they don't go stale and load fast.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Notion's uploaded-file URLs (covers, image/file properties) are
// temporary signed links that expire after about an hour. If we put
// them straight into the HTML, the site looks fine right after a
// build and then has broken images an hour later. So instead: during
// the build, download the file once and save it into the site's own
// output — from then on it's just a normal, permanent static asset.
//
// Images also get resized down to a sensible max width and converted
// to WebP (smaller files, near-identical quality) so they load fast
// on the live site instead of shipping whatever multi-megabyte photo
// came straight off a phone.

const ASSET_DIR = path.join(process.cwd(), 'dist', 'notion-assets');

/**
 * @param {string} url       the temporary Notion file URL
 * @param {string} key       unique filename (no extension)
 * @param {object} [options]
 * @param {number} [options.maxWidth]  resize images down to this width max (never upscales). Omit for non-image files (e.g. a resume PDF).
 */
export async function cacheNotionAsset(url, key, options = {}) {
  if (!url) return null;

  // astro dev has no dist/ folder to write into, and a dev session is
  // short enough that the temporary link won't expire mid-session —
  // so just use it directly rather than caching.
  if (import.meta.env.DEV) return url;

  const { maxWidth } = options;

  try {
    if (!fs.existsSync(ASSET_DIR)) fs.mkdirSync(ASSET_DIR, { recursive: true });

    const res = await fetch(url);
    if (!res.ok) return url;
    const buffer = Buffer.from(await res.arrayBuffer());

    if (maxWidth) {
      try {
        const optimized = await sharp(buffer)
          .resize({ width: maxWidth, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const filename = `${key}.webp`;
        fs.writeFileSync(path.join(ASSET_DIR, filename), optimized);
        return `/notion-assets/${filename}`;
      } catch {
        // Not a format sharp can read (or some other processing
        // failure) — fall through and save the original bytes as-is
        // rather than losing the file entirely.
      }
    }

    const cleanUrl = url.split('?')[0];
    const ext = (cleanUrl.split('.').pop() || 'bin').slice(0, 5).replace(/[^a-z0-9]/gi, '') || 'bin';
    const filename = `${key}.${ext}`;
    fs.writeFileSync(path.join(ASSET_DIR, filename), buffer);
    return `/notion-assets/${filename}`;
  } catch {
    // If the download fails for any reason, fall back to the live
    // (temporary) URL rather than breaking the build.
    return url;
  }
}
