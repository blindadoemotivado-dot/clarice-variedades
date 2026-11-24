async function checkShopee() {
  const p1 = 'https://shopee.com.br/product/951290141/19398467992';
  const p2 = 'https://shopee.com.br/product/480010619/58255826265';
  for (const p of [p1, p2]) {
    try {
      const res = await fetch(p, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        }
      });
      const html = await res.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const ogTitle = (html.match(/<meta property="og:title" content="([^"]+)"/) || [])[1];
      const ogImage = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
      console.log('Product:', p);
      console.log('Title:', ogTitle || (titleMatch && titleMatch[1]));
      console.log('Image:', ogImage);
      if (ogImage) {
        const imgRes = await fetch(ogImage, { method: 'HEAD' });
        console.log('Image HTTP status:', imgRes.status);
      }
    } catch(e) {
      console.error(e.message);
    }
  }
}
checkShopee();
