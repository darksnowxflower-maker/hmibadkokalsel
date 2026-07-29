export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const targetId = url.searchParams.get('id');

  // Fetch static asset cleanly without query params to avoid asset pipeline loops
  const cleanUrl = `${url.origin}/detail-artikel.html`;
  const assetRes = await env.ASSETS.fetch(new Request(cleanUrl));
  if (!assetRes.ok || !targetId) {
    return assetRes;
  }

  let rawHtml = await assetRes.text();
  if (!rawHtml || !rawHtml.includes('<html')) {
    return assetRes;
  }

  try {
    // Fetch article data from internal API
    const apiRes = await fetch(`${url.origin}/api/article?id=${encodeURIComponent(targetId)}`);
    if (apiRes.ok) {
      const article = await apiRes.json();
      if (article && !article.error && article.judul) {
        const escapeAttr = (str) => String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const title = escapeAttr(`${article.judul} - HMI Badko Kalsel`);
        const description = escapeAttr(`Oleh: ${article.nama || 'Kader HMI'}${article.asal ? ' (' + article.asal + ')' : ''}. ${article.ringkasan || ''}`.trim());
        const imageUrl = escapeAttr(`${url.origin}/api/article-image?id=${encodeURIComponent(article.id)}`);
        const pageUrl = escapeAttr(`${url.origin}/detail-artikel?id=${encodeURIComponent(article.id)}`);

        // Inject Open Graph and Twitter Card tags into HTML head
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
