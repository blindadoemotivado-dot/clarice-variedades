import crypto from 'node:crypto';

export interface ShopeeOpenApiConfig {
  appId: string;
  secret: string;
}

export interface ShopeeProductOffer {
  itemId: string;
  title: string;
  imageUrl: string;
  currentPrice: string;
  originalPrice?: string;
  offerLink?: string;
}

const SHOPEE_GRAPHQL_ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';

/**
 * Extrai o itemId numérico de qualquer URL da Shopee (resolvida ou canônica).
 */
export function extractShopeeItemId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Formato: /opaanlp/<shopId>/<itemId> ou /product/<shopId>/<itemId>
  const pathMatch = url.match(/(?:\/opaanlp\/\d+\/|\/product\/\d+\/|-i\.\d+\.)(\d+)/i);
  if (pathMatch?.[1]) {
    return pathMatch[1];
  }

  // Formato: ?itemid=<itemId> ou &itemId=<itemId>
  const queryMatch = url.match(/[?&](?:item_?id|itemid)=(\d+)/i);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  return null;
}

/**
 * Gera o cabeçalho Authorization oficial da Shopee Affiliate Open API:
 * SHA256(AppId + Timestamp + Payload + Secret)
 */
export function buildShopeeAuthHeader(options: {
  appId: string;
  secret: string;
  payload: string;
  timestamp?: number;
}): { authorization: string; timestamp: number } {
  const { appId, secret, payload } = options;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const factor = `${appId}${timestamp}${payload}${secret}`;
  const signature = crypto.createHash('sha256').update(factor).digest('hex');

  const authorization = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;
  return { authorization, timestamp };
}

/**
 * Consulta a Shopee Affiliate Open API (GraphQL) buscando dados oficiais do produto via itemId.
 */
export async function fetchShopeeProductOffer(
  itemId: string | number,
  config: ShopeeOpenApiConfig
): Promise<ShopeeProductOffer | null> {
  const appId = config.appId?.trim();
  const secret = config.secret?.trim();
  if (!appId || !secret || !itemId) return null;

  const numericItemId = typeof itemId === 'number' ? itemId : parseInt(String(itemId), 10);
  if (!numericItemId || isNaN(numericItemId)) return null;

  const query = `
    query ProductOfferV2($itemId: Long) {
      productOfferV2(itemId: $itemId) {
        nodes {
          itemId
          productName
          imageUrl
          priceMin
          priceMax
          priceDiscountRate
          offerLink
        }
      }
    }
  `.trim();

  const bodyObj = {
    query,
    variables: {
      itemId: numericItemId,
    },
  };

  const payload = JSON.stringify(bodyObj);
  const { authorization } = buildShopeeAuthHeader({
    appId,
    secret,
    payload,
  });

  try {
    const response = await fetch(SHOPEE_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      console.warn(
        `[shopeeOpenApi] Falha na requisição Shopee GraphQL: HTTP ${response.status}`
      );
      return null;
    }

    const json = await response.json();
    const nodes = json?.data?.productOfferV2?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return null;
    }

    const node = nodes[0];
    if (!node || !node.productName) {
      return null;
    }

    const curNum =
      typeof node.priceMin === 'number'
        ? node.priceMin
        : parseFloat(String(node.priceMin || '0'));
    const maxNum =
      typeof node.priceMax === 'number'
        ? node.priceMax
        : parseFloat(String(node.priceMax || '0'));
    const discountRate =
      typeof node.priceDiscountRate === 'number'
        ? node.priceDiscountRate
        : parseFloat(String(node.priceDiscountRate || '0'));

    let currentPrice = '';
    if (curNum > 0) {
      currentPrice = curNum.toFixed(2).replace('.', ',');
    }

    let originalPrice: string | undefined = undefined;
    if (maxNum > curNum && maxNum > 0) {
      originalPrice = maxNum.toFixed(2).replace('.', ',');
    } else if (discountRate > 0 && curNum > 0) {
      const rateFraction = discountRate > 1 ? discountRate / 100 : discountRate;
      if (rateFraction < 1) {
        const calculatedOrig = curNum / (1 - rateFraction);
        originalPrice = calculatedOrig.toFixed(2).replace('.', ',');
      }
    }

    return {
      itemId: String(node.itemId || numericItemId),
      title: String(node.productName).trim(),
      imageUrl: String(node.imageUrl || ''),
      currentPrice,
      originalPrice,
      offerLink: node.offerLink ? String(node.offerLink) : undefined,
    };
  } catch (err: any) {
    console.warn(`[shopeeOpenApi] Erro ao consultar Shopee GraphQL: ${err?.message}`);
    return null;
  }
}
