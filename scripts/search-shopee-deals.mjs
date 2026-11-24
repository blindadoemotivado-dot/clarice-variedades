import { chromium } from 'playwright';

async function searchShopeeDeals() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    viewport: { width: 1366, height: 800 },
  });

  const page = await context.newPage();

  const searchTerms = [
    'panela ceramica antiaderente',
    'potes hermeticos vidro',
    'mop giratorio',
    'garrafa termica inox 1l',
    'organizador acrilico geladeira',
  ];

  console.log('Searching Shopee...');
  for (const term of searchTerms) {
    try {
      const url = `https://shopee.com.br/search?keyword=${encodeURIComponent(term)}`;
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);

      const items = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="-i."]'));
        return links.slice(0, 5).map((a) => {
          const img = a.querySelector('img');
          const title = a.querySelector('img')?.alt || a.querySelector('[data-sqe="name"]')?.innerText || a.innerText;
          return {
            href: a.href,
            title: title?.trim(),
            imgSrc: img?.src || img?.getAttribute('src'),
          };
        });
      });

      console.log(`Found ${items.length} items for "${term}":`);
      items.forEach((it) => console.log('  -', it.title?.slice(0, 40), '|', it.href, '| img:', it.imgSrc?.slice(0, 50)));
    } catch (e) {
      console.log(`Error searching "${term}":`, e.message);
    }
  }

  await browser.close();
}

searchShopeeDeals();
