// Ege Turan
// September 17, 2026
// All the Notion API calls live here — projects, posts, site settings, and the page-content renderer they share.

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { marked } from 'marked';
import { cacheNotionAsset } from './assets.js';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getClient() {
  const token = import.meta.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

function getFileUrl(fileObj) {
  return fileObj?.file?.url ?? fileObj?.external?.url ?? null;
}

// ---------- Projects ----------

const SAMPLE_PROJECTS = [
  {
    id: 'sample-1',
    slug: 'sample-project',
    title: 'Sample project',
    blurb: 'Add NOTION_TOKEN and NOTION_PROJECTS_DATABASE_ID to see your real projects.',
    year: '2026',
    github: '#',
    status: 'Done',
    cover: null,
    images: [],
  },
];

export async function getProjects() {
  const notion = getClient();
  const databaseId = import.meta.env.NOTION_PROJECTS_DATABASE_ID;
  if (!notion || !databaseId) return SAMPLE_PROJECTS;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { property: 'Published', checkbox: { equals: true } },
    sorts: [{ property: 'Number', direction: 'ascending' }],
  });

  return Promise.all(
    response.results.map(async (page) => {
      const props = page.properties;
      const title = props['Project name']?.title?.[0]?.plain_text ?? 'Untitled';
      const status = props.Status?.select?.name ?? '';
      const startDate = props['Start date']?.date?.start ?? null;
      const endDate = props['End date']?.date?.start ?? null;
      const year = (endDate ?? startDate)?.slice(0, 4) ?? '';

      const cover = await cacheNotionAsset(getFileUrl(page.cover), `project-${page.id}-cover`);
      const rawImages = (props.Images?.files ?? []).map(getFileUrl).filter(Boolean);
      const images = await Promise.all(
        rawImages.map((url, i) => cacheNotionAsset(url, `project-${page.id}-img-${i}`))
      );

      return {
        id: page.id,
        slug: slugify(title),
        title,
        blurb: props.Blurb?.rich_text?.[0]?.plain_text ?? '',
        github: props.Github?.url ?? '',
        status,
        year,
        cover,
        images: images.filter(Boolean),
      };
    })
  );
}

export async function getProject(slug) {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}

// ---------- Blog posts ----------

const SAMPLE_POSTS = [
  {
    id: 'sample-post-1',
    slug: 'hello-world',
    title: 'Hello world',
    description: 'Add NOTION_TOKEN and NOTION_BLOG_DATABASE_ID to pull your real posts.',
    date: new Date().toISOString(),
  },
];

export async function getPosts() {
  const notion = getClient();
  const databaseId = import.meta.env.NOTION_BLOG_DATABASE_ID;
  if (!notion || !databaseId) return SAMPLE_POSTS;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: { property: 'Published', checkbox: { equals: true } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return response.results.map((page) => {
    const props = page.properties;
    const title = props.Title?.title?.[0]?.plain_text ?? 'Untitled';
    const slug = props.Slug?.rich_text?.[0]?.plain_text || slugify(title);
    return {
      id: page.id,
      slug,
      title,
      description: props.Description?.rich_text?.[0]?.plain_text ?? '',
      date: props.Date?.date?.start ?? new Date().toISOString(),
    };
  });
}

export async function getPost(slug) {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

// ---------- Site settings (name, bio, section titles, photo, resume) ----------
// Pulled from a Notion database with exactly one row.

const SAMPLE_SETTINGS = {
  name: 'Ege Turan',
  role: 'Software / personal projects, notes as I go',
  bio: "I build small tools and side projects, mostly things I wanted for myself first. This page is generated from a running list in Notion, so it's always the current set.",
  linkedin: 'https://www.linkedin.com/in/yourprofile',
  github: 'https://github.com/',
  projectsSectionTitle: 'projects',
  writingSectionTitle: 'writing',
  photo: null,
  resume: null,
  pageWidth: 640,
  photoSize: 72,
  thumbWidth: 220,
  thumbHeight: 150,
};

export async function getSettings() {
  const notion = getClient();
  const databaseId = import.meta.env.NOTION_SETTINGS_DATABASE_ID;
  if (!notion || !databaseId) return SAMPLE_SETTINGS;

  const response = await notion.databases.query({ database_id: databaseId, page_size: 1 });
  const page = response.results[0];
  if (!page) return SAMPLE_SETTINGS;

  const props = page.properties;
  const photo = await cacheNotionAsset(getFileUrl(props.Photo?.files?.[0]), 'site-photo');
  const resume = await cacheNotionAsset(getFileUrl(props.Resume?.files?.[0]), 'site-resume');

  return {
    name: props.Name?.title?.[0]?.plain_text || SAMPLE_SETTINGS.name,
    role: props.Role?.rich_text?.[0]?.plain_text || SAMPLE_SETTINGS.role,
    bio: props.Bio?.rich_text?.[0]?.plain_text || SAMPLE_SETTINGS.bio,
    linkedin: props.LinkedIn?.url || props.LinkedIn?.rich_text?.[0]?.plain_text || SAMPLE_SETTINGS.linkedin,
    github: props.Github?.url || SAMPLE_SETTINGS.github,
    projectsSectionTitle:
      props['Projects section title']?.rich_text?.[0]?.plain_text || SAMPLE_SETTINGS.projectsSectionTitle,
    writingSectionTitle:
      props['Writing section title']?.rich_text?.[0]?.plain_text || SAMPLE_SETTINGS.writingSectionTitle,
    photo,
    resume,
    pageWidth: props['Page width']?.number || SAMPLE_SETTINGS.pageWidth,
    photoSize: props['Photo size']?.number || SAMPLE_SETTINGS.photoSize,
    thumbWidth: props['Project thumbnail width']?.number || SAMPLE_SETTINGS.thumbWidth,
    thumbHeight: props['Project thumbnail height']?.number || SAMPLE_SETTINGS.thumbHeight,
  };
}

// ---------- Full page body (shared by projects + posts) ----------
// Renders a Notion page's content blocks — including images, so
// drawings/screenshots pasted into Notion show up automatically.

// Finds markdown image links (Notion page-body images render this way)
// and caches each one the same way covers/galleries are cached, so
// drawings/screenshots pasted into a page don't go stale either.
async function cacheMarkdownImages(markdown, keyPrefix) {
  const regex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const matches = [...markdown.matchAll(regex)];
  let result = markdown;

  for (let i = 0; i < matches.length; i++) {
    const url = matches[i][2];
    const cached = await cacheNotionAsset(url, `${keyPrefix}-img-${i}`);
    if (cached) result = result.replace(url, cached);
  }
  return result;
}

export async function getPageHtml(pageId) {
  const notion = getClient();
  if (!notion || pageId.startsWith('sample-')) {
    return '<p><em>Connect Notion to see the full page content here.</em></p>';
  }

  const n2m = new NotionToMarkdown({ notionClient: notion });
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  const { parent } = n2m.toMarkdownString(mdBlocks);
  const withCachedImages = await cacheMarkdownImages(parent || '', `page-${pageId}`);
  return marked.parse(withCachedImages);
}
