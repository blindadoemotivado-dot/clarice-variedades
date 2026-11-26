import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 360, height: 800, name: 'Android 360px' },
  { width: 390, height: 844, name: 'Mobile 390px' },
  { width: 430, height: 932, name: 'Mobile 430px' },
];

for (const vp of VIEWPORTS) {
  test(`deve renderizar sem overflow horizontal (scrollWidth <= clientWidth) em ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/', { waitUntil: 'load' });

    // Aguarda o header e catálogo estarem renderizados
    await page.waitForSelector('header');
    await page.waitForTimeout(2000);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);

    // Valida que a grade principal renderiza no máximo 16 produtos inicialmente
    const productCards = await page.locator('#catalogo-completo article[id^="produto-"]').count();
    expect(productCards).toBeLessThanOrEqual(16);
  });

  test(`deve renderizar a rota /admin sem overflow horizontal em ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/admin', { waitUntil: 'load' });

    // Aguarda o container principal do admin ser montado
    await page.waitForTimeout(2000);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });
}
