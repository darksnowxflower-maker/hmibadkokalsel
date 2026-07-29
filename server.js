const http = require('http');
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'articles.json');
const pendingPath = path.join(__dirname, 'data', 'pending.json');
const newsPath = path.join(__dirname, 'data', 'news.json');
const rootDir = __dirname;
const port = process.env.PORT || 3000;

function sendJSON(response, data, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(data));
}

function sendStatic(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp'
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(response);
}

function readArticles() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveArticles(articles) {
  fs.writeFileSync(dataPath, JSON.stringify(articles, null, 2), 'utf8');
}

function readPending() {
  try {
    const raw = fs.readFileSync(pendingPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function savePending(pending) {
  fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2), 'utf8');
}

function readNews() {
  try {
    const raw = fs.readFileSync(newsPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveNews(newsList) {
  fs.writeFileSync(newsPath, JSON.stringify(newsList, null, 2), 'utf8');
}

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectArticleMetaTags(html, meta) {
  const cleanTitle = escapeAttr(meta.title || 'HMI Badko Kalimantan Selatan');
  const cleanDesc = escapeAttr(meta.description || 'HMI Badko Kalimantan Selatan');
  const cleanImage = escapeAttr(meta.image || '');
  const cleanUrl = escapeAttr(meta.url || '');
  const cleanSiteName = escapeAttr(meta.siteName || 'HMI Badko Kalimantan Selatan');

  const tags = `
  <title>${cleanTitle}</title>
  <meta name="description" content="${cleanDesc}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${cleanSiteName}">
  <meta property="og:title" content="${cleanTitle}">
  <meta property="og:description" content="${cleanDesc}">
  <meta property="og:image" content="${cleanImage}">
  <meta property="og:url" content="${cleanUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${cleanTitle}">
  <meta name="twitter:description" content="${cleanDesc}">
  <meta name="twitter:image" content="${cleanImage}">
  `;

  let result = html
    .replace(/<title>.*?<\/title>/gi, '')
    .replace(/<meta\s+name=["']description["'].*?>/gi, '')
    .replace(/<meta\s+property=["']og:.*?["'].*?>/gi, '')
    .replace(/<meta\s+name=["']twitter:.*?["'].*?>/gi, '');

  if (result.includes('<head>')) {
    return result.replace('<head>', `<head>${tags}`);
  }
  return tags + result;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Endpoint Image Proxy untuk Open Graph Preview
  if ((pathname === '/api/article-image' || pathname === '/article-image') && req.method === 'GET') {
    const id = url.searchParams.get('id');
    const articles = readArticles();
    const pending = readPending();
    const article = [...articles, ...pending].find(a => String(a.id) === String(id));
    const newsList = readNews();
    const newsItem = newsList.find(n => String(n.id) === String(id));

    const item = article || newsItem;
    const imgSrc = item ? (item.headerImageDataUrl || item.headerImage || item.gambar || item.image || '') : '';

    if (imgSrc && imgSrc.startsWith('data:image/')) {
      const matches = imgSrc.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(buffer);
      }
    } else if (imgSrc && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) {
      res.writeHead(302, { 'Location': imgSrc });
      return res.end();
    }

    res.writeHead(302, { 'Location': `http://${req.headers.host}/LOGO%20HMI%20HD%20PNG%20(1).png` });
    return res.end();
  }

  if (pathname === '/articles' && req.method === 'GET') {
    return sendJSON(res, readArticles());
  }

  if (pathname === '/pending' && req.method === 'GET') {
    return sendJSON(res, readPending());
  }

  if (pathname === '/pending' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const article = JSON.parse(body);
        if (!article || !article.id) {
          return sendJSON(res, { error: 'Invalid pending payload' }, 400);
        }
        const pending = readPending();
        pending.unshift(article);
        savePending(pending);
        return sendJSON(res, { success: true });
      } catch (err) {
        return sendJSON(res, { error: 'Invalid JSON payload' }, 400);
      }
    });
    return;
  }

  if (pathname === '/pending' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return sendJSON(res, { error: 'Pending article id is required' }, 400);
    }
    const pending = readPending();
    const filtered = pending.filter(a => a.id !== id);
    if (filtered.length === pending.length) {
      return sendJSON(res, { error: 'Pending article not found' }, 404);
    }
    savePending(filtered);
    return sendJSON(res, { success: true });
  }

  if (pathname === '/article' && req.method === 'GET') {
    const id = url.searchParams.get('id');
    const article = readArticles().find(a => a.id === id);
    if (!article) {
      return sendJSON(res, { error: 'Article not found' }, 404);
    }
    return sendJSON(res, article);
  }

  if (pathname === '/publish' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const article = JSON.parse(body);
        if (!article || !article.id) {
          return sendJSON(res, { error: 'Invalid article payload' }, 400);
        }
        const articles = readArticles();
        const index = articles.findIndex(a => a.id === article.id);
        if (index === -1) {
          articles.unshift(article);
        } else {
          articles[index] = article;
        }
        saveArticles(articles);
        return sendJSON(res, { success: true });
      } catch (err) {
        return sendJSON(res, { error: 'Invalid JSON payload' }, 400);
      }
    });
    return;
  }

  if (pathname === '/article' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return sendJSON(res, { error: 'Article id is required' }, 400);
    }
    const articles = readArticles();
    const filtered = articles.filter(a => a.id !== id);
    if (filtered.length === articles.length) {
      return sendJSON(res, { error: 'Article not found' }, 404);
    }
    saveArticles(filtered);
    return sendJSON(res, { success: true });
  }

  // News Endpoints
  if (pathname === '/news' && req.method === 'GET') {
    return sendJSON(res, readNews());
  }

  if ((pathname === '/news/item' || pathname === '/news') && req.method === 'GET' && url.searchParams.has('id')) {
    const id = url.searchParams.get('id');
    const newsItem = readNews().find(n => String(n.id) === String(id));
    if (!newsItem) {
      return sendJSON(res, { error: 'News not found' }, 404);
    }
    return sendJSON(res, newsItem);
  }

  if (pathname === '/news' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        if (!item || !item.title) {
          return sendJSON(res, { error: 'Invalid news payload' }, 400);
        }
        if (!item.id) {
          item.id = 'b-' + Date.now();
        }
        if (!item.publishedAt) {
          item.publishedAt = new Date().toISOString();
        }
        const newsList = readNews();
        const index = newsList.findIndex(n => String(n.id) === String(item.id));
        if (index === -1) {
          newsList.unshift(item);
        } else {
          newsList[index] = item;
        }
        saveNews(newsList);
        return sendJSON(res, { success: true, news: item });
      } catch (err) {
        return sendJSON(res, { error: 'Invalid JSON payload' }, 400);
      }
    });
    return;
  }

  if (pathname === '/news' && req.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return sendJSON(res, { error: 'News id is required' }, 400);
    }
    const newsList = readNews();
    const filtered = newsList.filter(n => String(n.id) !== String(id));
    if (filtered.length === newsList.length) {
      return sendJSON(res, { error: 'News not found' }, 404);
    }
    saveNews(filtered);
    return sendJSON(res, { success: true });
  }

  let filePath = pathname === '/' ? path.join(rootDir, 'index.html') : path.normalize(path.join(rootDir, '.' + pathname));
  if (!filePath.startsWith(path.normalize(rootDir + path.sep))) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request');
  }

  // Direct injection for detail pages with ?id=...
  const isDetailPath = pathname === '/detail-artikel' || pathname === '/detail-artikel.html' || pathname === '/berita' || pathname === '/berita.html';
  const targetId = url.searchParams.get('id');

  if (isDetailPath && targetId) {
    const actualFile = (pathname.startsWith('/detail-artikel')) ? path.join(rootDir, 'detail-artikel.html') : path.join(rootDir, 'berita.html');
    if (fs.existsSync(actualFile)) {
      let rawHtml = fs.readFileSync(actualFile, 'utf8');
      const articles = readArticles();
      const pending = readPending();
      const article = [...articles, ...pending].find(a => String(a.id) === String(targetId));
      const newsItem = readNews().find(n => String(n.id) === String(targetId));
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      if (article) {
        const title = `${article.judul} - HMI Badko Kalsel`;
        const description = `Oleh: ${article.nama || 'Kader HMI'}${article.asal ? ' (' + article.asal + ')' : ''}. ${article.ringkasan || ''}`.trim();
        const imageUrl = `${baseUrl}/api/article-image?id=${encodeURIComponent(article.id)}`;
        const pageUrl = `${baseUrl}/detail-artikel?id=${encodeURIComponent(article.id)}`;

        rawHtml = injectArticleMetaTags(rawHtml, { title, description, image: imageUrl, url: pageUrl });
      } else if (newsItem) {
        const title = `${newsItem.title || newsItem.judul} - HMI Badko Kalsel`;
        const description = (newsItem.summary || newsItem.content || 'Portal Berita Resmi HMI Badko Kalsel').trim();
        const imageUrl = `${baseUrl}/api/article-image?id=${encodeURIComponent(newsItem.id)}`;
        const pageUrl = `${baseUrl}/berita.html?id=${encodeURIComponent(newsItem.id)}`;

        rawHtml = injectArticleMetaTags(rawHtml, { title, description, image: imageUrl, url: pageUrl });
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(rawHtml);
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendStatic(res, filePath);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
