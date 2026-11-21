import { industries, products as localProducts, type Product, type Status } from '../data/products';
import { services as localServices, type Service } from '../data/services';

// Content source: WordPress REST API when WP_API_URL is set, otherwise the local data files.
// Example: WP_API_URL=https://cms.example.com
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
  const res = await fetch(`${api}${path}`);
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
    const term = termById.get((p.industry || [])[0]);
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

let productsPromise: Promise<Product[]> | undefined;
let servicesPromise: Promise<Service[]> | undefined;

export function getProducts(): Promise<Product[]> {
  productsPromise ??= (async () => {
    if (!base) return localProducts;
    try {
      const list = await fetchProducts();
      if (list.length > 0) return list;
      console.warn('[content] WordPress returned no products, using local data');
    } catch (err) {
      console.warn(`[content] Could not load products from WordPress, using local data: ${(err as Error).message}`);
    }
    return localProducts;
  })();
  return productsPromise;
}

export function getServices(): Promise<Service[]> {
  servicesPromise ??= (async () => {
    if (!base) return localServices;
    try {
      const list = await fetchServices();
      if (list.length > 0) return list;
      console.warn('[content] WordPress returned no services, using local data');
    } catch (err) {
      console.warn(`[content] Could not load services from WordPress, using local data: ${(err as Error).message}`);
    }
    return localServices;
  })();
  return servicesPromise;
}
