-- Migração: Central de Treinamento em Vídeo da Mascote Clarice (tutoriais_saas)
-- Tabela para gerenciamento e exibição de aulas e roteiros para lojistas assinantes

CREATE TABLE IF NOT EXISTS public.tutoriais_saas (
  id TEXT PRIMARY KEY,
  ordem INT NOT NULL DEFAULT 1,
  titulo TEXT NOT NULL,
  duracao TEXT NOT NULL DEFAULT '01:00',
  descricao TEXT NOT NULL,
  video_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tutoriais_saas ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública para todos os usuários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tutoriais_saas' AND policyname = 'Leitura pública de tutoriais'
  ) THEN
    CREATE POLICY "Leitura pública de tutoriais"
      ON public.tutoriais_saas FOR SELECT
      USING (true);
  END IF;
END $$;

-- Política de Escrita / Atualização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tutoriais_saas' AND policyname = 'Escrita e atualização de tutoriais'
  ) THEN
    CREATE POLICY "Escrita e atualização de tutoriais"
      ON public.tutoriais_saas FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- População dos 5 registros iniciais de aulas práticas
INSERT INTO public.tutoriais_saas (id, ordem, titulo, duracao, descricao, video_url)
VALUES
  (
    'aula-1',
    1,
    'Conhecendo seu Painel e sua Vitrine',
    '01:00',
    'Aprenda como sua vitrine exclusiva funciona, como navegar entre as abas do painel e conferir suas vendas.',
    NULL
  ),
  (
    'aula-2',
    2,
    'Deixando a Loja com a sua Cara (Logo, Banner e Cores)',
    '01:00',
    'Personalize o nome da loja, cores de destaque, envie seu logotipo e o banner hero da vitrine.',
    NULL
  ),
  (
    'aula-3',
    3,
    'Cadastrando Produtos do Mercado Livre e Shopee',
    '01:00',
    'Aprenda a puxar produtos de afiliados por link individual ou através da importação em lote com 1 clique.',
    NULL
  ),
  (
    'aula-4',
    4,
    'Usando o Disparador VIP no Grupo de WhatsApp',
    '01:00',
    'Gere copies persuasivas em 1 clique e envie para o seu Grupo VIP sem repetir promoções já enviadas hoje.',
    NULL
  ),
  (
    'aula-5',
    5,
    'Como Divulgar seu Link e Gerenciar seu Plano',
    '01:00',
    'Estratégias para divulgar seu link na Bio e canais sociais, além de como acompanhar faturas e upgrades.',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  ordem = EXCLUDED.ordem,
  titulo = EXCLUDED.titulo,
  duracao = EXCLUDED.duracao,
  descricao = EXCLUDED.descricao;
