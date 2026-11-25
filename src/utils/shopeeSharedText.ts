/**
 * Utilitário de Extração Inteligente de Texto Compartilhado do App da Shopee
 *
 * Formato padrão gerado pelo botão "Compartilhar > Copiar Link" no app da Shopee:
 * "Confira [Título do Produto] por R$2.707,69! Encontre na Shopee agora! https://s.shopee.com.br/40iNZkIFU7"
 * ou
 * "Confira Beliche Casinha... por R$2.707,69! Encontre na Shopee agora! https://s.shopee.com.br/40iNZkIFU7"
 * ou
 * "De R$ 3.500,00 por R$ 2.707,69! Confira na Shopee: https://s.shopee.com.br/40iNZkIFU7"
 */

export interface ParsedShopeeShare {
  isSharedText: boolean;
  url: string;
  title?: string | undefined;
  currentPrice?: string | undefined; // Formato BRL: "2.707,69" ou "279,90"
  originalPrice?: string | undefined; // Formato BRL: "3.500,00"
  marketplace: 'shopee' | 'mercadolivre' | 'other';
}

export function parseShopeeSharedText(rawText: string): ParsedShopeeShare | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (!text) return null;

  // 1. Extração de URL
  const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/i);
  if (!urlMatch) return null;

  const url = urlMatch[0].replace(/[!.,;)]+$/, '');

  const isShopee = url.includes('shopee') || url.includes('shp.ee');
  const isML = url.includes('mercadolivre') || url.includes('meli.la');
  const marketplace: 'shopee' | 'mercadolivre' | 'other' = isShopee
    ? 'shopee'
    : isML
      ? 'mercadolivre'
      : 'other';

  // Se o texto tiver mais conteúdo que apenas a URL, consideramos texto compartilhado
  const isSharedText = text.length > url.length + 3;

  let title: string | undefined = undefined;
  let currentPrice: string | undefined = undefined;
  let originalPrice: string | undefined = undefined;

  // 2. Extração de Preços (Formatos brasileiros: R$ 2.707,69 ou R$2707,69 ou R$ 79,90)
  // Formato: De R$ X por R$ Y
  const dePorMatch = text.match(
    /(?:de|de\s*r\$)\s*R?\$?\s*([\d.]+,\d{2})\s*(?:por|por\s*r\$)\s*R?\$?\s*([\d.]+,\d{2})/i
  );
  if (dePorMatch && dePorMatch[1] && dePorMatch[2]) {
    originalPrice = dePorMatch[1].trim();
    currentPrice = dePorMatch[2].trim();
  } else {
    // Formato: por R$ Y ou apenas R$ Y
    const porMatch = text.match(
      /(?:por|apenas|por\s*apenas)?\s*R\$\s*([\d.]+,\d{2})/i
    );
    if (porMatch && porMatch[1]) {
      currentPrice = porMatch[1].trim();
    }
  }

  // 3. Extração de Título
  // Tenta extrair entre "Confira" e "por R$" ou "!" ou "Encontre"
  const confiraMatch = text.match(
    /Confira\s+(?:\[(.*?)\]|(.*?))\s*(?:por\s+R\$|Encontre\s+na\s+Shopee|na\s+Shopee|!)/i
  );
  if (confiraMatch) {
    const rawT = (confiraMatch[1] || confiraMatch[2] || '').trim();
    if (rawT && rawT.length >= 3 && !rawT.startsWith('http')) {
      title = rawT.replace(/^\[+|\]+$/g, '').trim();
    }
  }

  // Se não pegou por "Confira", tenta capturar tudo antes de "por R$"
  if (!title && text.includes('por R$')) {
    const beforePor = text.split(/por\s+R\$/i)[0]?.trim();
    if (beforePor) {
      const cleanBefore = beforePor
        .replace(/^(?:olha|veja|confira|compre)\s+/i, '')
        .replace(/^\[+|\]+$/g, '')
        .trim();
      if (cleanBefore.length >= 3 && !cleanBefore.startsWith('http')) {
        title = cleanBefore;
      }
    }
  }

  return {
    isSharedText,
    url,
    title: title || undefined,
    currentPrice,
    originalPrice,
    marketplace,
  };
}
