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
The site reads products and services from WordPress at build time when `WP_API_URL` is set. If it is not set, or WordPress returns nothing or is unreachable, the build falls back to the local data in `src/data/`, so the site always builds.

1. Copy `wordpress/ftas-content/` to `wp-content/plugins/` on a publicly reachable HTTPS WordPress site and activate it. It adds the `product`, `service` and `case_study` post types and the `industry` and `division` taxonomies (REST: `/wp-json/wp/v2/products`, `/services`, `/industries`).
2. Fill the data once: in WordPress go to Users > Profile > Application Passwords and create a password, then run (PowerShell):
   ```
   $env:WP_API_URL="https://cms.example.com"; $env:WP_USER="admin"; $env:WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"; node scripts/seed-wordpress.mjs
   ```
   This imports the 27 products and 6 services from `scripts/seed-data.json`. Existing items are skipped.
3. In Cloudflare Pages > Settings > Variables, add `WP_API_URL` (the WordPress base URL, no trailing slash) and redeploy.
4. Product fields in WordPress (Custom Fields panel): `status` (Concept / In development / Live), `tagline`, `features` (one per line). Service fields: excerpt is the summary, `deliverables` (one per line). Set the Industry for every product. Order follows the "Order" attribute.
5. Auto rebuild on publish: in Cloudflare Pages > Settings > Builds > Deploy hooks create a hook, then add `define( 'FTAS_DEPLOY_HOOK_URL', '<hook url>' );` to `wp-config.php`.

Without step 5, trigger a redeploy from Cloudflare after editing content.
