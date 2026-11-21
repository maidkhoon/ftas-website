# FTAS website (Phase 1)

Astro + TypeScript frontend, designed to deploy on Cloudflare Pages. WordPress is the optional headless CMS.

## Run
```
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Where to edit
- `src/data/site.ts`: company name, tagline, email, nav
- `src/data/products.ts`: all 27 products, industries and statuses (Concept / In development / Live)
- `src/data/services.ts`: services and divisions
- `src/pages/`: pages (privacy and terms are placeholders, get them reviewed legally)
- `astro.config.mjs` and `public/robots.txt`: replace `https://example.com` with the real domain

## Contact form
`functions/api/contact.ts` is a Cloudflare Pages Function. Set the `CONTACT_WEBHOOK_URL` environment variable in Cloudflare Pages.

## WordPress (headless CMS)

### How data is loaded
1. WordPress REST API, when `WP_API_URL` is set and reachable.
2. Otherwise the last good copy in `data/wp-snapshot.json`. This file is written automatically every time WordPress is read successfully, so the site keeps the last data it received if WordPress is stopped or the network is down.
3. Otherwise the built-in data in `src/data/`.

Once `data/wp-snapshot.json` exists it takes priority over `src/data/products.ts` and `src/data/services.ts`. Commit it, so hosted builds (Cloudflare, which cannot reach your localhost) use the same data.

### Local setup (Windows)
1. Install Local (https://localwp.com) and create a site, or use XAMPP. Open the site's admin and go to Settings > Permalinks > choose "Post name" (needed for `/wp-json`).
2. Copy the folder `wordpress/ftas-content/` into the WordPress folder `wp-content/plugins/` and activate "FTAS Content Model".
3. Application password: Users > Profile > Application Passwords. If WordPress refuses it on plain http, add `define( 'WP_ENVIRONMENT_TYPE', 'local' );` to `wp-config.php`.
4. Import the starting data once (PowerShell, from this project's folder):
   ```
   $env:WP_API_URL="http://localhost:8080"; $env:WP_USER="admin"; $env:WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"; node scripts/seed-wordpress.mjs
   ```
5. Copy `.env.example` to `.env` and set `WP_API_URL` to your local site URL.
6. Run `npm run dev`. In dev the site re-checks WordPress every few seconds, so edits show after a refresh.

### Publishing to the live site
Edit content in local WordPress, check it in `npm run dev`, then commit and push `data/wp-snapshot.json` (and other changes). Cloudflare rebuilds from the snapshot.

```
git add data/wp-snapshot.json
git commit -m "Update content"
git push
```

### Fields in WordPress
Product: `status` (Concept / In development / Live), `tagline`, `features` (one per line), and the Industry. Service: excerpt is the summary, `deliverables` (one per line). Order follows the "Order" attribute.

### Using a hosted WordPress later
Set `WP_API_URL` in Cloudflare Pages > Settings > Variables, and optionally add `define( 'FTAS_DEPLOY_HOOK_URL', '<Cloudflare deploy hook URL>' );` to `wp-config.php` to rebuild on publish.
