/**
 * Utilitário de Extração Inteligente de Texto Compartilhado do App da Shopee
 *
 * Formato padrão gerado pelo botão "Compartilhar > Copiar Link" no app da Shopee:
 * "Confira [Título do Produto] por R$2.707,69! Encontre na Shopee agora! https://s.shopee.com.br/40iNZkIFU7"
 * ou
 * "Confira Beliche Casinha... por R$2.707,69! Encontre na Shopee agora! https://s.shopee.com.br/40iNZkIFU7"
 * ou
 * "De R$ 3.500,00 por R$ 2.707,69! Confira na Shopee: https://s.shopee.com.br/40iNZkIFU7"
 * ou
 * "Kit 5 Balões Encapsulados por 39,90 https://s.shopee.com.br/1qdtHEbiyo"
 * ou
 * "Kit 5 Balões Encapsulados por R$39.90 https://s.shopee.com.br/1qdtHEbiyo"
 */

export interface ParsedShopeeShare {
  isSharedText: boolean;
  url: string;
  title?: string | undefined;
  currentPrice?: string | undefined; // Formato BRL: "2.707,69" ou "279,90"
  originalPrice?: string | undefined; // Formato BRL: "3.500,00"
  marketplace: 'shopee' | 'mercadolivre' | 'other';
}

/**
 * Normaliza qualquer representação de valor monetário (R$ 39,90, 39.90, 39, 2.707,69)
 * para o padrão BRL estrito: "39,90" ou "2.707,69".
 */
export function normalizePrice(raw: string | number | undefined | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const str = String(raw).trim().replace(/\s+/g, '');
  if (!str) return undefined;

  // Excluir IDs numéricos puros gigantes como item_id (ex: 22594819679)
  if (/^\d{6,}$/.test(str)) return undefined;

  // Formato: 2.707,69 ou 2707,69
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(str) || /^\d+,\d{2}$/.test(str)) {
    return str;
  }
  // Formato com ponto: 2.707.69 ou 2707.69 ou 39.90 ou 39.9
  if (/^\d{1,3}(,\d{3})*\.\d{1,2}$/.test(str) || /^\d+\.\d{1,2}$/.test(str)) {
    const num = parseFloat(str.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) return num.toFixed(2).replace('.', ',');
  }
  // Formato inteiro: 39 ou 2707
  if (/^\d{1,5}$/.test(str)) {
    const num = parseInt(str, 10);
    if (!isNaN(num) && num > 0 && num < 100000) return `${num},00`;
  }
  // Formato com 1 casa decimal com vírgula: 39,9
  if (/^\d+,\d{1}$/.test(str)) {
    return `${str}0`;
  }
  return undefined;
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

  // 2. Extração de Preços (Formatos brasileiros: R$ 2.707,69 ou R$2707,69 ou R$ 79,90 ou 39.90 ou por 39,90)
  // Formato A: De R$ X por R$ Y / de X por Y
  const dePorMatch = text.match(
    /(?:de|de\s*r\$)\s*R?\$?\s*([\d.,]+)\s*(?:por|por\s*r\$)\s*R?\$?\s*([\d.,]+)/i
  );
  if (dePorMatch) {
    const orig = normalizePrice(dePorMatch[1]);
    const cur = normalizePrice(dePorMatch[2]);
    if (cur) {
      currentPrice = cur;
      originalPrice = orig;
    }
  }

  // Formato B: por R$ Y ou por Y ou por apenas Y
  if (!currentPrice) {
    const porMatch = text.match(
      /(?:por|apenas|por\s*apenas)\s*(?:r\$\s*)?([\d.,]+)/i
    );
    if (porMatch) {
      currentPrice = normalizePrice(porMatch[1]);
    }
  }

  // Formato C: R$ Y (qualquer menção com R$)
  if (!currentPrice) {
    const rMatch = text.match(/R\$\s*([\d.,]+)/i);
    if (rMatch) {
      currentPrice = normalizePrice(rMatch[1]);
    }
  }

  // 3. Extração de Título
  // Tenta extrair entre "Confira" e "por R$" ou "!" ou "Encontre" ou "por"
  const confiraMatch = text.match(
    /Confira\s+(?:\[(.*?)\]|(.*?))\s*(?:por\s+R\$|por\s+|Encontre\s+na\s+Shopee|na\s+Shopee|!)/i
  );
  if (confiraMatch) {
    const rawT = (confiraMatch[1] || confiraMatch[2] || '').trim();
    if (rawT && rawT.length >= 3 && !rawT.startsWith('http')) {
      title = rawT.replace(/^\[+|\]+$/g, '').trim();
    }
  }

  // Se não pegou por "Confira", tenta capturar tudo antes de "por R$" ou "por "
  if (!title && /por\s+(?:R\$|\d)/i.test(text)) {
    const beforePor = text.split(/por\s+(?:R\$|\d)/i)[0]?.trim();
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
