# Cloudflare Deployment for HMI Website

This project includes a Cloudflare Worker backend to run the article API together with the static frontend on one Cloudflare host.

## What changed
- Added `wrangler.toml` for a Cloudflare Worker project.
- Added `worker.js` implementing API endpoints:
  - `GET /articles`
  - `GET /article?id=<id>`
  - `GET /pending`
  - `POST /pending`
  - `POST /publish`
  - `DELETE /pending?id=<id>`
  - `DELETE /article?id=<id>`
- The Worker uses KV namespaces `ARTICLES_KV` and `PENDING_KV`.

## Setup
1. Install Wrangler: `npm install -g wrangler`.
2. Login to Cloudflare: `wrangler login`.
3. Create KV namespaces in Cloudflare (or use the titles from `wrangler.toml`).
4. Deploy:
   - `wrangler publish`

## Notes
- Cloudflare Pages alone cannot run `server.js` or store JSON files on disk.
- Use the Worker + KV approach for a single Cloudflare-hosted frontend + API.
- Keep the static files in the same project and point the frontend to the same origin.
