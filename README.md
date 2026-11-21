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
1. Copy `wordpress/ftas-content/` to `wp-content/plugins/` on the WordPress site and activate it.
2. It adds the `product`, `service` and `case_study` post types and the `industry` and `division` taxonomies, all exposed in the REST API, for example `https://cms.example.com/wp-json/wp/v2/products`.
3. Fields (custom fields panel): product `status`, `tagline`, `features`; service `deliverables`.
4. The frontend currently reads data from `src/data/*.ts`. To switch to WordPress, replace the arrays in those files with a `fetch` to the REST API at build time, and add a WordPress publish webhook that triggers a Cloudflare Pages deploy hook.
