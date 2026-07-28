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

const DEFAULT_NEWS = [
  {
    "id": "b-1722000001",
    "title": "HMI Badko Kalsel Dorong Penguatan Literasi Digital dan Kepemimpinan Kader di Era Transformasi",
    "category": "Informasi",
    "date": "2026-07-27",
    "status": "Terbit",
    "summary": "Badan Koordinasi HMI Kalimantan Selatan secara resmi merilis program strategis penguatan literasi digital dan kepemimpinan kader untuk menjawab tantangan zaman.",
    "content": "Banjarmasin — Badan Koordinasi Himpunan Mahasiswa Islam (HMI Badko) Kalimantan Selatan secara resmi merilis program strategis penguatan literasi digital dan kepemimpinan kader.\n\nLangkah ini diambil sebagai bentuk respon aktif terhadap pesatnya perkembangan teknologi informasi yang menuntut kader HMI untuk tidak hanya adaptif, melainkan menjadi pilar perubahan di tengah masyarakat.\n\nKetua Umum HMI Badko Kalsel menegaskan bahwa literasi sains, etika digital, serta wawasan kebangsaan harus beriringan. Dengan memanfaatkan platform digital resmi organisasi, seluruh informasi dan karya kader dapat diakses dengan cepat, aman, dan transparan oleh masyarakat umum.",
    "image": "",
    "publishedAt": "2026-07-27T08:00:00.000Z"
  },
  {
    "id": "b-1722000002",
    "title": "Agenda Rapat Kerja Daerah HMI Badko Kalimantan Selatan Periode 2026-2028",
    "category": "Agenda",
    "date": "2026-07-26",
    "status": "Terbit",
    "summary": "Rapat Kerja Daerah (Rakerda) HMI Badko Kalsel siap dilaksanakan dengan fokus pada konsolidasi organisasi dan pengabdian masyarakat.",
    "content": "Banjarbaru — Pengurus HMI Badko Kalimantan Selatan mengumumkan agenda Rapat Kerja Daerah (Rakerda) yang akan dihadiri oleh seluruh utusan Cabang se-Kalimantan Selatan.\n\nFocus utama dalam Rakerda ini meliputi perumusan arah gerak organisasi, penguatan sinergi antar cabang, pembentukan lembaga kekaryaan, serta akselerasi program kerja kerakyatan dan lingkungan.\n\nSeluruh kader dan alumni diimbau untuk turut mensukseskan jalannya Rakerda demi kejayaan keislaman dan keindonesiaan.",
    "image": "",
    "publishedAt": "2026-07-26T10:30:00.000Z"
  }
];

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

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const rawPathname = url.pathname;
  const pathname = rawPathname.startsWith('/api') ? rawPathname.slice(4) || '/' : rawPathname;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
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

  if (pathname === '/articles' && request.method === 'GET') {
    const articles = await getArticles(env);
    // Strip field berat dari list: headerImageDataUrl (base64) dan isi (konten panjang)
    // Data lengkap hanya di /article?id=... (halaman detail)
    const lightArticles = articles.map(({ headerImageDataUrl, isi, ...rest }) => rest);
    return jsonResponse(lightArticles);
  }

  if (pathname === '/pending' && request.method === 'GET') {
    const pending = await getPending(env);
    // Strip headerImageDataUrl dari list pending juga
    const lightPending = pending.map(({ headerImageDataUrl, ...rest }) => rest);
    return jsonResponse(lightPending);
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

  return jsonResponse({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
