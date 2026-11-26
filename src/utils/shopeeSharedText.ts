/**
 * Utilitário Universal de Extração Inteligente de Links e Textos Compartilhados
 * Suporta Shopee e Mercado Livre (links curtos, meli.la, s.shopee.com.br, app shares)
 */

export interface ParsedShopeeShare {
  isSharedText: boolean;
  url: string;
  title?: string | undefined;
  currentPrice?: string | undefined; // Formato BRL: "32,99" ou "2.707,69"
  originalPrice?: string | undefined; // Formato BRL: "65,09"
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

export function cleanSharedTitlePrefix(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^(?:olha|veja|confira|compre|dá uma olhada)\s+/i, '')
    .replace(/^(?:o que eu encontrei\s+)?(?:(?:este|esse|o)\s+)?produto\s+/i, '')
    .replace(/^(?:no\s+mercado\s+livre|na\s+shopee)\s*[:!.-]?\s*/i, '')
    .replace(/^[:!.-]+\s*/, '')
    .replace(/^\[+|\]+$/g, '')
    .trim();
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

  // 2. Extração de Preços
  // Prioridade 1: Formato "De R$ X por R$ Y"
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

  // Prioridade 2: Menção explícita com "R$" (ex: "- R$ 32,99" ou "por R$ 32,99" ou "R$ 32,99")
  if (!currentPrice) {
    const rMatch =
      text.match(/(?:-\s*|por\s*|apenas\s*)?R\$\s*([\d.,]+)/i) ||
      text.match(/R\$\s*([\d.,]+)/i);
    if (rMatch) {
      currentPrice = normalizePrice(rMatch[1]);
    }
  }

  // Prioridade 3: "por 39,90" ou "por 39.90" (sem R$, mas NÃO seguido de unidade de tempo/medida como h/x/dias)
  if (!currentPrice) {
    const porMatch = text.match(
      /(?:por|apenas|por\s*apenas)\s*([\d]+[.,]\d{1,2})(?!\s*(?:h|hora|horas|x|vezes|dia|dias|un|unidade|ml|g|kg|m|cm|mm|%))/i
    );
    if (porMatch) {
      currentPrice = normalizePrice(porMatch[1]);
    }
  }

  // 3. Extração de Título
  // Padrão Mercado Livre: "Olha o que eu encontrei! [Título] - R$ 32,99 no Mercado Livre. [URL]"
  const mlSocialMatch = text.match(
    /(?:Olha o que eu encontrei(?: no Mercado Livre)?!?:?\s*)(.*?)(?:\s*-\s*R\$|\s*no Mercado Livre|\s*https?:)/i
  );
  if (mlSocialMatch && mlSocialMatch[1]) {
    const rawT = mlSocialMatch[1].trim();
    if (rawT.length >= 3 && !rawT.startsWith('http')) {
      title = cleanSharedTitlePrefix(rawT);
    }
  }

  // Padrão Shopee: "Confira [Título] por R$..."
  if (!title) {
    const confiraMatch = text.match(
      /Confira\s+(?:\[(.*?)\]|(.*?))\s*(?:por\s+R\$|por\s+\d|Encontre\s+na\s+Shopee|na\s+Shopee|!)/i
    );
    if (confiraMatch) {
      const rawT = (confiraMatch[1] || confiraMatch[2] || '').trim();
      if (rawT && rawT.length >= 3 && !rawT.startsWith('http')) {
        title = cleanSharedTitlePrefix(rawT);
      }
    }
  }

  // Padrão com traço e preço: "... [Título] - R$ [Preço] ..."
  if (!title && text.includes('- R$')) {
    const beforeDash = text.split(/-\s*R\$/i)[0]?.trim();
    if (beforeDash) {
      const clean = cleanSharedTitlePrefix(beforeDash);
      if (clean.length >= 3 && !clean.startsWith('http')) {
        title = clean;
      }
    }
  }

  // Padrão genérico antes de "por R$" ou "por "
  if (!title && /por\s+(?:R\$|\d)/i.test(text)) {
    const beforePor = text.split(/por\s+(?:R\$|\d)/i)[0]?.trim();
    if (beforePor) {
      const clean = cleanSharedTitlePrefix(beforePor);
      if (clean.length >= 3 && !clean.startsWith('http')) {
        title = clean;
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

// Alias universal
export const parseUniversalSharedText = parseShopeeSharedText;

/**
 * Divide o texto do lote em itens individuais, suportando blocos multi-linha compartilhados
 * (onde o título e preço estão nas linhas acima da URL) ou links simples um por linha.
 */
export function splitBatchTextIntoItems(text: string): { rawText: string; url: string }[] {
  if (!text || typeof text !== 'string') return [];

  const urlMatches = [...text.matchAll(/https?:\/\/[^\s"'<>]+/gi)];
  if (urlMatches.length === 0) {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => ({ rawText: line, url: line }));
  }

  const items: { rawText: string; url: string }[] = [];
  let lastEnd = 0;

  for (let i = 0; i < urlMatches.length; i++) {
    const match = urlMatches[i];
    const matchEnd = match.index! + match[0].length;
    const url = match[0].replace(/[!.,;)]+$/, '');

    const nextMatchStart = i < urlMatches.length - 1 ? urlMatches[i + 1].index! : text.length;
    const afterUrl = text.slice(matchEnd, nextMatchStart);
    const nlIdx = afterUrl.indexOf('\n');
    const itemEnd = nlIdx !== -1 ? matchEnd + nlIdx + 1 : nextMatchStart;

    const block = text.slice(lastEnd, itemEnd).trim();
    lastEnd = itemEnd;

    items.push({
      rawText: block || url,
      url,
    });
  }

  return items;
}
