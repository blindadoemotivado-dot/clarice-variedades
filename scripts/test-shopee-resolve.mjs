import { chromium } from 'playwright';

async function testShopeeShortlinks() {
  const shortlinks = [
    'https://s.shopee.com.br/6V8jK9L0Xp',
    'https://s.shopee.com.br/8ACwQe4T1m',
    'https://s.shopee.com.br/4pxMvK1z9L',
    'https://s.shopee.com.br/1LMbY8R4uQ',
    'https://s.shopee.com.br/7V2eNw1pL0',
  ];

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    viewport: { width: 1280, height: 800 },
  });

  for (const url of shortlinks) {
    try {
      console.log('\nNavigating to:', url);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());
      const data = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.src);
        const suserImg = imgs.find((src) => src.includes('susercontent.com') || src.includes('cf.shopee'));
        return {
          title: document.title,
          url: window.location.href,
          img: suserImg,
          allImgs: imgs.filter((s) => s.includes('susercontent.com')).slice(0, 3),
        };
      });
      console.log('Data:', data);
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  await browser.close();
}

testShopeeShortlinks();
