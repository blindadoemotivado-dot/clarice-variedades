import { chromium } from 'playwright';

async function scrapeShopeeLanding() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    viewport: { width: 1366, height: 900 },
    args: ['--window-position=-2400,-2400', '--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  console.log('Navigating to Shopee...');
  await page.goto('https://shopee.com.br', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Scroll down to load flash sale / trending products
  console.log('Scrolling page...');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(1000);
  }

  const deals = await page.evaluate(() => {
    // Look for all links that have -i. or /product/
    const links = Array.from(document.querySelectorAll('a[href*="-i."], a[href*="/product/"]'));
    return links.map((a) => {
      const img = a.querySelector('img');
      const href = a.href;
      const text = a.innerText.replace(/\n+/g, ' ').trim();
      const imgSrc = img?.src || img?.getAttribute('src') || '';
      return { href, text, imgSrc };
    });
  });

  console.log(`Found ${deals.length} candidate product links on Shopee homepage:`);
  deals.slice(0, 15).forEach((d, idx) => {
    console.log(`[${idx + 1}] Text: "${d.text.slice(0, 50)}" | Link: ${d.href.slice(0, 70)} | Img: ${d.imgSrc.slice(0, 60)}`);
  });

  await browser.close();
}

scrapeShopeeLanding();
