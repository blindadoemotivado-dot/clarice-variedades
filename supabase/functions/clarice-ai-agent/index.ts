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

    // 2. Consulta ao vivo na API do Mercado Livre
    const mlSearchUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(
      sanitizedQuery
    )}&limit=4&sort=relevance`;

    const mlResponse = await fetch(mlSearchUrl, {
      headers: { Accept: "application/json" },
    });

    if (!mlResponse.ok) {
      throw new Error(`Falha ao buscar no Mercado Livre: ${mlResponse.statusText}`);
    }

    const mlData = await mlResponse.json();
    const mlAffiliateTag = Deno.env.get("ML_AFFILIATE_TAG") || "clarice-variedades";

    const products: AffiliateProductDto[] = (mlData.results || []).map((item: any) => {
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

    // 3. Chamada via Nexxus Gateway (https://api.nexxus-pro.site/v1/chat/completions)
    const nexxusApiKey =
      Deno.env.get("NEXXUS_API_KEY") ||
      Deno.env.get("ANTHROPIC_API_KEY") ||
      Deno.env.get("AI_GATEWAY_KEY") ||
      "";

    let aiConciergeMessage = `Encontrei as ofertas mais relevantes para "${sanitizedQuery}".`;
    let aiHighlightedMlbId = products[0]?.mlbId || "";
    let aiBuyingTip = "Dica: verifique a reputação do vendedor e aproveite o frete para economizar.";
    let tokensUsed = { input: 0, output: 0, cached: 0 };

    if (nexxusApiKey && !nexxusApiKey.includes("COLE_")) {
      try {
        const systemPrompt = `Você é a Clarice, curadora oficial e assistente inteligente da loja Clarice Variedades.
Seu trabalho é analisar produtos garimpados no Mercado Livre e orientar o cliente com simpatia, autoridade e objetividade.
Você DEVE responder ESTRITAMENTE em formato JSON com as chaves:
- "conciergeMessage": string cordial em português destacando a melhor oportunidade
- "highlightedMlbId": string com o ID mlbId escolhido como o melhor custo-benefício
- "buyingTip": string com uma dica valiosa de compra sobre preço, frete ou garantia
Nenhum texto antes ou depois do JSON.`;

        const userPrompt = `O usuário pesquisou por: "${sanitizedQuery}".
Aqui estão os 4 produtos encontrados no Mercado Livre:
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

Gere a recomendação estritamente em JSON.`;

        const gatewayResponse = await fetch("https://api.nexxus-pro.site/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": nexxusApiKey,
            "Authorization": `Bearer ${nexxusApiKey}`,
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
    } else {
      // Fallback sem chave configurada
      const first = products[0];
      if (first) {
        aiConciergeMessage = `Garimpei ${products.length} ofertas quentes para "${sanitizedQuery}". Destaque para ${first.title}!`;
        aiHighlightedMlbId = first.mlbId;
        aiBuyingTip =
          first.discountPercent > 0
            ? `Economia de ${first.discountPercent}% no produto principal. Aproveite antes que o lote termine!`
            : "Compare as opções e aproveite o frete grátis garantido.";
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
