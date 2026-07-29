export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetId = url.searchParams.get('id');

  if (!targetId) {
    return Response.redirect(`${url.origin}/LOGO%20HMI%20HD%20PNG%20(1).png`, 302);
  }

  try {
    const apiRes = await fetch(`${url.origin}/api/article?id=${encodeURIComponent(targetId)}`);
    if (apiRes.ok) {
      const article = await apiRes.json();
      const imgSrc = article ? (article.headerImageDataUrl || article.headerImage || article.gambar || article.image || '') : '';

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
    }
  } catch (err) {}

  return Response.redirect(`${url.origin}/LOGO%20HMI%20HD%20PNG%20(1).png`, 302);
}
