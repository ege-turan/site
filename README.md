# egeturan.com

This is the source for my personal site — a running list of projects
and some short posts. I write and edit all of it in Notion; this repo
just turns that into a static site and hosts it for free.

Built with [Astro](https://astro.build), deployed on GitHub Pages.
Both the projects list and the blog are pulled from Notion databases
at build time, so adding something new is just writing a Notion page —
no code changes, no redeploying by hand.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your own Notion values, or leave blank to use sample data
npm run dev             # http://localhost:4321
```

## Setting up the Notion side

1. Go to <https://www.notion.so/my-integrations> → **New connection**.
   Name it whatever you like, authentication method **Access token**
   (not OAuth). Copy the token it gives you — this is `NOTION_TOKEN`.
2. **Projects database**, with these columns:
   - `Project name` — Title
   - `Number` — Number (controls display order, ascending; not shown)
   - `Blurb` — Text (preview line, shown in the list and as the page description)
   - `Github` — URL (shown as "GitHub ↗" on the project page, if set)
   - `Status` — Select (`Done` / `In progress` / `Not started`) — shown
     as an "In progress" tag on the card; doesn't affect visibility
     (that's `Published`, below)
   - `Published` — Checkbox — only checked rows appear on the site
   - `Start date` / `End date` — Date (the card/page shows `End date`'s
     year, or `Start date`'s if there's no end date yet)
   - `Images` — Files, optional (extra images shown as a small gallery
     on the project's page, below the write-up)
   - The **page cover** (the image you see when you click "Open" on a
     row) is used automatically as the preview thumbnail in the list
     and the hero image on the project's page — no separate column
     needed for that.
3. **Blog database**, with these columns:
   - `Title` — Title
   - `Description` — Text (the preview/summary line)
   - `Date` — Date
   - `Slug` — Text, optional (defaults to a slugified title if left blank)
   - `Published` — Checkbox
4. **Settings database**, with **exactly one row** — this is where the
   site's text, photo, and resume live, instead of in a code file:
   - `Name` — Title (shown as the page heading)
   - `Role` — Text (the tagline underneath)
   - `Bio` — Text (the paragraph under that)
   - `Projects section title` — Text (defaults to "projects")
   - `Writing section title` — Text (defaults to "writing")
   - `LinkedIn` — URL
   - `Github` — URL
   - `Photo` — Files (upload directly here — leave empty to hide it)
   - `Resume` — Files (upload a PDF directly here — leave empty to
     hide the "Resume" link)
   - `Page width` — Number, optional (width in pixels of the centered
     content column, with empty space on either side. Defaults to 640)
   - `Photo size` — Number, optional (diameter in pixels of the avatar
     photo. Defaults to 72)
   - `Project thumbnail width` / `Project thumbnail height` — Number,
     optional (size in pixels of each project's preview image in the
     list. Defaults to 220 × 150 — only applies on wider screens; on
     narrow ones the thumbnail always goes full-width above the text)
5. For **all three** databases: open it, **···** → **Connections** →
   add the connection from step 1. Skipping this is the most common
   reason the API comes back empty.
6. Copy each database's ID from its URL —
   `notion.so/yourworkspace/<DATABASE_ID>?v=...` — these become
   `NOTION_PROJECTS_DATABASE_ID`, `NOTION_BLOG_DATABASE_ID`, and
   `NOTION_SETTINGS_DATABASE_ID`.

If you're using different column names, adjust the mapping in
`src/lib/notion.js` to match.

### Writing content

A project or post's full write-up is just the content of that Notion
page — write below the row like any Notion doc: headings, lists, code
blocks, images. Paste or upload an image (a drawing, a screenshot,
whatever) and it shows up on the site with no extra setup. Uncheck
`Published` on either database to keep something off the live site.

Everything on the homepage — name, tagline, bio, section headings,
resume, photo — lives in that one Settings row. No code involved.

### A note on images and link expiry

Files uploaded into Notion get temporary links that expire after
about an hour. The build handles this automatically: it downloads
each file once and saves it as a permanent part of the built site, so
nothing on the live site ever goes stale. The one exception is
`npm run dev` — local dev uses the live Notion links directly, so an
image can stop loading if left running for hours. Doesn't affect the
deployed site; just restart the dev server.

While it's downloading each image anyway, the build also resizes it
down to a sensible max width and converts it to WebP — smaller files,
no visible quality loss. Project covers cap around 1600px, gallery
images around 1000px, the avatar around 400px: comfortably larger than
they're ever displayed, without shipping a multi-megabyte original.
Resumes are left untouched, since compressing a PDF like that doesn't
make sense.

## Deploying

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

1. Repo → **Settings** → **Pages** → set **Source** to
   **GitHub Actions**.
2. Repo → **Settings** → **Secrets and variables** → **Actions** → add:
   - `NOTION_TOKEN`
   - `NOTION_PROJECTS_DATABASE_ID`
   - `NOTION_BLOG_DATABASE_ID`
   - `NOTION_SETTINGS_DATABASE_ID`
3. Push to `main`, or trigger the workflow manually from the
   **Actions** tab. It also rebuilds on a schedule (every 6 hours —
   see `.github/workflows/deploy.yml`) so Notion edits show up without
   a code push.

### Pointing a custom domain at it

A `CNAME` file is already in `public/` with mine in it — swap it for
your own domain if you're forking this.

At your domain's DNS host:
- Four **A** records on the root domain, pointing to GitHub Pages:
  `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
  `185.199.111.153`
- One **CNAME** record: host `www`, value `<you>.github.io`

Then in **Settings → Pages**, enter the domain under "Custom domain"
and enable **Enforce HTTPS** once it verifies.

## Adding content day-to-day

- **Projects** — new row in the Projects database, write the page
  body, check `Published`.
- **Posts** — new row in the Blog database, write the page body —
  images and all — check `Published`.
- **Site text/photo/resume** — edit the one row in Settings.

No code, no git, either way. Shows up on the next scheduled rebuild,
or trigger **Actions** → the workflow → **Run workflow** for an
instant update.

## Cost

Astro, GitHub, GitHub Actions (public repos), GitHub Pages, and the
Notion API are all free for this. The only real cost is the domain.
