const http = require('http');
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, 'data', 'articles.json');
const pendingPath = path.join(__dirname, 'data', 'pending.json');
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

  let filePath = pathname === '/' ? path.join(rootDir, 'index.html') : path.normalize(path.join(rootDir, '.' + pathname));
  if (!filePath.startsWith(path.normalize(rootDir + path.sep))) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request');
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
