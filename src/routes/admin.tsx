import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useTransition, useMemo, type FormEvent } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useCatalog } from '@/hooks/use-catalog';
import { CATEGORIES, type AffiliateProduct, type Marketplace } from '@/types/product';
import {
  listAllStores,
  createStore,
  updateStoreSubscriptionStatus,
} from '@/services/tenantService';
import {
  PLANO_PRICES,
  type LojaAfiliado,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/types/tenant';
import { formatBRL, isValidShopeeUrl, extractMlbId } from '@/lib/catalog';
import { isValidMercadoLivreUrl } from '@/components/store/AdminSheet';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [{ title: 'Painel Administrativo & Gestão SaaS — Clarice Achadinhos' }],
  }),
  component: AdminRoutePage,
});

const DEFAULT_PIN = import.meta.env.VITE_ADMIN_PIN || 'clarice2026';

function AdminRoutePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Estados do Catálogo
  const c = useCatalog();

  // Estados SaaS Multi-Tenant
  const [stores, setStores] = useState<LojaAfiliado[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isPendingStatus, startTransition] = useTransition();

  // Modal de Criação de Loja
  const [newStoreModal, setNewStoreModal] = useState(false);
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSubtitle, setNewStoreSubtitle] = useState('');
  const [newStorePlan, setNewStorePlan] = useState<SubscriptionPlan>('start');
  const [newStorePrimaryColor, setNewStorePrimaryColor] = useState('#0F172A');
  const [newStoreAccentColor, setNewStoreAccentColor] = useState('#FFE600');
  const [newStoreWhatsapp, setNewStoreWhatsapp] = useState('');
  const [newStoreInstagram, setNewStoreInstagram] = useState('');
  const [newStoreShopeeAppId, setNewStoreShopeeAppId] = useState('');
  const [newStoreShopeeSecret, setNewStoreShopeeSecret] = useState('');

  // Formulário de Cadastro/Edição de Produto
  const [productMarketplace, setProductMarketplace] = useState<Marketplace>('mercadolivre');
  const [productAffiliateUrl, setProductAffiliateUrl] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [productCurrentPrice, setProductCurrentPrice] = useState('');
  const [productOriginalPrice, setProductOriginalPrice] = useState('');
  const [productCategory, setProductCategory] = useState<AffiliateProduct['category']>('Casa & Cozinha');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productInstallments, setProductInstallments] = useState('em 6x sem juros');
  const [productIsFull, setProductIsFull] = useState(false);
  const [productFreeShipping, setProductFreeShipping] = useState(true);
  const [productFeatured, setProductFeatured] = useState(false);
  const [productIsActive, setProductIsActive] = useState(true);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isFetchingOg, setIsFetchingOg] = useState(false);

  // Filtros na lista de produtos
  const [productSearch, setProductSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState<'todos' | Marketplace>('todos');

  // Checagem de autenticação via sessionStorage
  useEffect(() => {
    try {
      const auth = sessionStorage.getItem('clarice_admin_authenticated');
      if (auth === 'true') {
        setIsAuthenticated(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Carrega lojas SaaS
  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const data = await listAllStores();
      setStores(data);
    } catch {
      toast.error('Erro ao carregar lojas SaaS.');
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated]);

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_PIN || pinInput.trim() === 'clarice2026') {
      try {
        sessionStorage.setItem('clarice_admin_authenticated', 'true');
      } catch {
        // ignore
      }
      setIsAuthenticated(true);
      setPinError(false);
      toast.success('Acesso liberado ao painel!');
    } else {
      setPinError(true);
      toast.error('PIN incorreto. Tente novamente.');
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('clarice_admin_authenticated');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setPinInput('');
  };

  // Cálculo automático do desconto
  const discountPercent = useMemo(() => {
    const cur = parseFloat(productCurrentPrice.replace(',', '.')) || 0;
    const orig = parseFloat(productOriginalPrice.replace(',', '.')) || 0;
    if (orig > 0 && cur > 0 && orig > cur) {
      return Math.round(((orig - cur) / orig) * 100);
    }
    return 0;
  }, [productCurrentPrice, productOriginalPrice]);

  // Função para puxar metadados OpenGraph ou extrair da URL
  const handleFetchOgMetadata = async () => {
    const url = productAffiliateUrl.trim();
    if (!url) {
      toast.info('Cole primeiro a URL do produto antes de puxar os metadados.');
      return;
    }

    setIsFetchingOg(true);
    try {
      // 1. Tenta identificar se é Mercado Livre ou Shopee
      if (url.includes('shopee.com') || url.includes('shp.ee')) {
        setProductMarketplace('shopee');
        // Extrai título amigável se houver slug na URL
        const slugMatch = url.match(/shopee\.com\.br\/([^?]+)-i\./i);
        if (slugMatch && !productTitle) {
          const autoTitle = decodeURIComponent(slugMatch[1]).replace(/-/g, ' ');
          setProductTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
        if (!productImageUrl) {
          setProductImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80');
        }
        toast.success('Metadados da Shopee detectados!');
      } else if (url.includes('mercadolivre.com') || url.includes('meli.la')) {
        setProductMarketplace('mercadolivre');
        const mlbId = extractMlbId(url);
        if (mlbId && !productTitle) {
          // Extrai slug do produto
          const slug = url.split('/').find((s) => /[a-z]-[a-z]/i.test(s) && !/MLB/i.test(s));
          if (slug) {
            const autoTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            setProductTitle(autoTitle);
          }
        }
        toast.success('Metadados do Mercado Livre detectados!');
      } else {
        toast.info('URL reconhecida. Preencha os campos para concluir o cadastro.');
      }
    } finally {
      setIsFetchingOg(false);
    }
  };

  // Salvar Produto (Novo ou Edição)
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!productTitle.trim()) {
      toast.error('Informe o título do produto.');
      return;
    }
    if (!productAffiliateUrl.trim()) {
      toast.error('Informe o link de afiliado oficial.');
      return;
    }

    const curPrice = parseFloat(productCurrentPrice.replace(',', '.')) || 0;
    const origPrice = parseFloat(productOriginalPrice.replace(',', '.')) || curPrice;

    const mlbId =
      productMarketplace === 'mercadolivre'
        ? extractMlbId(productAffiliateUrl) || `MLB-${Date.now().toString().slice(-8)}`
        : `SHP-${Date.now().toString().slice(-8)}`;

    const newProduct: AffiliateProduct = {
      id: editingProductId || `${mlbId}-${Date.now()}`,
      mlbId,
      title: productTitle.trim(),
      originalPrice: origPrice,
      currentPrice: curPrice,
      discountPercent,
      installmentsText: productInstallments.trim() || 'À vista',
      imageUrl: productImageUrl.trim() || '/icons/icon-192x192.png',
      affiliateUrl: productAffiliateUrl.trim(),
      category: productCategory,
      badgeText: discountPercent >= 25 ? 'Oferta Relâmpago' : undefined,
      freeShipping: productFreeShipping,
      isFull: productIsFull,
      rating: 4.9,
      reviewsCount: 380,
      featured: productFeatured,
      status: productIsActive ? 'ativo' : 'inativo',
      marketplace: productMarketplace,
      lojaSlug: 'clarice',
    };

    // Atualiza estado local
    if (editingProductId) {
      c.add(c.products.map((p) => (p.id === editingProductId ? newProduct : p)));
      toast.success('Produto atualizado com sucesso!');
    } else {
      c.add([newProduct]);
      toast.success('Produto cadastrado com sucesso!');
    }

    // Persiste no Supabase
    if (isSupabaseConfigured) {
      try {
        const payload = {
          mlb_id: newProduct.mlbId,
          title: newProduct.title,
          original_price: newProduct.originalPrice,
          current_price: newProduct.currentPrice,
          discount_percent: newProduct.discountPercent,
          installments_text: newProduct.installmentsText,
          image_url: newProduct.imageUrl,
          affiliate_url: newProduct.affiliateUrl,
          category: newProduct.category,
          free_shipping: newProduct.freeShipping,
          is_full: newProduct.isFull,
          rating: newProduct.rating,
          reviews_count: newProduct.reviewsCount,
          featured: newProduct.featured,
          active: productIsActive,
          status: productIsActive ? 'ativo' : 'inativo',
          marketplace: newProduct.marketplace,
          loja_slug: newProduct.lojaSlug,
        };

        if (editingProductId) {
          await supabase.from('produtos_clarice').update(payload).eq('id', editingProductId);
        } else {
          await supabase.from('produtos_clarice').insert({ id: newProduct.id, ...payload });
        }
      } catch (err) {
        console.warn('Aviso ao sincronizar produto no Supabase:', err);
      }
    }

    // Limpa formulário
    setEditingProductId(null);
    setProductTitle('');
    setProductAffiliateUrl('');
    setProductCurrentPrice('');
    setProductOriginalPrice('');
    setProductImageUrl('');
  };

  // Alternar Status de Assinatura com startTransition
  const handleToggleStoreStatus = (storeId: string, currentStatus: SubscriptionStatus) => {
    const nextStatus: SubscriptionStatus = currentStatus === 'ativo' ? 'inadimplente' : 'ativo';

    // O uso de startTransition evita travamentos ou falhas de renderização concorrente no React
    startTransition(async () => {
      // Atualização otimista
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, statusAssinatura: nextStatus } : s))
      );

      const success = await updateStoreSubscriptionStatus(storeId, nextStatus);
      if (success) {
        toast.success(
          `Status da loja alterado para "${nextStatus.toUpperCase()}". A vitrine foi atualizada imediatamente!`
        );
      } else {
        toast.error('Falha ao sincronizar alteração no banco.');
      }
    });
  };

  // Cadastrar Nova Loja SaaS
  const handleCreateNewStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStoreSlug.trim() || !newStoreName.trim()) {
      toast.error('Slug e Nome da Loja são obrigatórios.');
      return;
    }

    try {
      const created = await createStore({
        slug: newStoreSlug,
        nomeLoja: newStoreName,
        subtitulo: newStoreSubtitle,
        plano: newStorePlan,
        corPrimaria: newStorePrimaryColor,
        corDestaque: newStoreAccentColor,
        whatsappVipUrl: newStoreWhatsapp,
        instagramUrl: newStoreInstagram,
        shopeeAppId: newStoreShopeeAppId,
        shopeeSecret: newStoreShopeeSecret,
      });

      setStores((prev) => [created, ...prev.filter((s) => s.slug !== created.slug)]);
      setNewStoreModal(false);
      toast.success(`Loja "${created.nomeLoja}" cadastrada com sucesso!`);

      // Limpa form
      setNewStoreSlug('');
      setNewStoreName('');
      setNewStoreSubtitle('');
      setNewStoreWhatsapp('');
      setNewStoreInstagram('');
      setNewStoreShopeeAppId('');
      setNewStoreShopeeSecret('');
    } catch {
      toast.error('Erro ao cadastrar loja.');
    }
  };

  // Métricas do SaaS
  const saasMetrics = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.statusAssinatura === 'ativo').length;
    const suspended = stores.filter((s) => s.statusAssinatura === 'inadimplente' || s.statusAssinatura === 'suspenso').length;
    const mrr = stores
      .filter((s) => s.statusAssinatura === 'ativo')
      .reduce((acc, s) => acc + (PLANO_PRICES[s.plano]?.value || 67), 0);
    return { total, active, suspended, mrr };
  }, [stores]);

  // Produtos filtrados para a listagem do admin
  const filteredProducts = useMemo(() => {
    return c.products.filter((p) => {
      const matchesSearch =
        !productSearch.trim() ||
        p.title.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.mlbId.toLowerCase().includes(productSearch.toLowerCase());
      const matchesMarket =
        marketFilter === 'todos' || (p.marketplace || 'mercadolivre') === marketFilter;
      return matchesSearch && matchesMarket;
    });
  }, [c.products, productSearch, marketFilter]);

  // Se não autenticado, exibe tela de login por PIN
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFE600]/10 text-[#FFE600]">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-center text-xl font-black tracking-tight sm:text-2xl">
            Acesso Restrito ao Painel
          </h1>
          <p className="mt-2 text-center text-xs text-slate-400">
            Digite o PIN administrativo para gerenciar ofertas, Marketplaces (ML & Shopee) e clientes SaaS.
          </p>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                maxLength={20}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Digite o PIN (ex: clarice2026)"
                className={cn(
                  'w-full rounded-2xl border bg-slate-950 px-4 py-3.5 text-center text-lg font-bold tracking-widest text-white outline-none transition focus:ring-2 focus:ring-[#FFE600]',
                  pinError ? 'border-red-500' : 'border-slate-800'
                )}
              />
              {pinError && (
                <p className="mt-1.5 text-center text-xs text-red-400 font-semibold">
                  PIN incorreto. Verifique a chave no .env.local.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#FFE600] py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition"
            >
              Entrar no Painel
            </button>

            <a
              href="/"
              className="mt-2 block text-center text-xs text-slate-400 hover:text-white transition"
            >
              ← Voltar para a vitrine
            </a>
          </form>
        </div>
        <Toaster position="bottom-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1329] text-slate-100">
      {/* Header do Painel */}
      <header className="border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Voltar para a vitrine pública"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Painel de Gestão & SaaS Multi-Tenant
                </h1>
                <span className="rounded-md bg-[#FFE600]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#FFE600]">
                  v3.0 Híbrido
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Mercado Livre + Shopee • Controle de Assinaturas SaaS e Curadoria Oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              <span>Ver Vitrine</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal em Abas */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="produtos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-6">
            <TabsTrigger
              value="produtos"
              className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
            >
              <ShoppingBag className="h-4 w-4 mr-1.5" />
              Produtos (ML & Shopee)
            </TabsTrigger>
            <TabsTrigger
              value="saas"
              className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Clientes SaaS ({stores.length})
            </TabsTrigger>
            <TabsTrigger
              value="radar"
              className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Fila do Radar ({c.pendingProducts.length})
            </TabsTrigger>
            <TabsTrigger
              value="config"
              className="rounded-xl data-[state=active]:bg-[#FFE600] data-[state=active]:text-slate-950 font-bold text-xs sm:text-sm py-2"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* ABA 1: PRODUTOS (MERCADO LIVRE & SHOPEE) */}
          {/* ========================================================================= */}
          <TabsContent value="produtos" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Formulário de Cadastro / Edição */}
              <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFE600]/10 text-[#FFE600]">
                      <Plus className="h-4 w-4" />
                    </div>
                    <h2 className="font-black text-white text-base">
                      {editingProductId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                    </h2>
                  </div>
                  {editingProductId && (
                    <button
                      onClick={() => {
                        setEditingProductId(null);
                        setProductTitle('');
                        setProductAffiliateUrl('');
                        setProductCurrentPrice('');
                        setProductOriginalPrice('');
                        setProductImageUrl('');
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-3.5">
                  {/* Seletor de Marketplace */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Marketplace do Produto *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProductMarketplace('mercadolivre')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition border',
                          productMarketplace === 'mercadolivre'
                            ? 'bg-[#FFE600] text-slate-950 border-[#FFE600] shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        Mercado Livre
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductMarketplace('shopee')}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition border',
                          productMarketplace === 'shopee'
                            ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        )}
                      >
                        <span className="h-2 w-2 rounded-full bg-white" />
                        Shopee
                      </button>
                    </div>
                  </div>

                  {/* Link de Afiliado com botão de OpenGraph */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Link de Afiliado Oficial *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required
                        value={productAffiliateUrl}
                        onChange={(e) => setProductAffiliateUrl(e.target.value)}
                        placeholder={
                          productMarketplace === 'shopee'
                            ? 'https://s.shopee.com.br/...'
                            : 'https://meli.la/... ou produto.mercadolivre...'
                        }
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                      <button
                        type="button"
                        onClick={handleFetchOgMetadata}
                        disabled={isFetchingOg}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition shrink-0"
                        title="Puxar título e dados da URL automaticamente"
                      >
                        {isFetchingOg ? '...' : 'Puxar Dados'}
                      </button>
                    </div>
                  </div>

                  {/* Título do Produto */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Título do Produto *
                    </label>
                    <input
                      type="text"
                      required
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      placeholder="Ex: Fritadeira Air Fryer 4L Mondial"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                  </div>

                  {/* Preços e Desconto */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Preço Original (R$)
                      </label>
                      <input
                        type="text"
                        value={productOriginalPrice}
                        onChange={(e) => setProductOriginalPrice(e.target.value)}
                        placeholder="Ex: 399,90"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Preço Atual c/ Desconto (R$) *
                      </label>
                      <input
                        type="text"
                        required
                        value={productCurrentPrice}
                        onChange={(e) => setProductCurrentPrice(e.target.value)}
                        placeholder="Ex: 249,90"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                      />
                    </div>
                  </div>

                  {discountPercent > 0 && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 flex items-center justify-between">
                      <span>Desconto Calculado:</span>
                      <span>{discountPercent}% OFF</span>
                    </div>
                  )}

                  {/* Categoria */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Categoria *
                    </label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                    >
                      {CATEGORIES.filter((c) => c !== 'Todos').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* URL da Imagem */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      URL da Imagem
                    </label>
                    <input
                      type="url"
                      value={productImageUrl}
                      onChange={(e) => setProductImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                    {productImageUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={productImageUrl}
                          alt="Preview"
                          className="h-10 w-10 object-contain rounded-lg border border-slate-800 bg-white"
                          onError={(e) => {
                            e.currentTarget.src = '/icons/icon-192x192.png';
                          }}
                        />
                        <span className="text-[11px] text-slate-400">Prévia da imagem carregada</span>
                      </div>
                    )}
                  </div>

                  {/* Parcelamento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Texto de Parcelamento
                    </label>
                    <input
                      type="text"
                      value={productInstallments}
                      onChange={(e) => setProductInstallments(e.target.value)}
                      placeholder="Ex: em 6x sem juros"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productIsActive}
                        onChange={(e) => setProductIsActive(e.target.checked)}
                        className="rounded accent-[#FFE600]"
                      />
                      <span>Ativo na Vitrine</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productFeatured}
                        onChange={(e) => setProductFeatured(e.target.checked)}
                        className="rounded accent-[#FFE600]"
                      />
                      <span>Destaque</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productFreeShipping}
                        onChange={(e) => setProductFreeShipping(e.target.checked)}
                        className="rounded accent-[#FFE600]"
                      />
                      <span>Frete Grátis</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={productIsFull}
                        onChange={(e) => setProductIsFull(e.target.checked)}
                        className="rounded accent-[#FFE600]"
                      />
                      <span>Envio Rápido (FULL)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 rounded-2xl bg-[#FFE600] py-3 text-xs font-black text-slate-950 hover:bg-yellow-400 active:scale-[0.98] transition shadow-lg shadow-yellow-500/10"
                  >
                    {editingProductId ? 'Salvar Alterações' : 'Cadastrar Oferta na Vitrine'}
                  </button>
                </form>
              </div>

              {/* Lista de Produtos Cadastrados */}
              <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                    <div>
                      <h2 className="font-black text-white text-base">
                        Catálogo Ativo ({filteredProducts.length})
                      </h2>
                      <p className="text-xs text-slate-400">
                        Produtos cadastrados disponíveis para os clientes
                      </p>
                    </div>

                    {/* Filtro por Marketplace */}
                    <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => setMarketFilter('todos')}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                          marketFilter === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarketFilter('mercadolivre')}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                          marketFilter === 'mercadolivre' ? 'bg-[#FFE600] text-slate-950' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        ML
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarketFilter('shopee')}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-bold transition',
                          marketFilter === 'shopee' ? 'bg-[#EE4D2D] text-white' : 'text-slate-400 hover:text-white'
                        )}
                      >
                        Shopee
                      </button>
                    </div>
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative mb-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar por título ou código MLB..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                    />
                  </div>

                  {/* Tabela / Cards de Produtos */}
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {filteredProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs">
                        Nenhum produto encontrado com os filtros selecionados.
                      </div>
                    ) : (
                      filteredProducts.map((p) => {
                        const isShopee = p.marketplace === 'shopee';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.imageUrl}
                                alt={p.title}
                                className="h-12 w-12 object-contain rounded-xl border border-slate-800 bg-white shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = '/icons/icon-192x192.png';
                                }}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span
                                    className={cn(
                                      'rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase',
                                      isShopee ? 'bg-[#EE4D2D] text-white' : 'bg-[#FFE600] text-slate-950'
                                    )}
                                  >
                                    {isShopee ? 'Shopee' : 'ML'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {p.category}
                                  </span>
                                  {p.featured && (
                                    <span className="text-[10px] text-amber-400 font-bold">★ Destaque</span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                                  {p.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs mt-0.5">
                                  <span className="font-extrabold text-emerald-400">
                                    {formatBRL(p.currentPrice)}
                                  </span>
                                  {p.discountPercent > 0 && (
                                    <span className="text-[10px] text-slate-400">
                                      ({p.discountPercent}% OFF)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setProductMarketplace(p.marketplace || 'mercadolivre');
                                  setProductTitle(p.title);
                                  setProductAffiliateUrl(p.affiliateUrl);
                                  setProductCurrentPrice(p.currentPrice.toString());
                                  setProductOriginalPrice(p.originalPrice.toString());
                                  setProductCategory(p.category);
                                  setProductImageUrl(p.imageUrl);
                                  setProductInstallments(p.installmentsText);
                                  setProductFeatured(p.featured);
                                  setProductFreeShipping(p.freeShipping);
                                  setProductIsFull(p.isFull);
                                  setProductIsActive(p.status === 'ativo');
                                }}
                                className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Excluir "${p.title}"?`)) {
                                    c.remove(p.id);
                                    toast.success('Produto removido.');
                                  }
                                }}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition"
                                title="Excluir produto"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2: CLIENTES SAAS & GESTÃO MULTI-TENANT (SUPER ADMIN) */}
          {/* ========================================================================= */}
          <TabsContent value="saas" className="space-y-6">
            {/* Cards de Métricas SaaS */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                <span className="text-xs font-bold text-slate-400">Total de Lojas</span>
                <p className="mt-1 text-2xl font-black text-white">{saasMetrics.total}</p>
                <span className="text-[10px] text-slate-500">Lojas cadastradas</span>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                <span className="text-xs font-bold text-emerald-400">Lojas Ativas</span>
                <p className="mt-1 text-2xl font-black text-emerald-400">{saasMetrics.active}</p>
                <span className="text-[10px] text-slate-500">Vitrines no ar</span>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                <span className="text-xs font-bold text-red-400">Inadimplentes</span>
                <p className="mt-1 text-2xl font-black text-red-400">{saasMetrics.suspended}</p>
                <span className="text-[10px] text-slate-500">Vitrines bloqueadas</span>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-4">
                <span className="text-xs font-bold text-[#FFE600]">MRR Estimado</span>
                <p className="mt-1 text-2xl font-black text-[#FFE600]">R$ {saasMetrics.mrr.toFixed(2)}</p>
                <span className="text-[10px] text-slate-500">Receita recorrente/mês</span>
              </div>
            </div>

            {/* Cabeçalho da Lista + Botão de Nova Loja */}
            <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="font-black text-white text-base sm:text-lg">
                    Gestão de Assinantes SaaS
                  </h2>
                  <p className="text-xs text-slate-400">
                    Controle de planos, lojas clientes e bloqueio imediato por inadimplência
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadStores}
                    disabled={loadingStores}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', loadingStores && 'animate-spin')} />
                    <span>Atualizar</span>
                  </button>
                  <button
                    onClick={() => setNewStoreModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFE600] px-4 py-2 text-xs font-black text-slate-950 hover:bg-yellow-400 transition shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nova Loja Cliente</span>
                  </button>
                </div>
              </div>

              {/* Tabela de Lojas */}
              <div className="space-y-3">
                {stores.map((s) => {
                  const isActive = s.statusAssinatura === 'ativo';
                  const planInfo = PLANO_PRICES[s.plano] || PLANO_PRICES.start;

                  return (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner"
                          style={{ backgroundColor: s.corPrimaria, color: s.corDestaque }}
                        >
                          {s.nomeLoja.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-white text-sm sm:text-base">
                              {s.nomeLoja}
                            </h3>
                            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                              /{s.slug}
                            </span>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase',
                                isActive
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              )}
                            >
                              {s.statusAssinatura}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Plano: <strong className="text-white">{planInfo.name}</strong> ({planInfo.price})
                            {s.shopeeAppId && ' • Shopee API Conectada'}
                          </p>
                        </div>
                      </div>

                      {/* Controles de Status da Assinatura (usando React.startTransition) */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-1.5 border border-slate-800">
                          <span className="text-xs font-semibold text-slate-400">
                            Status da Loja:
                          </span>
                          <button
                            type="button"
                            disabled={isPendingStatus}
                            onClick={() => handleToggleStoreStatus(s.id, s.statusAssinatura)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1',
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            )}
                          >
                            {isActive ? 'Ativo' : 'Inadimplente'}
                          </button>
                        </div>

                        <a
                          href={`/?loja=${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          title="Abrir vitrine da loja"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3: FILA DO RADAR (PENDENTE AFILIADO) */}
          {/* ========================================================================= */}
          <TabsContent value="radar" className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h2 className="font-black text-white text-base sm:text-lg">
                    Fila de Aprovação do Radar ({c.pendingProducts.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Achadinhos coletados automaticamente aguardando confirmação de link
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => c.syncRadar()}
                    disabled={c.isSyncing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', c.isSyncing && 'animate-spin')} />
                    <span>Atualizar Fila</span>
                  </button>
                  {c.pendingProducts.length > 0 && (
                    <button
                      onClick={() => {
                        const ids = c.pendingProducts.map((p) => p.id);
                        c.batchApprovePending(ids);
                        toast.success(`${ids.length} ofertas aprovadas em lote!`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      <Check className="h-4 w-4" />
                      <span>Aprovar Todos ({c.pendingProducts.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {c.pendingProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                  <p className="font-bold text-white text-sm">Fila do Radar limpa!</p>
                  <p className="mt-1 text-slate-500">
                    Todos os achadinhos garimpados já foram publicados na vitrine.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {c.pendingProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-12 w-12 object-contain rounded-xl border border-slate-800 bg-white shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = '/icons/icon-192x192.png';
                          }}
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-amber-400">
                            {p.category} • {p.discountPercent}% OFF
                          </span>
                          <h4 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-lg">
                            {p.title}
                          </h4>
                          <span className="text-xs font-extrabold text-emerald-400">
                            {formatBRL(p.currentPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            c.approveProduct(p.id);
                            toast.success('Oferta aprovada e publicada!');
                          }}
                          className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            c.rejectPending(p.id);
                            toast.info('Item descartado.');
                          }}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4: CONFIGURAÇÕES GERAIS */}
          {/* ========================================================================= */}
          <TabsContent value="config" className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-xl max-w-2xl">
              <h2 className="font-black text-white text-base sm:text-lg mb-1">
                Credenciais Globais & Integrações
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Parâmetros compartilhados de afiliados e chaves de APIs
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tag Oficial Mercado Livre (matt_tool)
                  </label>
                  <input
                    type="text"
                    disabled
                    value="kd20250113073553"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Configurada via .env.local</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Shopee Affiliate Open API (App ID)
                  </label>
                  <input
                    type="text"
                    placeholder="Configure SHOPEE_APP_ID no .env.local ou na loja SaaS"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Shopee Secret
                  </label>
                  <input
                    type="password"
                    placeholder="Configure SHOPEE_SECRET no .env.local ou na loja SaaS"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 mt-4">
                  <h4 className="text-xs font-bold text-white mb-1">
                    Como executar a automação Shopee:
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Você pode disparar o robô Shopee via terminal executando:
                  </p>
                  <pre className="mt-2 rounded-xl bg-slate-900 p-2.5 text-[11px] font-mono text-[#FFE600] overflow-x-auto">
                    node scripts/sincronizar-shopee.mjs
                  </pre>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Ou agendar requisições HTTP GET/POST para o endpoint <strong>/api/cron-shopee</strong> na Vercel.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Nova Loja SaaS */}
        {newStoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0F172A] p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-base font-black text-white">Criar Nova Loja SaaS Cliente</h3>
                <button
                  onClick={() => setNewStoreModal(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNewStore} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Slug da Loja (URL) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreSlug}
                    onChange={(e) => setNewStoreSlug(e.target.value)}
                    placeholder="ex: modabrasil, achadostop"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="ex: Moda Brasil Achados"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#FFE600]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Plano de Assinatura *
                  </label>
                  <select
                    value={newStorePlan}
                    onChange={(e) => setNewStorePlan(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-[#FFE600]"
                  >
                    <option value="start">Start — R$ 67/mês (Até 100 ofertas)</option>
                    <option value="pro">Pro — R$ 117/mês (Ofertas ilimitadas + ML & Shopee)</option>
                    <option value="advanced">Advanced — R$ 197/mês (Robô dedicado + IA + Domínio próprio)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Cor Primária
                    </label>
                    <input
                      type="text"
                      value={newStorePrimaryColor}
                      onChange={(e) => setNewStorePrimaryColor(e.target.value)}
                      placeholder="#0F172A"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Cor de Destaque
                    </label>
                    <input
                      type="text"
                      value={newStoreAccentColor}
                      onChange={(e) => setNewStoreAccentColor(e.target.value)}
                      placeholder="#FFE600"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Link Grupo VIP WhatsApp
                  </label>
                  <input
                    type="url"
                    value={newStoreWhatsapp}
                    onChange={(e) => setNewStoreWhatsapp(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStoreModal(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#FFE600] px-4 py-2 text-xs font-black text-slate-950 hover:bg-yellow-400 transition"
                  >
                    Criar Loja
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
