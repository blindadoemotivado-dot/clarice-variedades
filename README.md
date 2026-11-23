# Clarice Achadinhos & Rede SaaS FCIA

Plataforma de alta conversão para vitrines de afiliados (Mercado Livre e Shopee) com arquitetura Multi-Tenant White-Label desenvolvida pela **FCIA — Fernando Cabral Inteligência Artificial**.

---

## 🚀 Destaques da Plataforma

- **Vitrine Matriz Clarice Achadinhos:** Curadoria oficial com identidade visual consolidada e redirecionamento seguro para Mercado Livre e Shopee.
- **SaaS Multi-Tenant para Afiliados:** Qualquer lojista pode criar sua vitrine (`/criar-loja`) e gerenciar produtos, branding e grupo VIP de WhatsApp de forma 100% isolada via `/?loja=slug` ou domínio próprio (CNAME).
- **Planos Start, Pro e Advanced:** Sistema modular de controle de permissões (`src/config/planPermissions.ts`) com limites de catálogo, importador em lote e disparador de mensagens VIP.
- **Cobrança Recorrente via Asaas:** Assinaturas mensais automáticas com webhook de ativação instantânea e fila de aprovação de lojistas no painel Super Admin.
- **Storage Otimizado:** Upload direto de logotipos, banners e produtos no Supabase Storage (`store-assets`) com compressão automática em WebP e fallback client-side.

---

## 📚 Documentação Técnica Completa

Para a especificação detalhada da arquitetura, schemas de banco de dados, fluxo de webhooks do Asaas e Procedimento Operacional Padrão (POP/SOP), consulte o documento oficial:

👉 **[DOCUMENTACAO_MASTER_SAAS_FCIA.md](DOCUMENTACAO_MASTER_SAAS_FCIA.md)**

---

## 🛠️ Stack Tecnológica

- **Frontend & SSR:** React 19, TypeScript, TanStack Router, TanStack Start, Nitro Engine
- **Estilização:** Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion
- **Banco de Dados & Storage:** Supabase (PostgreSQL, Storage, RLS)
- **Gateways & APIs:** Asaas (Cobranças/Assinaturas), Mercado Livre & Shopee Scrapers
- **Qualidade & Testes:** Vitest, Testing Library
- **Deploy:** Vercel Serverless / Cloudflare Pages

---

## 💻 Desenvolvimento Local

### 1. Clonar e Instalar Dependências
```bash
git clone <url-do-repositorio>
cd "CLARICE VARIEDADES"
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as chaves necessárias:
```ini
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
VITE_ADMIN_PIN=seu_pin_de_seguranca
ASAAS_API_KEY=$aact_...
ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=seu_token_webhook
```

### 3. Rodar em Modo de Desenvolvimento
```bash
npm run dev
```

### 4. Executar Testes Automatizados
```bash
npm test
```

### 5. Build de Produção
```bash
npm run build
```

---

## 📄 Licença e Atribuição

Desenvolvido e mantido por **FCIA — Fernando Cabral Inteligência Artificial**.  
Todos os direitos reservados © 2026.
