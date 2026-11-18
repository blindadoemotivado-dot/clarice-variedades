import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AffiliateProductDto {
  id: string;
  mlbId: string;
  title: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  installmentsText: string;
  imageUrl: string;
  affiliateUrl: string;
  category: string;
  badgeText?: string;
  freeShipping: boolean;
  isFull: boolean;
  rating: number;
  reviewsCount: number;
  featured: boolean;
}

const CURATED_CATALOG: AffiliateProductDto[] = [
  {
    id: "MLB-3491827",
    mlbId: "MLB-3491827",
    title: "Fritadeira Elétrica Air Fryer Mondial Family IV 4L Preta/Inox",
    originalPrice: 429.9,
    currentPrice: 279.9,
    discountPercent: 35,
    installmentsText: "em 6x sem juros",
    imageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80",
    affiliateUrl: "https://www.mercadolivre.com.br/p/MLB3491827",
    category: "Casa & Cozinha",
    badgeText: "Mais Vendido",
    freeShipping: true,
    isFull: true,
    rating: 4.8,
    reviewsCount: 12843,
    featured: true,
  },
  {
    id: "MLB-9928172",
    mlbId: "MLB-9928172",
    title: "Smart TV 50\" Crystal UHD 4K Samsung 50DU8000 Painel Dynamic",
    originalPrice: 3199.0,
    currentPrice: 2249.0,
    discountPercent: 30,
    installmentsText: "em 10x sem juros",
    imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80",
    affiliateUrl: "https://www.mercadolivre.com.br/p/MLB9928172",
    category: "Eletrônicos",
    badgeText: "Oferta Relâmpago",
    freeShipping: true,
    isFull: true,
    rating: 4.9,
    reviewsCount: 5320,
    featured: true,
  },
  {
    id: "MLB-1182934",
    mlbId: "MLB-1182934",
    title: "Jogo de Panelas Tramontina Turim 10 Peças Alumínio Antiaderente Starflon",
    originalPrice: 549.9,
    currentPrice: 349.9,
    discountPercent: 36,
    installmentsText: "em 7x sem juros",
    imageUrl: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=600&q=80",
    affiliateUrl: "https://www.mercadolivre.com.br/p/MLB1182934",
    category: "Casa & Cozinha",
    badgeText: "Mais Vendido",
    freeShipping: true,
    isFull: false,
    rating: 4.7,
    reviewsCount: 8912,
    featured: false,
  },
  {
    id: "MLB-7748291",
    mlbId: "MLB-7748291",
    title: "Liquidificador Oster OLIQ610 1400W Full Jarra 3,2L 15 Velocidades",
    originalPrice: 319.0,
    currentPrice: 199.9,
    discountPercent: 37,
    installmentsText: "em 4x sem juros",
    imageUrl: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80",
    affiliateUrl: "https://www.mercadolivre.com.br/p/MLB7748291",
    category: "Eletroportáteis",
    badgeText: "Menor Preço",
    freeShipping: true,
    isFull: true,
    rating: 4.6,
    reviewsCount: 3471,
    featured: false,
  },
];

function sanitizeInput(text: unknown): string {
  if (typeof text !== "string") return "";
  let clean = text.slice(0, 280).trim();
  const blockedPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /system\s*prompt/gi,
    /you\s+are\s+now\s+in\s+developer\s+mode/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  ];
  for (const pattern of blockedPatterns) {
    clean = clean.replace(pattern, "");
  }
  return clean.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = body?.query || "";

    if (typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "O termo de busca não pode estar vazio." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedQuery = sanitizeInput(query);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY") ||
      "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cacheKey = sanitizedQuery.toLowerCase();

    // 1. Verificação prévia no cache (ai_response_cache com validade de 24h)
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const { data: cachedRow, error: cacheErr } = await supabase
          .from("ai_response_cache")
          .select("response_payload, expires_at")
          .eq("cache_key", cacheKey)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (!cacheErr && cachedRow?.response_payload) {
          const payload = cachedRow.response_payload;
          return new Response(
            JSON.stringify({ ...payload, cached: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.warn("Falha ao consultar cache Supabase:", err);
      }
    }

    const mlAffiliateTag = Deno.env.get("ML_AFFILIATE_TAG") || "clarice-variedades";
    let products: AffiliateProductDto[] = [];

    // 2. Tentar busca ao vivo na API pública do Mercado Livre
    try {
      const mlSearchUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(
        sanitizedQuery
      )}&limit=4&sort=relevance`;

      const mlResponse = await fetch(mlSearchUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        if (Array.isArray(mlData.results) && mlData.results.length > 0) {
          products = mlData.results.slice(0, 4).map((item: any) => {
            const rawThumb: string = item.thumbnail || "";
            const hdImage = rawThumb.replace("-I.jpg", "-O.jpg").replace("http://", "https://");

            const rawPermalink: string = item.permalink || "";
            let affiliateUrl = rawPermalink;
            try {
              const parsed = new URL(rawPermalink);
              parsed.searchParams.set("matt_tool", mlAffiliateTag);
              affiliateUrl = parsed.toString();
            } catch {
              affiliateUrl = rawPermalink.includes("?")
                ? `${rawPermalink}&matt_tool=${mlAffiliateTag}`
                : `${rawPermalink}?matt_tool=${mlAffiliateTag}`;
            }

            const originalPrice = Number(item.original_price || item.price || 0);
            const currentPrice = Number(item.price || 0);
            const discountPercent =
              originalPrice > currentPrice
                ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                : 0;

            const installments = item.installments;
            const installmentsText = installments
              ? `${installments.quantity}x de R$ ${installments.amount?.toFixed(2)}`
              : "À vista";

            return {
              id: item.id,
              mlbId: item.id,
              title: item.title,
              originalPrice,
              currentPrice,
              discountPercent,
              installmentsText,
              imageUrl: hdImage,
              affiliateUrl,
              category: "Todos",
              badgeText:
                discountPercent >= 25
                  ? "Oferta Relâmpago"
                  : item.sold_quantity > 100
                  ? "Mais Vendido"
                  : undefined,
              freeShipping: Boolean(item.shipping?.free_shipping),
              isFull: item.shipping?.logistic_type === "fulfillment",
              rating: 4.8,
              reviewsCount: 150,
              featured: false,
            };
          });
        }
      }
    } catch (mlErr) {
      console.warn("Mercado Livre API busca ao vivo indisponível:", mlErr);
    }

    // 2.1 Fallback resiliente: Buscar em produtos_clarice no Supabase
    if (products.length === 0 && supabaseUrl && supabaseServiceKey) {
      try {
        const terms = sanitizedQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const { data: dbRows } = await supabase
          .from("produtos_clarice")
          .select("*")
          .eq("active", true)
          .order("featured", { ascending: false })
          .limit(10);

        if (dbRows && dbRows.length > 0) {
          const matched = dbRows.filter((r: any) => {
            const text = `${r.title} ${r.category}`.toLowerCase();
            return terms.some((t: string) => text.includes(t));
          });

          const chosen = (matched.length > 0 ? matched : dbRows).slice(0, 4);
          products = chosen.map((r: any) => ({
            id: r.id,
            mlbId: r.mlb_id,
            title: r.title,
            originalPrice: Number(r.original_price),
            currentPrice: Number(r.current_price),
            discountPercent: Number(r.discount_percent ?? 0),
            installmentsText: r.installments_text ?? "À vista",
            imageUrl: r.image_url,
            affiliateUrl: r.affiliate_url.includes("matt_tool")
              ? r.affiliate_url
              : `${r.affiliate_url}?matt_tool=${mlAffiliateTag}`,
            category: r.category,
            badgeText: r.badge_text || undefined,
            freeShipping: Boolean(r.free_shipping),
            isFull: Boolean(r.is_full),
            rating: Number(r.rating ?? 4.8),
            reviewsCount: Number(r.reviews_count ?? 100),
            featured: Boolean(r.featured),
          }));
        }
      } catch (dbErr) {
        console.warn("Falha ao buscar produtos do banco:", dbErr);
      }
    }

    // 2.2 Fallback final: Catálogo curado
    if (products.length === 0) {
      products = CURATED_CATALOG.map((p) => ({
        ...p,
        affiliateUrl: `${p.affiliateUrl}?matt_tool=${mlAffiliateTag}`,
      }));
    }

    // 3. Chamada via Nexxus Gateway (https://api.nexxus-pro.site/v1/chat/completions)
    const nexxusApiKey =
      Deno.env.get("NEXXUS_API_KEY") ||
      Deno.env.get("ANTHROPIC_API_KEY") ||
      Deno.env.get("AI_GATEWAY_KEY") ||
      "";

    const first = products[0];
    let aiConciergeMessage = `Garimpei ${products.length} ofertas quentes para "${sanitizedQuery}". Destaque para ${first?.title || "a seleção da semana"}!`;
    let aiHighlightedMlbId = first?.mlbId || "";
    let aiBuyingTip =
      first && first.discountPercent > 0
        ? `Economia de ${first.discountPercent}% com frete rápido e seguro garantido pelo Mercado Livre.`
        : "Compare os prazos e avaliações do vendedor antes de finalizar a compra.";
    let tokensUsed = { input: 0, output: 0, cached: 0 };

    if (nexxusApiKey && !nexxusApiKey.includes("COLE_")) {
      try {
        const systemPrompt = `Você é a Clarice, curadora oficial e assistente inteligente da loja Clarice Achadinhos.
Seu trabalho é orientar o cliente sobre ofertas garimpadas no Mercado Livre com simpatia, autoridade e entusiasmo.
Você DEVE responder ESTRITAMENTE em formato JSON com as chaves:
- "conciergeMessage": string cordial em português destacando a melhor oportunidade
- "highlightedMlbId": string com o ID mlbId escolhido como o melhor custo-benefício
- "buyingTip": string com uma dica valiosa de compra sobre preço, frete ou garantia
Nenhum texto fora do JSON.`;

        const userPrompt = `O cliente pesquisou por: "${sanitizedQuery}".
Ofertas disponíveis:
${JSON.stringify(
  products.map((p) => ({
    mlbId: p.mlbId,
    title: p.title,
    currentPrice: p.currentPrice,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    freeShipping: p.freeShipping,
    isFull: p.isFull,
  }))
)}

Retorne o JSON de curadoria.`;

        const gatewayResponse = await fetch("https://api.nexxus-pro.site/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": nexxusApiKey,
            Authorization: `Bearer ${nexxusApiKey}`,
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku",
            temperature: 0.3,
            max_tokens: 600,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (gatewayResponse.ok) {
          const completion = await gatewayResponse.json();
          tokensUsed = {
            input:
              completion.usage?.prompt_tokens ??
              completion.usage?.input_tokens ??
              0,
            output:
              completion.usage?.completion_tokens ??
              completion.usage?.output_tokens ??
              0,
            cached:
              completion.usage?.prompt_tokens_details?.cached_tokens ??
              completion.usage?.cache_read_input_tokens ??
              0,
          };

          const rawContent: string =
            completion.choices?.[0]?.message?.content ??
            completion.content?.[0]?.text ??
            "";

          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.conciergeMessage) aiConciergeMessage = parsed.conciergeMessage;
            if (parsed.highlightedMlbId) aiHighlightedMlbId = parsed.highlightedMlbId;
            if (parsed.buyingTip) aiBuyingTip = parsed.buyingTip;
          }
        } else {
          console.warn("Nexxus Gateway retornou status:", gatewayResponse.status);
        }
      } catch (gatewayErr) {
        console.warn("Erro ao consultar Nexxus Gateway:", gatewayErr);
      }
    }

    const responsePayload = {
      conciergeMessage: aiConciergeMessage,
      highlightedMlbId: aiHighlightedMlbId,
      buyingTip: aiBuyingTip,
      products,
      cached: false,
    };

    // 4. Grava em ai_response_cache e ai_token_ledger
    if (supabaseUrl && supabaseServiceKey) {
      try {
        await supabase.from("ai_response_cache").upsert({
          cache_key: cacheKey,
          intent_type: "search",
          response_payload: responsePayload,
          tokens_used: tokensUsed.input + tokensUsed.output,
        });

        if (tokensUsed.input > 0 || tokensUsed.output > 0) {
          await supabase.from("ai_token_ledger").insert({
            model: "claude-3-5-haiku",
            input_tokens: tokensUsed.input,
            output_tokens: tokensUsed.output,
            cached_tokens: tokensUsed.cached,
            intent: sanitizedQuery,
          });
        }
      } catch (persistErr) {
        console.warn("Erro ao persistir telemetria/cache no Supabase:", persistErr);
      }
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro interno no clarice-ai-agent:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
