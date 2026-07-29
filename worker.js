const DEFAULT_ARTICLES = [
  {
    "id": "meratus",
    "nama": "Kader HMI",
    "asal": "HMI Badko Kalsel",
    "judul": "Meratus: Merawat Alam dan Identitas Lokal",
    "kategori": "Lingkungan",
    "ringkasan": "Kajian tentang hubungan kader HMI dengan alam Meratus sebagai sumber inspirasi dan semangat konservasi.",
    "isi": "Hutan Meratus adalah saksi perjuangan panjang masyarakat Kalimantan Selatan. Kader HMI dituntut untuk menjaga kelestariannya melalui literasi lingkungan, riset lokal, dan aksi pengabdian yang berpijak pada nilai keislaman dan kebangsaan. Alam bukan hanya ruang, melainkan sanad kultural yang harus diwariskan kepada generasi berikut.",
    "publishedAt": "2026-07-26T00:00:00.000Z"
  },
  {
    "id": "alam",
    "nama": "Kader HMI",
    "asal": "HMI Badko Kalsel",
    "judul": "Alam sebagai Guru: Refleksi Kader terhadap Ekosistem dan Etika",
    "kategori": "Keislaman",
    "ringkasan": "Tulisan reflektif tentang bagaimana alam mengajarkan etika pengelolaan sumber daya dan merawat kemaslahatan bersama.",
    "isi": "Alam memberi pelajaran kesabaran, rekonsiliasi, dan kedermawanan. Sebagai kader, kita belajar bahawa etika ilmiah dan religi bertemu dalam menjaga keseimbangan lingkungan. Langkah kecil konservasi, seperti menghormati sumber air dan merawat hutan, adalah cermin dari komitmen kita terhadap umat dan negeri.",
    "publishedAt": "2026-07-26T00:00:00.000Z"
  }
];

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

const DEFAULT_NEWS = [];

async function getArticles(storage) {
  const articles = await readKV(storage.ARTICLES_KV, 'articles', null);
  if (articles === null || !Array.isArray(articles)) {
    // Initialize dengan DEFAULT_ARTICLES hanya jika KV belum ada/null
    await writeKV(storage.ARTICLES_KV, 'articles', DEFAULT_ARTICLES);
    return DEFAULT_ARTICLES;
  }
  return articles;
}

async function getNews(storage) {
  // Gunakan storage.NEWS_KV jika diset, atau fallback ke storage.ARTICLES_KV key 'news'
  const kv = storage.NEWS_KV || storage.ARTICLES_KV;
  const news = await readKV(kv, 'news', null);
  if (news === null || !Array.isArray(news)) {
    await writeKV(kv, 'news', DEFAULT_NEWS);
    return DEFAULT_NEWS;
  }
  return news;
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

async function handleRequest(request, env) {
  try {
    const url = new URL(request.url);
    const rawPathname = url.pathname;
    let pathname = rawPathname.startsWith('/api') ? rawPathname.slice(4) || '/' : rawPathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Endpoint Image Proxy untuk Open Graph Preview
    if ((pathname === '/api/article-image' || pathname === '/article-image') && request.method === 'GET') {
      const id = url.searchParams.get('id');
      const articles = await getArticles(env);
      const article = articles.find(a => String(a.id) === String(id));
      const newsList = await getNews(env);
      const newsItem = newsList.find(n => String(n.id) === String(id));

      const item = article || newsItem;
      const imgSrc = item ? (item.headerImageDataUrl || item.headerImage || item.gambar || item.image || '') : '';

      if (imgSrc && imgSrc.startsWith('data:image/')) {
        const matches = imgSrc.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          return new Response(bytes, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': bytes.length.toString(),
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } else if (imgSrc && (imgSrc.startsWith('http://') || imgSrc.startsWith('https://'))) {
        return Response.redirect(imgSrc, 302);
      }

      return Response.redirect(`${url.origin}/LOGO%20HMI%20HD%20PNG%20(1).png`, 302);
    }

    // Dynamic Open Graph HTML injection untuk detail artikel / berita
    const isDetailPath = rawPathname === '/detail-artikel' || rawPathname === '/detail-artikel.html' || rawPathname === '/berita' || rawPathname === '/berita.html';
    const targetId = url.searchParams.get('id');

    if (isDetailPath && targetId && env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.ok) {
        let rawHtml = await assetRes.text();
        const articles = await getArticles(env);
        const article = articles.find(a => String(a.id) === String(targetId));
        const newsList = await getNews(env);
        const newsItem = newsList.find(n => String(n.id) === String(targetId));

        const baseUrl = url.origin;
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

        return new Response(rawHtml, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cache-Control': 'no-cache'
          }
        });
      }
    }

  // Reset endpoint untuk maintenance
  if (pathname === '/reset-articles' && request.method === 'POST') {
    const token = new URL(request.url).searchParams.get('token');
    if (token !== 'admin123') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    try {
      await writeKV(env.ARTICLES_KV, 'articles', DEFAULT_ARTICLES);
      return jsonResponse({ success: true, message: 'Articles reset to default', count: DEFAULT_ARTICLES.length });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }

  if (pathname === '/reset-news' && (request.method === 'POST' || request.method === 'GET')) {
    try {
      const kv = env.NEWS_KV || env.ARTICLES_KV;
      await writeKV(kv, 'news', []);
      return jsonResponse({ success: true, message: 'News reset to empty array', count: 0 });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }

  if (pathname === '/articles' && request.method === 'GET') {
    const articles = await getArticles(env);
    // Hanya strip field isi (konten panjang) dari daftar ringkasan, simpan headerImageDataUrl agar foto kartu artikel dapat muncul
    const lightArticles = articles.map(({ isi, ...rest }) => rest);
    return jsonResponse(lightArticles);
  }

  if (pathname === '/pending' && request.method === 'GET') {
    const pending = await getPending(env);
    // Kembalikan pending lengkap termasuk headerImageDataUrl agar foto terbaca di admin moderasi saat disetujui (approve)
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
    if (filtered.length !== articles.length) {
      await writeKV(env.ARTICLES_KV, 'articles', filtered);
    }
    return jsonResponse({ success: true });
  }

  // === NEWS ENDPOINTS ===
  if (pathname === '/news' && request.method === 'GET') {
    const newsList = await getNews(env);
    return jsonResponse(newsList);
  }

  if ((pathname === '/news/item' || pathname === '/news') && request.method === 'GET' && url.searchParams.has('id')) {
    const id = url.searchParams.get('id');
    const newsList = await getNews(env);
    const newsItem = newsList.find(n => String(n.id) === String(id));
    if (!newsItem) {
      return jsonResponse({ error: 'News not found' }, 404);
    }
    return jsonResponse(newsItem);
  }

  if (pathname === '/news' && request.method === 'POST') {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }
    if (!payload || !payload.title) {
      return jsonResponse({ error: 'Invalid news payload' }, 400);
    }
    const newsList = await getNews(env);
    const newsItem = {
      id: payload.id || `b-${Date.now()}`,
      title: payload.title || '',
      category: payload.category || 'Informasi',
      date: payload.date || new Date().toISOString().split('T')[0],
      status: payload.status || 'Terbit',
      summary: payload.summary || '',
      content: payload.content || '',
      image: payload.image || '',
      publishedAt: payload.publishedAt || new Date().toISOString()
    };
    const index = newsList.findIndex(n => String(n.id) === String(newsItem.id));
    if (index >= 0) {
      newsList[index] = newsItem;
    } else {
      newsList.unshift(newsItem);
    }
    const kv = env.NEWS_KV || env.ARTICLES_KV;
    await writeKV(kv, 'news', newsList);
    return jsonResponse({ success: true, news: newsItem });
  }

  if (pathname === '/news' && request.method === 'DELETE') {
    const id = url.searchParams.get('id');
    if (!id) {
      return jsonResponse({ error: 'News id is required' }, 400);
    }
    const newsList = await getNews(env);
    const filtered = newsList.filter(n => String(n.id) !== String(id));
    if (filtered.length !== newsList.length) {
      const kv = env.NEWS_KV || env.ARTICLES_KV;
      await writeKV(kv, 'news', filtered);
    }
    return jsonResponse({ success: true });
  }

  if (env.ASSETS) {
    return env.ASSETS.fetch(request);
  }

  return jsonResponse({ error: 'Not found' }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
