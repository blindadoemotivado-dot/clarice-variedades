import { queryShopeeGraphQL } from './sincronizar-shopee.mjs';

async function testShopeeApi() {
  const appId = process.env.SHOPEE_APP_ID || '18364201389';
  const secret = process.env.SHOPEE_SECRET || 'clarice-achadinhos';
  console.log('Testing Shopee API with appId:', appId, 'secret set:', !!secret);

  const query = `
    query GetShopeeOfferList($page: Int, $limit: Int) {
      productOfferV2(page: $page, limit: $limit) {
        nodes {
          itemId
          productName
          productLink
          imageUrl
          price
          priceMin
          priceMax
        }
      }
    }
  `;

  try {
    const res = await queryShopeeGraphQL(appId, secret, query, { page: 1, limit: 10 });
    console.log('Shopee API response:', JSON.stringify(res, null, 2));
  } catch (e) {
    console.log('Shopee API error:', e.message);
  }
}

testShopeeApi();
