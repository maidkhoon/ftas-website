// One-time import of the products and services in seed-data.json into WordPress.
// Requires the FTAS Content Model plugin to be active.
//
// Usage (PowerShell):
//   $env:WP_API_URL="https://cms.example.com"; $env:WP_USER="admin"; $env:WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"; node scripts/seed-wordpress.mjs
// Create the application password in WordPress: Users > Profile > Application Passwords.
// Items are matched by slug: new ones are created, existing ones are updated, so it is safe to run again.

import { readFileSync } from 'node:fs';

const base = (process.env.WP_API_URL || '').replace(/\/+$/, '');
const user = process.env.WP_USER;
const pass = process.env.WP_APP_PASSWORD;
if (!base || !user || !pass) {
  console.error('Set WP_API_URL, WP_USER and WP_APP_PASSWORD first.');
  process.exit(1);
}

const api = `${base}/wp-json/wp/v2`;
const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
const data = JSON.parse(readFileSync(new URL('./seed-data.json', import.meta.url), 'utf8'));

async function call(path, options = {}) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: { Authorization: auth, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status} ${body.message || ''}`);
  return body;
}

const decode = (s) => s.replace(/&amp;/g, '&');

async function termMap(taxonomy) {
  const terms = await call(`/${taxonomy}?per_page=100`);
  return new Map(terms.map((t) => [decode(t.name).toLowerCase(), t.id]));
}

async function findId(type, slug) {
  const found = await call(`/${type}?slug=${encodeURIComponent(slug)}&status=any`);
  return found.length > 0 ? found[0].id : null;
}

// Create the item, or update it when the slug already exists.
async function save(type, slug, payload) {
  const id = await findId(type, slug);
  await call(id ? `/${type}/${id}` : `/${type}`, { method: 'POST', body: JSON.stringify(payload) });
  return id ? 'updated' : 'created';
}

const industries = await termMap('industries');
const divisions = await termMap('divisions');
const productDivision = divisions.get('technology products & saas');
const serviceDivision = divisions.get('it services & digital solutions');

const counts = { created: 0, updated: 0 };

for (const [i, p] of data.products.entries()) {
  const industry = industries.get(p.industry.toLowerCase());
  if (!industry) throw new Error(`Industry term not found: ${p.industry}. Is the plugin active?`);
  // Taxonomy fields in the REST API use the taxonomy rest_base: "industries" and "divisions".
  const result = await save('products', p.slug, {
    title: p.title,
    slug: p.slug,
    status: 'publish',
    menu_order: i,
    industries: [industry],
    divisions: productDivision ? [productDivision] : [],
    meta: { status: p.status, tagline: p.tagline, features: p.features },
  });
  counts[result]++;
  console.log(`product (${result}): ${p.title}`);
}

for (const [i, s] of data.services.entries()) {
  const result = await save('services', s.slug, {
    title: s.title,
    slug: s.slug,
    status: 'publish',
    menu_order: i,
    excerpt: s.summary,
    divisions: serviceDivision ? [serviceDivision] : [],
    meta: { deliverables: s.deliverables },
  });
  counts[result]++;
  console.log(`service (${result}): ${s.title}`);
}

console.log(`Done. Created ${counts.created}, updated ${counts.updated}.`);
