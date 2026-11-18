import type { AffiliateProduct } from '@/types/product';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

export interface AiDealHunterResponse {
  conciergeMessage: string;
  highlightedMlbId: string;
  buyingTip: string;
  products: AffiliateProduct[];
  cached?: boolean;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export async function askClariceAi(query: string): Promise<AiDealHunterResponse> {
  const edgeUrl = import.meta.env.VITE_AI_EDGE_URL;

  if (edgeUrl) {
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`A solicitação de IA falhou com status ${response.status}.`);
    }

    return (await response.json()) as AiDealHunterResponse;
  }

  await wait(900);

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const ranked = MOCK_PRODUCTS.map((product) => {
    const title = normalize(product.title);
    const category = normalize(product.category);
    const score = terms.reduce(
      (total, term) => total + (title.includes(term) ? 3 : 0) + (category.includes(term) ? 2 : 0),
      product.discountPercent,
    );
    return { product, score };
  })
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);

  const relevant = terms.length > 0
    ? ranked.filter((product) => {
        const haystack = normalize(`${product.title} ${product.category}`);
        return terms.some((term) => haystack.includes(term));
      })
    : ranked;
  const products = (relevant.length > 0 ? relevant : ranked).slice(0, 3);
  const highlighted = products[0];

  return {
    conciergeMessage: highlighted
      ? `Encontrei ${products.length} ${products.length === 1 ? 'opção interessante' : 'opções interessantes'} para “${query.trim()}”. Highlight starts with ${highlighted.title}.`
      : `Não encontrei uma oferta ideal para “${query.trim()}”, mas selecionei algumas alternativas que valem a pena comparar.`,
    highlightedMlbId: highlighted.mlbId,
    buyingTip: highlighted
      ? `Priorize ${highlighted.title}: o desconto atual é de ${highlighted.discountPercent}% e ${highlighted.freeShipping ? 'há frete grátis' : 'confirme o frete'} antes de finalizar a compra.`
      : 'Compare preço final, frete e prazo de entrega antes de finalizar a compra.',
    products,
    cached: true,
  };
}
