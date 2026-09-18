# egeturan.com

Static personal site built with [Astro](https://astro.build). Both the
projects list and the blog are pulled from Notion databases at build
time — writing a post or a project is just writing a Notion page, and
images/drawings you paste in show up on the site automatically. Hosted
for free on GitHub Pages.

## 1. Local setup

```bash
npm install
cp .env.example .env   # fill in your own Notion values, or leave blank to use sample data
npm run dev             # http://localhost:4321
```

## 2. Set up the Notion side (free)

1. Go to <https://www.notion.so/my-integrations> → **New connection**.
   Name it (e.g. "Site"), authentication method **Access token** (not
   OAuth). Copy the token it gives you — this is `NOTION_TOKEN`.
2. Your existing Projects database is used as-is, with these columns:
   - `Project name` — Title
   - `Number` — Number (controls display order, ascending; not shown)
   - `Blurb` — Text (preview line, shown in the list and as the page description)
   - `Github` — URL (shown as "GitHub ↗" on the project page, if set)
   - `Status` — Select (`Done` / `In progress` / `Not started`) — shown
     as an "In progress" tag on the card when set to that; doesn't
     affect visibility (see `Published` below)
   - `Published` — Checkbox — only checked rows appear on the site,
     same as the blog
   - `Start date` / `End date` — Date (the row/page shows `End date`'s
     year, or `Start date`'s if there's no end date yet)
   - `Images` — Files, optional (extra images shown as a small gallery
     on the project's page, below the write-up)
   - The **page cover** (the image you see when you click "Open" on a
     row) is used automatically as the preview thumbnail in the list
     and the hero image on the project's page — no separate column
     needed for this.
3. Create a second database for blog posts with these columns:
   - `Title` — Title
   - `Description` — Text (used as the preview/summary line)
   - `Date` — Date
   - `Slug` — Text, optional (defaults to a slugified title if left blank)
   - `Published` — Checkbox
4. Create a third database called "Settings" with **exactly one row**
   — this is where the site's text, photo, and resume live, instead of
   in a code file. Columns:
   - `Name` — Title (your name, shown as the page heading)
   - `Role` — Text (the tagline under your name)
   - `Bio` — Text (the paragraph under that)
   - `Projects section title` — Text (defaults to "projects")
   - `Writing section title` — Text (defaults to "writing")
   - `LinkedIn` — URL (your LinkedIn profile link, shown as the
     "LinkedIn" nav link)
   - `Github` — URL (your GitHub profile link)
   - `Photo` — Files (upload a photo directly here — leave empty to
     hide it)
   - `Resume` — Files (upload a PDF directly here — leave empty to
     hide the "Resume" link)
   - `Page width` — Number, optional (the width in pixels of the
     centered content column — the readable strip everything sits in,
     with the rest of the screen empty on either side. Defaults to
     640 if left blank. Wider = more room per line; narrower = a
     tighter, more single-column feel)
   - `Photo size` — Number, optional (diameter in pixels of your
     avatar photo. Defaults to 72)
   - `Project thumbnail width` / `Project thumbnail height` — Number,
     optional (size in pixels of the preview image next to each
     project in the list. Defaults to 220 × 150). These only apply on
     wider screens — on narrow ones the thumbnail always goes
     full-width above the text instead, regardless of this setting.
5. For **all three** databases: open it, click **···** → **Connections**
   → add the connection you created in step 1 (this is the "sharing"
   step — without it the API call returns nothing).
6. Copy each database's ID from its URL:
   `notion.so/yourworkspace/<DATABASE_ID>?v=...` — these are
   `NOTION_PROJECTS_DATABASE_ID`, `NOTION_BLOG_DATABASE_ID`, and
   `NOTION_SETTINGS_DATABASE_ID`.

If any of your column names differ from the above, either rename them
in Notion to match, or adjust the mapping in `src/lib/notion.js`.

### Writing content

A project or post's "more info" / full body page is just **the content
of that Notion page** — write below the database row like a normal
Notion doc: headings, paragraphs, bullet lists, code blocks, and
images. Paste or upload an image (a drawing, screenshot, whatever) and
it renders on the site; no extra setup needed. Uncheck `Published` —
on either database — to keep a row off the live site.

Everything text-wise on the homepage — your name, tagline, bio, the
"projects"/"writing" headings, your resume and photo — is edited the
same way: open the one row in the Settings database and change it
there. No code, no git, no `site.config.js` file to hunt down.

### A note on images/files and expiry

Files you upload into Notion (covers, the Images/Photo/Resume
properties, images pasted into a page) get temporary links that
expire after about an hour. The site handles this automatically: at
build time it downloads each file once and saves it as a permanent
part of the built site, so what ends up live on egeturan.com never
expires. The only place this doesn't apply is `npm run dev` — running
locally uses the live Notion links directly (there's no built site to
save into yet), so if you leave `npm run dev` open for several hours
an image might stop loading locally. It won't affect the deployed
site; just restart `npm run dev` if that happens.

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 4. Turn on GitHub Pages (free)

1. Repo → **Settings** → **Pages** → under "Build and deployment", set
   **Source** to **GitHub Actions** (the included workflow handles the
   rest).
2. Repo → **Settings** → **Secrets and variables** → **Actions** → add:
   - `NOTION_TOKEN`
   - `NOTION_PROJECTS_DATABASE_ID`
   - `NOTION_BLOG_DATABASE_ID`
3. Push to `main` (or run the workflow manually from the **Actions**
   tab) to trigger the first deploy. It also rebuilds on a schedule
   (every 6 hours, see `.github/workflows/deploy.yml`) so Notion edits
   show up without a code push.

## 5. Point egeturan.com at it

A `CNAME` file with `egeturan.com` is already in `public/`, so GitHub
Pages knows to serve the site on your domain once DNS is set:

At your domain registrar (wherever egeturan.com's DNS is currently
managed — check there before moving it off Framer):

- For the apex domain (`egeturan.com`), add four **A** records pointing
  to GitHub Pages' IPs:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
- For `www.egeturan.com`, add a **CNAME** record pointing to
  `<you>.github.io`.

Then in the repo's **Settings → Pages**, enter `egeturan.com` as the
custom domain and enable **Enforce HTTPS** once it's verified (GitHub
issues the certificate for free).

## Adding content

- **Projects** — add a row in the Projects database, write the page
  body (this becomes the project's detail page), check `Published`.
- **Blog posts** — add a row in the Blog database, write the post as
  the page body — including images/drawings — check `Published`.
- **Site text/photo/resume** — edit the single row in the Settings
  database.

Either way, no code changes or git pushes needed. Content shows up on
the next scheduled rebuild (every 6 hours), or trigger the **Actions**
tab → this workflow → **Run workflow** for an instant update.

## Nothing here costs money

Astro, GitHub, GitHub Actions (public repos), GitHub Pages, and the
Notion API are all free for this use case — the only cost is the
domain itself, which you already own.
