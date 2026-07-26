const DEFAULT_ARTICLES = [];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      ...CORS_HEADERS
    }
  });
}

async function readKV(kv, key, fallback = null) {
  const value = await kv.get(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function writeKV(kv, key, data) {
  await kv.put(key, JSON.stringify(data));
}

function createArticleId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getArticles(storage) {
  const articles = await readKV(storage.ARTICLES_KV, 'articles', []);
  if (!articles || !articles.length) {
    await writeKV(storage.ARTICLES_KV, 'articles', DEFAULT_ARTICLES);
    return DEFAULT_ARTICLES;
  }
  return Array.isArray(articles) ? articles : [];
}

async function getPending(storage) {
  const pending = await readKV(storage.PENDING_KV, 'pending', []);
  return Array.isArray(pending) ? pending : [];
}

function createHeaders() {
  return {
    ...CORS_HEADERS,
    'Content-Type': 'application/json;charset=UTF-8'
  };
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const rawPathname = url.pathname;
  const pathname = rawPathname.startsWith('/api') ? rawPathname.slice(4) || '/' : rawPathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (pathname === '/articles' && request.method === 'GET') {
    const articles = await getArticles(env);
    return jsonResponse(articles);
  }

  if (pathname === '/pending' && request.method === 'GET') {
    const pending = await getPending(env);
    return jsonResponse(pending);
  }

  if (pathname === '/article' && request.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: 'Article id is required' }, 400);
    }
    const articles = await getArticles(env);
    const article = articles.find((item) => item.id === id);
    if (!article) {
      return jsonResponse({ error: 'Article not found' }, 404);
    }
    return jsonResponse(article);
  }

  if (pathname === '/pending' && request.method === 'POST') {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }
    const pending = await getPending(env);
    const article = {
      id: payload.id || createArticleId(),
      nama: payload.nama || 'Anonim',
      asal: payload.asal || '',
      email: payload.email || '',
      whatsapp: payload.whatsapp || '',
      judul: payload.judul || 'Tanpa judul',
      kategori: payload.kategori || 'Umum',
      ringkasan: payload.ringkasan || '',
      isi: payload.isi || '',
      headerImageDataUrl: payload.headerImageDataUrl || '',
      submittedAt: payload.submittedAt || new Date().toISOString(),
      status: 'pending'
    };
    pending.unshift(article);
    await writeKV(env.PENDING_KV, 'pending', pending);
    return jsonResponse({ success: true, article });
  }

  if (pathname === '/publish' && request.method === 'POST') {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }
    if (!payload || !payload.id) {
      return jsonResponse({ error: 'Invalid article payload' }, 400);
    }
    const articles = await getArticles(env);
    const article = {
      ...payload,
      publishedAt: payload.publishedAt || new Date().toISOString(),
      status: 'published'
    };
    const index = articles.findIndex((item) => item.id === article.id);
    if (index >= 0) {
      articles[index] = article;
    } else {
      articles.unshift(article);
    }
    await writeKV(env.ARTICLES_KV, 'articles', articles);
    const pending = await getPending(env);
    const filteredPending = pending.filter((item) => item.id !== article.id);
    if (filteredPending.length !== pending.length) {
      await writeKV(env.PENDING_KV, 'pending', filteredPending);
    }
    return jsonResponse({ success: true, article });
  }

  if (pathname === '/pending' && request.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: 'Pending article id is required' }, 400);
    }
    const pending = await getPending(env);
    const filtered = pending.filter((item) => item.id !== id);
    if (filtered.length !== pending.length) {
      await writeKV(env.PENDING_KV, 'pending', filtered);
    }
    return jsonResponse({ success: true });
  }

  if (pathname === '/article' && request.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: 'Article id is required' }, 400);
    }
    const articles = await getArticles(env);
    const filtered = articles.filter((item) => item.id !== id);
    if (filtered.length === articles.length) {
      return jsonResponse({ error: 'Article not found' }, 404);
    }
    await writeKV(env.ARTICLES_KV, 'articles', filtered);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
