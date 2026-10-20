import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const source = await readFile(new URL('index.html', dist), 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const pages = [
  ['support', 'Support clpr | clpr', 'Support SUBCULT, the studio behind clpr. Patreon is optional and does not change your account, features, limits or ranking.'],
  ['about', 'About clpr | clpr', 'clpr sorts Twitch clips by creator, topic and tag, so the one you mean is easier to find. Built by SUBCULT.'],
];
await mkdir(new URL('seo-pages/', dist), { recursive: true });
for (const [path, title, description] of pages) {
  let page = source.replace(/<title>.*?<\/title>/s, `<title>${escape(title)}</title>`);
  for (const [key, value] of [['description', description], ['og:title', title], ['og:description', description], ['twitter:title', title], ['twitter:description', description]]) {
    page = page.replace(new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*("[^>]*>)`), (_, before, after) => before + escape(value) + after);
  }
  page = page.replace('</head>', `<link rel="canonical" href="https://clpr.tv/${path}"><meta property="og:url" content="https://clpr.tv/${path}">\n</head>`);
  await writeFile(new URL(`seo-pages/${path}.html`, dist), page);
}
