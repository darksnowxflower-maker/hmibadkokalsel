export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetId = url.searchParams.get('id');

  const isDetail = url.pathname === '/detail-artikel' || url.pathname === '/detail-artikel.html' || url.pathname === '/berita' || url.pathname === '/berita.html';

  if (!isDetail || !targetId) {
    return context.next();
  }

  // Get static page response from Cloudflare Pages asset pipeline
  const response = await context.next();
  if (!response.ok) return response;

  let rawHtml = await response.text();

  try {
    let article = null;
    if (env.ARTICLES_KV) {
      try {
        const articlesRaw = await env.ARTICLES_KV.get('articles');
        const pendingRaw = env.PENDING_KV ? await env.PENDING_KV.get('pending') : null;
        const articles = articlesRaw ? JSON.parse(articlesRaw) : [];
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        article = [...articles, ...pending].find(a => String(a.id) === String(targetId));
      } catch (e) {}
    }
    
    if (!article) {
      const apiRes = await fetch(`${url.origin}/api/article?id=${encodeURIComponent(targetId)}`);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && !data.error) article = data;
      }
    }

    if (article && article.judul) {
      const escapeAttr = (str) => String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const title = escapeAttr(`${article.judul} - HMI Badko Kalsel`);
      const description = escapeAttr(`Oleh: ${article.nama || 'Kader HMI'}${article.asal ? ' (' + article.asal + ')' : ''}. ${article.ringkasan || ''}`.trim());
      const imageUrl = escapeAttr(`${url.origin}/api/article-image?id=${encodeURIComponent(article.id)}`);
      const pageUrl = escapeAttr(`${url.origin}${url.pathname}?id=${encodeURIComponent(article.id)}`);

      rawHtml = rawHtml
        .replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`)
        .replace(/<meta\s+name=["']description["'].*?>/gi, `<meta name="description" content="${description}">`)
        .replace(/<meta\s+property=["']og:title["'].*?>/gi, `<meta property="og:title" content="${title}">`)
        .replace(/<meta\s+property=["']og:description["'].*?>/gi, `<meta property="og:description" content="${description}">`)
        .replace(/<meta\s+property=["']og:image["'].*?>/gi, `<meta property="og:image" content="${imageUrl}">`)
        .replace(/<meta\s+property=["']og:url["'].*?>/gi, `<meta property="og:url" content="${pageUrl}">`)
        .replace(/<meta\s+name=["']twitter:title["'].*?>/gi, `<meta name="twitter:title" content="${title}">`)
        .replace(/<meta\s+name=["']twitter:description["'].*?>/gi, `<meta name="twitter:description" content="${description}">`)
        .replace(/<meta\s+name=["']twitter:image["'].*?>/gi, `<meta name="twitter:image" content="${imageUrl}">`);
    }
  } catch (err) {}

  return new Response(rawHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-cache, must-revalidate'
    }
  });
}
