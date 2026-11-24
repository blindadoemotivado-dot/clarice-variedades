import { chromium } from 'playwright';

async function testShopeeProduct() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    viewport: { width: 1280, height: 800 },
  });

  const url =
    'https://shopee.com.br/Kit-8-Recipientes-Organizadores-Herm%C3%A9ticos-Antivazamento-e-Empilh%C3%A1veis-Cozinha-Alimentos-e-Marmita-i.1188935762.22598562360?af_siteid=18318420060&utm_source=an_18318420060&utm_medium=affiliates';

  console.log('Navigating to Shopee product...');
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  console.log('Status:', res.status());
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  const data = await page.evaluate(() => {
    const title = document.title;
    const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.src);
    const productImgs = imgs.filter((s) => s.includes('susercontent.com') || s.includes('cf.shopee'));
    return { title, productImgs };
  });

  console.log('Data:', data);
  await browser.close();
}

testShopeeProduct();
