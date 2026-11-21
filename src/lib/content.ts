import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { industries, products as localProducts, type Product, type Status } from '../data/products';
import { services as localServices, type Service } from '../data/services';

// Content source, in order:
//   1. WordPress REST API, when WP_API_URL is set and reachable (e.g. http://localhost:8080)
//   2. The last good copy saved in data/wp-snapshot.json (written automatically on every successful load)
//   3. The built-in data in src/data/
// So if WordPress is stopped or the network is down, the site keeps the last data it received.
const base = String(process.env.WP_API_URL || import.meta.env.WP_API_URL || '').replace(/\/+$/, '');
const api = `${base}/wp-json/wp/v2`;

const STATUSES: Status[] = ['Concept', 'In development', 'Live'];

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

const text = (html: string) => decode(String(html || '').replace(/<[^>]*>/g, '')).trim();
const lines = (s: unknown) => String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

async function wp<T>(path: string): Promise<T> {
  const res = await fetch(`${api}${path}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`WordPress ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

async function fetchProducts(): Promise<Product[]> {
  const [posts, terms] = await Promise.all([
    wp<any[]>('/products?per_page=100&orderby=menu_order&order=asc'),
    wp<any[]>('/industries?per_page=100'),
  ]);
  const termById = new Map<number, { name: string; slug: string }>();
  for (const t of terms) termById.set(t.id, { name: decode(t.name), slug: t.slug });

  const out: Product[] = [];
  for (const p of posts) {
    // The REST field is named after the taxonomy's rest_base, which is "industries".
    const term = termById.get(((p.industries ?? p.industry) || [])[0]);
    const ind = term && industries.find((i) => i.name.toLowerCase() === term.name.toLowerCase() || i.slug === term.slug);
    if (!ind) {
      console.warn(`[content] Skipping product "${p.slug}": no matching industry`);
      continue;
    }
    const status = STATUSES.find((s) => s === p.meta?.status) ?? 'Concept';
    out.push({
      slug: p.slug,
      name: text(p.title?.rendered),
      industry: ind.slug,
      tagline: String(p.meta?.tagline || '').trim() || text(p.excerpt?.rendered),
      features: lines(p.meta?.features),
      status,
    });
  }
  return out;
}

async function fetchServices(): Promise<Service[]> {
  const posts = await wp<any[]>('/services?per_page=100&orderby=menu_order&order=asc');
  return posts.map((p) => ({
    slug: p.slug,
    name: text(p.title?.rendered),
    summary: text(p.excerpt?.rendered),
    deliverables: lines(p.meta?.deliverables),
  }));
}

interface Content {
  products: Product[];
  services: Service[];
}

const snapshotPath = join(process.cwd(), 'data', 'wp-snapshot.json');

function readSnapshot(): Content | null {
  try {
    if (!existsSync(snapshotPath)) return null;
    const snap = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    if (Array.isArray(snap.products) && snap.products.length > 0 && Array.isArray(snap.services)) {
      return { products: snap.products, services: snap.services };
    }
  } catch (err) {
    console.warn(`[content] Could not read snapshot: ${(err as Error).message}`);
  }
  return null;
}

function writeSnapshot(content: Content) {
  // Hosted builds only read the committed snapshot, they never write it.
  if (process.env.CF_PAGES || process.env.CI) return;
  try {
    const next = JSON.stringify(content, null, 2) + '\n';
    const prev = existsSync(snapshotPath) ? readFileSync(snapshotPath, 'utf8') : '';
    // Compare ignoring the timestamp so an unchanged load does not touch the file.
    const strip = (t: string) => t.replace(/"savedAt":\s*"[^"]*",?\s*/, '');
    if (strip(prev) === strip(next)) return;
    mkdirSync(dirname(snapshotPath), { recursive: true });
    writeFileSync(snapshotPath, JSON.stringify({ savedAt: new Date().toISOString(), ...content }, null, 2) + '\n');
    console.log('[content] Snapshot updated: data/wp-snapshot.json');
  } catch (err) {
    console.warn(`[content] Could not write snapshot: ${(err as Error).message}`);
  }
}

async function load(): Promise<Content> {
  const snapshot = readSnapshot();
  const fallback: Content = snapshot ?? { products: localProducts, services: localServices };

  if (!base) return fallback;

  try {
    const [products, services] = await Promise.all([fetchProducts(), fetchServices()]);
    if (products.length === 0) {
      console.warn('[content] WordPress returned no products, using saved data');
      return fallback;
    }
    const content: Content = { products, services: services.length > 0 ? services : fallback.services };
    writeSnapshot(content);
    return content;
  } catch (err) {
    console.warn(`[content] WordPress not reachable (${(err as Error).message}), using ${snapshot ? 'saved snapshot' : 'built-in data'}`);
    return fallback;
  }
}

// In dev, re-check WordPress every few seconds so edits show up on refresh. In a build, load once.
const ttl = import.meta.env.DEV ? 3000 : Infinity;
let cache: { at: number; data: Promise<Content> } | undefined;

function content(): Promise<Content> {
  if (!cache || Date.now() - cache.at > ttl) cache = { at: Date.now(), data: load() };
  return cache.data;
}

export async function getProducts(): Promise<Product[]> {
  return (await content()).products;
}

export async function getServices(): Promise<Service[]> {
  return (await content()).services;
}
