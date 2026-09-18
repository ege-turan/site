// Ege Turan
// September 17, 2026
// Astro config — points the site at egeturan.com, nothing fancier than that.

import { defineConfig } from 'astro/config';

// Since egeturan.com is a custom domain (via a CNAME file in /public),
// site is the root — no "base" path needed, unlike a project page
// served at username.github.io/repo-name.
export default defineConfig({
  site: 'https://egeturan.com',
});
