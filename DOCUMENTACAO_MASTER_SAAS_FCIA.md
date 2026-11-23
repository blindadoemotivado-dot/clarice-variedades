# Documentação Master — Plataforma SaaS Multi-Tenant FCIA
## Clarice Achadinhos & Rede de Vitrines Afiliadas

> **Versão:** 2.0.0 (Produção)  
> **Arquitetura:** Multi-Tenant White-Label Afiliados (Mercado Livre + Shopee)  
> **Mantenedor & Engenharia:** FCIA — Fernando Cabral Inteligência Artificial  
> **Ambientes:** Web (PWA), SSR (Nitro/Cloudflare/Vercel Serverless)

---

## 1. Visão Geral da Plataforma

A plataforma **Clarice Achadinhos** é uma infraestrutura de alta conversão para o mercado de afiliados, combinando e-commerce headless, curadoria de ofertas automatizada com IA e um modelo **SaaS Multi-Tenant B2B**.

### Modos de Operação:
1. **Vitrine Matriz (`slug: clarice`)**:
   - Acessível diretamente no domínio principal (`/`).
   - Identidade visual oficial da marca Clarice (mascote, selos, branding oficial).
2. **Vitrines de Lojistas Parceiros (`slug !== clarice`)**:
   - Acessíveis via parâmetro de query (`/?loja=slug-da-loja`) ou via **Domínio Próprio (CNAME)** no plano Advanced (ex.: `achadinhos.seusite.com.br`).
   - Identidade 100% isolada e personalizada (monograma ou logo customizado, banner hero dedicado, paleta de cores própria, grupo VIP do WhatsApp exclusivo e links de afiliados próprios).
   - Sem herança de logo, mascote ou textos da Clarice por padrão.

---

## 2. Arquitetura Modular Frontend & Admin

O projeto segue estritamente o princípio de **isolamento modular**: cada funcionalidade reside em seu próprio módulo, com tipagem TypeScript estrita e sem dependências circulares.

```
src/
├── config/
│   ├── planPermissions.ts          # Matriz única de permissões dos planos (Start, Pro, Advanced)
│   └── planPermissions.test.ts     # Testes unitários do motor de planos
├── components/
│   ├── admin/
│   │   ├── PlanGate.tsx            # Componente de bloqueio e upsell contextual por plano
│   │   ├── PlanGate.test.tsx       # Testes unitários do PlanGate
│   │   ├── LojistaStoreSettings.tsx# Gestão visual (Logo, Banner, Cores, WhatsApp)
│   │   ├── LojistaBatchImport.tsx  # Importador em lote com limites por plano
│   │   └── LojistaVipDispatcher.tsx# Gerador e disparador de copies para grupos VIP
│   └── store/
│       ├── HeroBanner.tsx          # Banner da vitrine adaptativo (Matriz vs. Lojista)
│       ├── AdminSheet.tsx          # Drawer administrativo lateral
│       └── AdminPinDialog.tsx      # Modal de autenticação segura via PIN
├── services/
│   ├── tenantService.ts            # Camada de dados multi-tenant (Lojas, Assinaturas)
│   ├── storageService.ts           # Upload e compressão de imagens (Supabase Storage)
│   └── radarServerFn.ts            # Ingestão e sincronização de produtos
└── routes/
    ├── index.tsx                   # Vitrine pública (Matriz e Multi-Tenant)
    ├── admin.tsx                   # Painel Administrativo unificado (Super Admin + Lojistas)
    └── criar-loja.tsx              # Onboarding público e contratação de vitrines
```

---

## 3. Matriz de Planos & Permissões (`PLAN_PERMISSIONS`)

Definida em `src/config/planPermissions.ts` e validada por suíte de testes automatizados:

| Funcionalidade / Recurso | Plano Start (R$ 67/mês) | Plano Pro (R$ 117/mês) | Plano Advanced (R$ 197/mês) |
| :--- | :---: | :---: | :---: |
| **Limite de Produtos Ativos** | Até 50 produtos | **Ilimitado** | **Ilimitado** |
| **Importação em Lote (Batch)** | ❌ Desabilitado (0 itens) | ✅ Até 20 URLs por vez | 🚀 Até 50 URLs por vez |
| **Identidade Visual Completa** | ✅ Logo, Banner e Cores | ✅ Logo, Banner e Cores | ✅ Logo, Banner e Cores |
| **Disparador VIP WhatsApp** | 🟡 1 Template Básico | 🟢 3 Templates + Histórico de Disparos | 🟢 3 Templates + Histórico de Disparos |
| **Domínio Próprio (CNAME)** | ❌ Acesso via `/?loja=slug` | ❌ Acesso via `/?loja=slug` | 🌐 **Liberado** (`cname.seudominio.com.br`) |
| **Suporte Operacional** | E-mail / WhatsApp | E-mail / WhatsApp Prioritário | Canal Exclusivo FCIA |

### Bloqueio e Upsell Dinâmico (`PlanGate`):
Quando um lojista tenta usar um recurso além do seu plano (ex.: importação em lote no plano Start, ou disparador avançado), a interface renderiza suavemente um card explicativo com os benefícios do plano superior e botão direto para upgrade via WhatsApp ou checkout Asaas.

---

## 4. Banco de Dados & Armazenamento (Supabase)

### 4.1. Tabela `public.lojas_afiliados`
Armazena a configuração e credenciais de cada vitrine multi-tenant:
- `slug` (`TEXT PRIMARY KEY`): Identificador único da loja na URL.
- `nome` (`TEXT`): Nome comercial exibido no topo e nos metadados.
- `subtitulo` (`TEXT`): Frase de destaque ou proposta de valor da loja.
- `owner_email` (`TEXT`): E-mail do proprietário para login.
- `owner_password` (`TEXT`): Senha de acesso ao painel lojista.
- `whatsapp_contato` (`TEXT`): WhatsApp comercial do lojista para suporte e notificações.
- `whatsapp_vip_url` (`TEXT`): Link de convite do grupo VIP oficial no WhatsApp.
- `cpf_cnpj` (`TEXT`): Documento fiscal cadastrado para faturamento Asaas.
- `plano` (`TEXT`): `'start'`, `'pro'` ou `'advanced'`.
- `status_assinatura` (`TEXT`): `'pendente'`, `'ativo'`, `'trial'`, `'inadimplente'`, `'suspenso'`.
- `vencimento_em` (`TIMESTAMPTZ`): Data de expiração do ciclo atual.
- `cor_primaria` (`TEXT`): Cor base (fundo/botões) em formato Hex.
- `cor_destaque` (`TEXT`): Cor de ênfase (badges/monogramas) em formato Hex.
- `logo_url` (`TEXT`): URL da imagem do logotipo da loja (nulo por padrão para lojistas).
- `banner_url` (`TEXT`): URL do banner hero ou mascote própria.
- `custom_domain` (`TEXT`): Domínio próprio apontado via CNAME (Plano Advanced).
- `asaas_customer_id` / `asaas_subscription_id` (`TEXT`): Vínculos com o gateway Asaas.

### 4.2. Tabela `public.produtos_clarice`
Armazena os itens curados do catálogo:
- `id` (`UUID PRIMARY KEY`): Identificador do registro.
- `loja_slug` (`TEXT REFERENCES lojas_afiliados(slug)`): Chave de tenant isolando produtos de cada loja.
- `mlb_id` (`TEXT`): ID do produto no Mercado Livre (ex.: `MLB-1234567890`).
- `shopee_item_id` (`TEXT`): ID do produto na Shopee quando aplicável.
- `marketplace` (`TEXT`): `'mercadolivre'` ou `'shopee'`.
- `titulo`, `preco_atual`, `preco_original`, `desconto_percentual` (`TEXT` / `NUMERIC`).
- `imagem_url` (`TEXT`): Foto do produto hospedada no marketplace ou no Supabase Storage.
- `afiliado_url` (`TEXT`): Link com a tag oficial de afiliado do lojista.
- `categoria` (`TEXT`): Segmento do produto ('Casa & Cozinha', 'Eletrônicos', etc.).
- `frete_gratis`, `is_full`, `destaque`, `ativo` (`BOOLEAN`).
- `ultimo_disparo_em` (`TIMESTAMPTZ`): Data/hora do último disparo realizado no WhatsApp VIP.

### 4.3. Bucket Supabase Storage: `store-assets`
- **Finalidade:** Hospedagem pública de logos, banners hero e imagens de produtos enviados pelos lojistas e pelo Super Admin.
- **Estrutura de Pastas:**
  - `logos/{loja_slug}/...`
  - `banners/{loja_slug}/...`
  - `produtos/{loja_slug}/...`
- **Fallback Automático:** Caso o bucket ou credenciais de gravação estejam indisponíveis momentaneamente, o serviço `storageService.ts` converte e comprime a imagem em WebP Base64 otimizado (largura máxima 1200px, 80% qualidade), garantindo que o painel nunca trave o usuário.

---

## 5. Integração Financeira Asaas (Assinaturas Recorrentes)

A plataforma integra-se de ponta a ponta com o **Asaas** para gestão de faturamento e ciclo de vida das lojas assinantes.

### Endpoints Serverless:
1. `POST /api/asaas/checkout`:
   - Recebe dados do lojista (`loja_slug`, `nome`, `email`, `cpfCnpj`, `whatsapp`, `plano`).
   - Cria o cliente no Asaas caso não exista.
   - Gera a assinatura mensal recorrente (`CYCLE: MONTHLY`).
   - Registra ou atualiza a loja em `public.lojas_afiliados` com `status_assinatura: 'pendente'` (ou `'ativo'` caso em modo trial ou aprovado).
2. `POST /api/asaas/webhook`:
   - Recebe notificações em tempo real do Asaas com assinatura `asaas-access-token`.
   - Eventos tratados:
     - `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`: Atualiza `status_assinatura = 'ativo'` e prorroga `vencimento_em` para +30 dias.
     - `PAYMENT_OVERDUE`: Atualiza `status_assinatura = 'inadimplente'`.
     - `PAYMENT_DELETED`: Atualiza `status_assinatura = 'suspenso'`.

---

## 6. Procedimento Operacional Padrão (POP / SOP)

### 6.1. Fluxo de Auto-Cadastro de Novo Lojista
1. O interessado acessa a página pública `/criar-loja`.
2. Escolhe o plano desejado (`start`, `pro` ou `advanced`).
3. Preenche Nome da Loja, Slug desejado, E-mail, Senha de Acesso, WhatsApp e CPF/CNPJ.
4. Ao clicar em **"Finalizar Cadastro e Criar Loja"**, o sistema realiza a validação de slug e envia para a fila de aprovação (`status_assinatura: 'pendente'`).

### 6.2. Aprovação Manual pelo Super Admin (`/admin`)
1. O Super Admin acessa `/admin`, digita o PIN mestre de segurança e faz login.
2. Na aba **"Lojas SaaS"**, localiza o card do lojista na seção **"Solicitações de Cadastro Pendentes"**.
3. Revisa o documento (CPF/CNPJ), contato de WhatsApp e plano selecionado.
4. Clica em **"Aprovar Loja"**:
   - O status é alterado imediatamente para `'ativo'`.
   - O vencimento inicial é estendido por 30 dias.
   - O lojista já pode acessar seu painel pelo e-mail e senha cadastrados.

### 6.3. Operação Diária do Lojista Assinante
1. O lojista entra em `/admin` na aba **"Sou Lojista Assinante"**.
2. Digita seu e-mail e senha cadastrados.
3. No painel exclusivo do lojista:
   - **Header:** Botão **"↗ Ver Minha Vitrine"** abre a vitrine do lojista em nova aba (`/?loja=slug`).
   - **Minha Loja:** Envia logotipo, personaliza cores da marca e adiciona o link do Grupo VIP do WhatsApp.
   - **Meus Produtos:** Cadastra produtos via link único do Mercado Livre/Shopee com preenchimento assistido por IA e upload de imagem.
   - **Importação em Lote:** (Planos Pro e Advanced) Cola múltiplos links para ingestão simultânea.
   - **Disparador VIP:** Gera copies persuasivas de alta conversão para o WhatsApp em 1 clique e marca produtos já disparados.

---

## 7. Guia de Deploy & Variáveis de Ambiente

### Variáveis Obrigatórias na Vercel:
| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL pública da API do Supabase | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada de serviço (Serverless / Nitro) | `eyJhbGciOi...` |
| `VITE_ADMIN_PIN` | Senha/PIN de acesso ao Super Admin | `seu_pin_forte_2026` |
| `ASAAS_API_KEY` | Chave de API de produção do Asaas | `$aact_Y2...` |
| `ASAAS_API_URL` | URL base da API Asaas | `https://api.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | Token de validação do webhook Asaas | `token_secreto_webhook` |

### Comandos de Validação e Publicação:
```bash
# Executar testes unitários
npm test

# Executar build de produção
npm run build

# Publicar em produção na Vercel
npx vercel --prod --yes
```

---
*© 2026 FCIA — Fernando Cabral Inteligência Artificial. Todos os direitos reservados.*
