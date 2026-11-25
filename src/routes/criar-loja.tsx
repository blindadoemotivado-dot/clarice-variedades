import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  createStore,
  checkSlugAvailable,
  createAsaasCheckout,
} from '@/services/tenantService';
import {
  PLANO_PRICES,
  type SubscriptionPlan,
  type LojaAfiliado,
} from '@/types/tenant';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/criar-loja')({
  head: () => ({
    meta: [{ title: 'Criar Minha Loja de Achadinhos • Clarice Achadinhos' }],
  }),
  component: CriarLojaPage,
});

interface PlanOption {
  id: SubscriptionPlan;
  name: string;
  value: number;
  badge?: string;
  tagline: string;
  highlights: string[];
  extras: string[];
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'start',
    name: 'Start',
    value: 67,
    tagline: 'Para começar a vender',
    highlights: [
      'Até 50 produtos',
      'Mercado Livre e Shopee',
      'Grupo VIP no WhatsApp',
    ],
    extras: [
      'Sua logo, banner e cores',
      'Envio de ofertas para o grupo (1 modelo)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    value: 117,
    badge: 'Mais escolhido',
    tagline: 'O mais escolhido',
    highlights: [
      'Produtos ilimitados',
      'Cadastre até 20 produtos de uma vez',
      'Envio de ofertas pronto (3 modelos)',
    ],
    extras: [
      'Mercado Livre e Shopee',
      'Sua logo, banner e cores',
      'Histórico de ofertas enviadas',
      'Suporte prioritário',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    value: 197,
    tagline: 'Para vender em grande escala',
    highlights: [
      'Tudo do Pro',
      'Cadastre até 50 produtos de uma vez',
      'Seu próprio endereço (ex: minhaloja.com.br)',
    ],
    extras: [
      'Ofertas com a sua assinatura',
      'Ajuda para configurar sua loja',
    ],
  },
];

export function CriarLojaPage() {
  // Bloco 1 — Seus dados
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Bloco 2 — Sua loja
  const [nomeLoja, setNomeLoja] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  // Bloco 3 — Escolha seu plano
  const [plano, setPlano] = useState<SubscriptionPlan>('pro');
  const [expandedPlans, setExpandedPlans] = useState<Record<SubscriptionPlan, boolean>>({
    start: false,
    pro: false,
    advanced: false,
  });

  // Bloco 4 — CPF ou CNPJ
  const [cpfCnpj, setCpfCnpj] = useState('');

  // Estado de envio e tela de confirmação
  const [submitting, setSubmitting] = useState(false);
  const [successStore, setSuccessStore] = useState<LojaAfiliado | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  // Auto-geração e validação de slug
  useEffect(() => {
    if (!slugManual && nomeLoja.trim()) {
      const generated = nomeLoja
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  }, [nomeLoja, slugManual]);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const isAvailable = await checkSlugAvailable(slug);
      setSlugStatus(isAvailable ? 'available' : 'unavailable');
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Formatação de WhatsApp
  const handleWhatsappChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 10) {
      setWhatsapp(raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3'));
    } else {
      setWhatsapp(raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3'));
    }
  };

  // Formatação de CPF/CNPJ
  const handleCpfCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 11) {
      setCpfCnpj(
        raw
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      );
    } else {
      setCpfCnpj(
        raw
          .slice(0, 14)
          .replace(/^(\d{2})(\d)/, '$1.$2')
          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
          .replace(/\.(\d{3})(\d)/, '.$1/$2')
          .replace(/(\d{4})(\d)/, '$1-$2')
      );
    }
  };

  // Submissão do Formulário
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !nome.trim() ||
      !whatsapp.trim() ||
      !email.trim() ||
      !password.trim() ||
      !nomeLoja.trim() ||
      !slug.trim() ||
      !cpfCnpj.trim()
    ) {
      toast.error('Preencha todos os campos do formulário para continuar.');
      return;
    }

    if (password.trim().length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (slugStatus === 'unavailable') {
      toast.error('O link escolhido já está em uso. Por favor, altere o endereço da sua loja.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cadastra a loja com status_assinatura = 'pendente'
      const created = await createStore({
        slug,
        nomeLoja: nomeLoja.trim(),
        subtitulo: `Achadinhos selecionados e ofertas imperdíveis por ${nomeLoja.trim()}`,
        plano,
        statusAssinatura: 'pendente',
        ownerEmail: email.trim().toLowerCase(),
        ownerPassword: password.trim(),
        whatsappContato: whatsapp.trim(),
        cpfCnpj: cpfCnpj.trim(),
      });

      // 2. Dispara a criação do checkout e assinatura no Asaas
      const checkoutRes = await createAsaasCheckout({
        loja_slug: created.slug,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        whatsapp: whatsapp.replace(/\D/g, ''),
        plano,
      });

      const finalPaymentUrl = checkoutRes.paymentUrl || `https://www.asaas.com/c/${created.slug}`;
      setPaymentUrl(finalPaymentUrl);
      setSuccessStore(created);
      toast.success('Sua loja foi criada com sucesso! Conclua o pagamento para ativar.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível concluir o cadastro. Verifique os dados ou fale com o suporte.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPlan = PLAN_OPTIONS.find((p) => p.id === plano) || PLAN_OPTIONS[1];

  // =========================================================================
  // TELA DE CONFIRMAÇÃO PÓS-CADASTRO
  // =========================================================================
  if (successStore) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 text-xs font-bold text-yellow-400 mb-2">
            <Clock className="h-3.5 w-3.5" /> Aguardando Confirmação
          </span>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Solicitação de Abertura Recebida!
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto">
            Sua loja <strong className="text-white">"{successStore.nomeLoja}"</strong> foi registrada com sucesso. Conclua o pagamento para ativar sua vitrine imediatamente.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400">Plano Escolhido:</span>
              <span className="font-bold text-white capitalize">{successStore.plano} ({PLANO_PRICES[successStore.plano]?.price})</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400">E-mail de Acesso:</span>
              <span className="font-mono text-zinc-200">{successStore.ownerEmail}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Endereço da Vitrine:</span>
              <span className="font-bold text-yellow-400 font-mono">clariceachadinhos.vercel.app/?loja={successStore.slug}</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {paymentUrl && (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 hover:bg-yellow-300 py-4 text-sm sm:text-base font-black text-zinc-950 shadow-lg shadow-yellow-400/20 transition active:scale-[0.98]"
              >
                <CreditCard className="h-5 w-5" />
                <span>Pagar Assinatura Agora (PIX / Cartão)</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-zinc-400 leading-relaxed text-left flex items-start gap-2">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Ativação Rápida:</strong> Assim que seu pagamento for confirmado, sua loja será ativada automaticamente e você poderá entrar no painel com seu e-mail e senha.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <a
                href="/admin"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition text-center"
              >
                Entrar no Painel da Loja
              </a>
              <a
                href="/"
                className="flex-1 rounded-xl border border-transparent py-3 text-xs font-semibold text-zinc-400 hover:text-white transition text-center"
              >
                Voltar para o Início
              </a>
            </div>
          </div>

          <footer className="mt-8 text-center text-[11px] text-zinc-600">
            © 2026 Clarice Achadinhos · Tecnologia FCIA — Profº Fernando Cabral
          </footer>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FORMULÁRIO DE CADASTRO MOBILE-FIRST
  // =========================================================================
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between w-full max-w-[100vw] overflow-x-hidden">
      {/* 1. Cabeçalho Enxuto */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src="/icons/icon-192x192.png"
              alt="Clarice Achadinhos"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-yellow-400 bg-zinc-900"
            />
            <span className="text-base font-extrabold tracking-tight text-white">
              Clarice Achadinhos
            </span>
          </a>

          <a
            href="/admin"
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition"
          >
            Já tenho loja? <span className="text-yellow-400 font-bold underline">Entrar</span>
          </a>
        </div>
      </header>

      {/* Conteúdo Principal com espaço para a barra fixa inferior (pb-36) */}
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10 flex-1 pb-36">
        {/* Hero Sem Jargão Técnico */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Crie sua loja de achadinhos e comece a vender hoje
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed">
            Divulgue produtos do Mercado Livre e da Shopee com a sua marca e ganhe comissão em cada venda.
          </p>

          {/* 3 Selos Curtos com Ícone Check Amarelo */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Check className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              Pronta em minutos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Check className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              Sem precisar de site
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Check className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
              Ganhe pelo WhatsApp
            </span>
          </div>
        </div>

        {/* Formulário com id="criar-loja-form" */}
        <form id="criar-loja-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Bloco 1 — Seus dados */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7 shadow-xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white border-b border-zinc-800 pb-3">
              1. Seus dados
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Seu nome
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como você quer ser chamada(o)"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com.br"
                    className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Crie uma senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 pl-4 pr-12 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  Você vai usar o e-mail e esta senha para entrar no painel da sua loja.
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 2 — Sua loja */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7 shadow-xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white border-b border-zinc-800 pb-3">
              2. Sua loja
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nome da loja
                </label>
                <input
                  type="text"
                  required
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  placeholder="Ex: Achadinhos da Carol"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                />
              </div>

              {/* Prévia Completa do Endereço */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400 font-medium">Endereço da sua vitrine:</span>
                  {!slugManual ? (
                    <button
                      type="button"
                      onClick={() => setSlugManual(true)}
                      className="text-xs font-bold text-yellow-400 hover:underline cursor-pointer"
                    >
                      alterar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSlugManual(false)}
                      className="text-xs text-zinc-400 hover:text-white hover:underline cursor-pointer"
                    >
                      gerar automático
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-sm sm:text-base font-mono break-all leading-snug">
                  <span className="text-zinc-400">clariceachadinhos.vercel.app/</span>
                  <span className="text-yellow-400 font-bold">{slug || 'sua-loja'}</span>
                </div>

                {slugStatus === 'checking' && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verificando endereço...</span>
                  </div>
                )}
                {slugStatus === 'available' && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 pt-1">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Endereço disponível para você</span>
                  </div>
                )}
                {slugStatus === 'unavailable' && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 pt-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span>Este endereço já foi utilizado. Escolha outro nome.</span>
                  </div>
                )}

                {slugManual && (
                  <div className="pt-3 border-t border-zinc-800/80">
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Editar final do link:
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                      placeholder="sua-loja"
                      className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white font-mono outline-none focus:border-yellow-400 transition"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloco 3 — Escolha seu plano (Recolhíveis, Pro pré-selecionado) */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7 shadow-xl space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white">
                3. Escolha seu plano
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Sem fidelidade. Cancele ou altere a qualquer momento.
              </p>
            </div>

            <div className="grid gap-4">
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = plano === plan.id;
                const isExpanded = Boolean(expandedPlans[plan.id]);

                return (
                  <div
                    key={plan.id}
                    onClick={() => setPlano(plan.id)}
                    className={cn(
                      'relative rounded-2xl border p-4 sm:p-5 cursor-pointer transition select-none',
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400/10 ring-2 ring-yellow-400'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    )}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 right-4 rounded-full bg-yellow-400 px-3 py-0.5 text-[10px] font-black uppercase text-zinc-950 shadow-md">
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">
                            {plan.name}
                          </h3>
                          <span className="text-xs text-zinc-400 italic">
                            — {plan.tagline}
                          </span>
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-white">
                        R$ {plan.value}
                        <span className="text-xs font-normal text-zinc-400">/mês</span>
                      </div>
                    </div>

                    {/* 3 Benefícios Principais */}
                    <ul className="mt-3.5 space-y-2 text-xs sm:text-sm text-zinc-200">
                      {plan.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-yellow-400 shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Botão Ver Tudo / Ver Menos (Accordion de Extras) */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPlans((prev) => ({
                            ...prev,
                            [plan.id]: !prev[plan.id],
                          }));
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:underline cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ver menos' : 'Ver tudo'}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <ul className="mt-2.5 space-y-1.5 text-xs text-zinc-300 animate-in fade-in duration-200">
                          {plan.extras.map((extra, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Check className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                              <span>{extra}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bloco 4 — CPF ou CNPJ (somente no final) */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7 shadow-xl space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white border-b border-zinc-800 pb-3">
              4. Emissão da assinatura
            </h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={cpfCnpj}
                onChange={(e) => handleCpfCnpjChange(e.target.value)}
                placeholder="000.000.000-00 ou CNPJ"
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 text-base text-white placeholder-zinc-500 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
              />
              <p className="mt-1.5 text-xs text-zinc-400">
                Para emitir a cobrança da sua assinatura.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3.5 text-xs text-zinc-400">
              <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Pagamento seguro. Sua loja é ativada assim que o pagamento for confirmado.
              </span>
            </div>
          </div>

          {/* Rodapé e Autoria FCIA */}
          <footer className="text-center text-xs text-zinc-500 pt-6 pb-2">
            <p>© 2026 Clarice Achadinhos · Tecnologia FCIA — Profº Fernando Cabral</p>
          </footer>
        </form>
      </main>

      {/* 3. Botão CTA Fixo no Rodapé Mobile + Proteção Contra Duplo Clique */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block text-left">
            <p className="text-xs text-zinc-400">Plano selecionado:</p>
            <p className="text-sm font-bold text-white capitalize">
              {currentPlan.name} · R$ {currentPlan.value}/mês
            </p>
          </div>

          <button
            type="submit"
            form="criar-loja-form"
            disabled={submitting || slugStatus === 'unavailable'}
            className="w-full sm:w-auto sm:min-w-[300px] h-14 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                <span>Criando sua loja...</span>
              </>
            ) : (
              <span>Criar minha loja · R$ {currentPlan.value}/mês</span>
            )}
          </button>
        </div>
      </div>

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
