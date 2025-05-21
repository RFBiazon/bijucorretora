-- Criação da tabela para armazenar dados financeiros dos documentos
CREATE TABLE IF NOT EXISTS dados_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  documento_id UUID NOT NULL REFERENCES ocr_processamento(id) ON DELETE CASCADE,
  forma_pagamento TEXT,
  quantidade_parcelas INTEGER DEFAULT 1,
  valor_total DECIMAL(10,2) DEFAULT 0,
  premio_liquido DECIMAL(10,2) DEFAULT 0,
  premio_bruto DECIMAL(10,2) DEFAULT 0,
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_editor TEXT,
  fonte TEXT DEFAULT 'documento', -- 'documento', 'manual', 'misto'
  tipo_documento TEXT,
  dados_confirmados BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance de consultas por documento
CREATE INDEX IF NOT EXISTS idx_dados_financeiros_documento_id ON dados_financeiros(documento_id);

-- Criação da tabela para armazenar parcelas de pagamento
CREATE TABLE IF NOT EXISTS parcelas_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dados_financeiros_id UUID NOT NULL REFERENCES dados_financeiros(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT DEFAULT 'pendente', -- 'pendente', 'pago', 'atrasado', 'cancelado'
  detalhes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance de consultas por dados financeiros
CREATE INDEX IF NOT EXISTS idx_parcelas_dados_financeiros_id ON parcelas_pagamento(dados_financeiros_id);
-- Índice para melhorar performance de consultas por data de vencimento
CREATE INDEX IF NOT EXISTS idx_parcelas_data_vencimento ON parcelas_pagamento(data_vencimento);
-- Índice para melhorar performance de consultas por status
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas_pagamento(status);

-- Configurações de RLS (Row Level Security) para as tabelas
ALTER TABLE dados_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_pagamento ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela dados_financeiros
CREATE POLICY "Leitura pública dos dados financeiros"
  ON dados_financeiros
  FOR SELECT
  USING (true);

CREATE POLICY "Inserção de dados financeiros apenas para usuários autenticados"
  ON dados_financeiros
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Atualização de dados financeiros apenas para usuários autenticados"
  ON dados_financeiros
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Exclusão de dados financeiros apenas para usuários autenticados"
  ON dados_financeiros
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Políticas para a tabela parcelas_pagamento
CREATE POLICY "Leitura pública das parcelas"
  ON parcelas_pagamento
  FOR SELECT
  USING (true);

CREATE POLICY "Inserção de parcelas apenas para usuários autenticados"
  ON parcelas_pagamento
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Atualização de parcelas apenas para usuários autenticados"
  ON parcelas_pagamento
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Exclusão de parcelas apenas para usuários autenticados"
  ON parcelas_pagamento
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Criação de função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at quando uma parcela for atualizada
CREATE TRIGGER update_parcelas_updated_at
BEFORE UPDATE ON parcelas_pagamento
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar parcelas vencidas e atualizar status
CREATE OR REPLACE FUNCTION verificar_parcelas_vencidas()
RETURNS VOID AS $$
BEGIN
  -- Atualiza status para 'atrasado' quando a data de vencimento passar e não estiver pago
  UPDATE parcelas_pagamento
  SET status = 'atrasado'
  WHERE 
    data_vencimento < CURRENT_DATE AND 
    status = 'pendente' AND
    data_pagamento IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Agenda a execução da função diariamente (precisa configurar pg_cron no Supabase)
-- SELECT cron.schedule('0 0 * * *', 'SELECT verificar_parcelas_vencidas()');
-- Nota: Se o Supabase não suportar pg_cron, esta linha ficará comentada 