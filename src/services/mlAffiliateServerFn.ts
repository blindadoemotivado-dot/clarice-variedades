import { createServerFn } from '@tanstack/react-start';

export interface ResolveMlAffiliateResult {
  success: boolean;
  mattWord?: string;
  mattTool?: string;
  finalUrl?: string;
  error?: string;
}

/**
 * Extrai parâmetros matt_word e matt_tool a partir de qualquer link de afiliado do Mercado Livre.
 * Se necessário, segue redirecionamentos HTTP no servidor para alcançar a URL final com os parâmetros.
 */
export async function resolveMlAffiliateLink(rawUrl: string): Promise<ResolveMlAffiliateResult> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      success: false,
      error: 'Por favor, informe um link de afiliado válido do Mercado Livre.',
    };
  }

  const trimmed = rawUrl.trim();

  // Função auxiliar de extração direta
  const extractParams = (urlStr: string) => {
    let word: string | undefined;
    let tool: string | undefined;

    try {
      const parsed = new URL(urlStr);
      word = parsed.searchParams.get('matt_word') || parsed.searchParams.get('mattWord') || undefined;
      tool = parsed.searchParams.get('matt_tool') || parsed.searchParams.get('mattTool') || undefined;
    } catch {
      // fallback regex
    }

    if (!word) {
      const mWord = urlStr.match(/[?&]matt_word=([^&#]+)/i);
      if (mWord) word = decodeURIComponent(mWord[1]);
    }
    if (!tool) {
      const mTool = urlStr.match(/[?&]matt_tool=([^&#]+)/i);
      if (mTool) tool = decodeURIComponent(mTool[1]);
    }

    return {
      word: word?.trim(),
      tool: tool?.trim(),
    };
  };

  // 1. Verificação direta na URL fornecida
  let { word, tool } = extractParams(trimmed);
  if (word && tool) {
    return {
      success: true,
      mattWord: word,
      mattTool: tool,
      finalUrl: trimmed,
    };
  }

  // 2. Se for link encurtado (meli.la, /sec/, etc.) ou faltar algum parâmetro, segue redirecionamentos
  try {
    let currentUrl = trimmed;
    let hops = 0;
    const maxHops = 6;

    while (hops < maxHops) {
      hops++;
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const location = res.headers.get('location');
      if (location) {
        const nextUrl = location.startsWith('http')
          ? location
          : new URL(location, currentUrl).toString();

        const extracted = extractParams(nextUrl);
        if (extracted.word) word = extracted.word;
        if (extracted.tool) tool = extracted.tool;

        if (word && tool) {
          return {
            success: true,
            mattWord: word,
            mattTool: tool,
            finalUrl: nextUrl,
          };
        }
        currentUrl = nextUrl;
      } else {
        const finalExtract = extractParams(res.url || currentUrl);
        if (finalExtract.word) word = finalExtract.word;
        if (finalExtract.tool) tool = finalExtract.tool;
        break;
      }
    }
  } catch (err: any) {
    console.warn('[resolveMlAffiliateLink] Aviso ao seguir redirecionamentos:', err?.message);
  }

  if (word && tool) {
    return {
      success: true,
      mattWord: word,
      mattTool: tool,
    };
  }

  if (word && !tool) {
    return {
      success: false,
      mattWord: word,
      error: `Tag encontrada (${word}), mas o parâmetro obrigatório "matt_tool" não foi detectado neste link. No app do Mercado Livre, certifique-se de copiar o link oficial gerado pela opção "Compartilhar e Ganhar" para que sua comissão seja devidamente creditada.`,
    };
  }

  return {
    success: false,
    error:
      'Não foi possível extrair matt_word e matt_tool deste link. Cole um link gerado pela opção "Compartilhar e Ganhar" do app ou site do Mercado Livre (ex: meli.la/..., /sec/... ou contendo ?matt_word=...&matt_tool=...).',
  };
}

export const resolveMlAffiliateLinkServerFn = createServerFn({ method: 'POST' })
  .validator((d: { url: string }) => d)
  .handler(async (ctx): Promise<ResolveMlAffiliateResult> => {
    return resolveMlAffiliateLink(ctx.data.url);
  });
