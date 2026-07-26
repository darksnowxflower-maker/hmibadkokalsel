# Server-side Article Data for HMI Website

This simple Node.js server serves the website files and exposes article data from `data/articles.json`.

## Endpoints

- `GET /articles` - returns all published articles
- `GET /article?id=<id>` - returns a single article by ID
- `POST /publish` - publishes/updates an article (JSON request body)
- `DELETE /article?id=<id>` - deletes a published article by ID
- `GET /pending` - returns all pending submissions
- `POST /pending` - submits a new pending article for admin review
- `DELETE /pending?id=<id>` - deletes a pending submission by ID

## Run

1. Install Node.js if not already installed.
2. Run `node server.js` from the project root.
3. Open `http://localhost:3000/artikel.html` or `http://localhost:3000/index.html` in your browser.

## Notes

- The server serves both the static HTML/CSS/JS files and the article API.
- Published articles are persisted in `data/articles.json`.
- For deployment on Cloudflare, this local Node server cannot run directly.
- Use the new `worker.js` + `wrangler.toml` Cloudflare Worker implementation for a Cloudflare-compatible API.
