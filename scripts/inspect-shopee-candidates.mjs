import { chromium } from 'playwright';

const candidateUrls = [
  { url: 'https://shopee.com.br/product/951290141/19398467992', cat: 'Casa & Cozinha' },
  { url: 'https://shopee.com.br/product/480010619/58255826265', cat: 'Beleza & Cuidados' },
  { url: 'https://shopee.com.br/product/1039577544/23394663253', cat: 'Casa & Cozinha' },
  { url: 'https://shopee.com.br/product/1584047662/58209101401', cat: 'Casa & Cozinha' },
];

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    viewport: { width: 1280, height: 800 },
  });

  const verifiedShopee = [];

  for (let i = 0; i < candidateUrls.length; i++) {
    const c = candidateUrls[i];
    const cleanUrl = c.url.split('?')[0];

    try {
      console.log(`\n[${i + 1}] Testing ${cleanUrl}...`);
      const res = await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3500);

      const status = res.status();
      const pageTitle = await page.title();
      const pageUrl = page.url();

      const extracted = await page.evaluate(() => {
        // Encontra o título na página ou meta tags
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const h1Title = document.querySelector('h1, [class*="product-name"], [class*="title"]')?.innerText;
        const metaImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const allImgs = Array.from(document.querySelectorAll('img')).map((i) => i.src);
        const suserImg = metaImg || allImgs.find((s) => s.includes('down-br.img.susercontent.com') || s.includes('susercontent.com/file/'));

        // Preço
        const priceText = document.querySelector('[class*="price"], [class*="Price"]')?.innerText || '';
        return {
          title: (h1Title || metaTitle || document.title).replace(/\|\s*Shopee.*$/i, '').trim(),
          img: suserImg,
          priceText: priceText.replace(/\n+/g, ' ').trim(),
        };
      });

      console.log(`   Status: ${status} | Title: "${extracted.title.slice(0, 50)}"`);
      console.log(`   Img: ${extracted.img?.slice(0, 70)}`);

      if (extracted.img) {
        // Valida se a imagem responde HTTP 200
        const imgCheck = await fetch(extracted.img);
        if (imgCheck.status === 200) {
          console.log(`   ✅ Imagem HTTP 200 OK (${imgCheck.headers.get('content-length')} bytes)`);
          verifiedShopee.push({
            url: cleanUrl,
            title: extracted.title,
            image: extracted.img,
            category: c.cat,
          });
        } else {
          console.log(`   ⚠️ Imagem status ${imgCheck.status}`);
        }
      }
    } catch (e) {
      console.log('   ❌ Error:', e.message);
    }
  }

  console.log(`\n🎉 Total verified Shopee: ${verifiedShopee.length}`);
  console.log(JSON.stringify(verifiedShopee, null, 2));

  await browser.close();
}

main();
