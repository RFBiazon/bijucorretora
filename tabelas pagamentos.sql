-- Criação da tabela de dados financeiros
CREATE TABLE dados_financeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Chave estrangeira para vincular à tabela ocr_processamento
  documento_id UUID NOT NULL REFERENCES ocr_processamento(id) ON DELETE CASCADE,
  
  -- Dados gerais do pagamento
  forma_pagamento TEXT,
  quantidade_parcelas INTEGER,
  valor_total DECIMAL(10, 2),
  premio_liquido DECIMAL(10, 2),
  premio_bruto DECIMAL(10, 2),
  
  -- Metadados
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_editor TEXT,
  
  -- Indica se os dados foram extraídos do documento ou inseridos manualmente
  fonte TEXT CHECK (fonte IN ('documento', 'manual', 'misto')),
  
  -- Indica se é proposta, apólice, endosso, etc.
  tipo_documento TEXT,
  
  -- JSON para armazenar os dados originais extraídos
  dados_originais JSONB,
  
  -- Flag para indicar se os dados foram confirmados manualmente
  dados_confirmados BOOLEAN DEFAULT FALSE
);

-- Tabela para armazenar cada parcela individualmente
CREATE TABLE parcelas_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Chave estrangeira para vincular à tabela de dados financeiros
  dados_financeiros_id UUID NOT NULL REFERENCES dados_financeiros(id) ON DELETE CASCADE,
  
  -- Dados da parcela
  numero_parcela INTEGER NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status TEXT CHECK (status IN ('pendente', 'pago', 'atrasado', 'cancelado')),
  
  -- Metadados
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Informações adicionais em formato JSON (para flexibilidade)
  detalhes JSONB,
  
  -- Restricao para garantir que não haja duplicação de parcelas
  UNIQUE (dados_financeiros_id, numero_parcela)
);

-- Índices para melhorar a performance das consultas
CREATE INDEX idx_dados_financeiros_documento_id ON dados_financeiros(documento_id);
CREATE INDEX idx_parcelas_dados_financeiros_id ON parcelas_pagamento(dados_financeiros_id);

-- Trigger para atualizar o timestamp automaticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_atualizacao = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dados_financeiros_timestamp
BEFORE UPDATE ON dados_financeiros
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_parcelas_timestamp
BEFORE UPDATE ON parcelas_pagamento
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Permissões RLS (Row Level Security)
ALTER TABLE dados_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_pagamento ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso apenas a usuários autenticados
CREATE POLICY "Usuários autenticados podem acessar dados financeiros" ON dados_financeiros
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem acessar parcelas" ON parcelas_pagamento
  FOR ALL USING (auth.role() = 'authenticated');