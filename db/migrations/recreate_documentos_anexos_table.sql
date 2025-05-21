-- Drop da tabela se já existir
DROP TABLE IF EXISTS public.documentos_anexos;

-- Criação da tabela para armazenamento de documentos anexos
CREATE TABLE IF NOT EXISTS public.documentos_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL,  -- Referência ao ID da tabela ocr_processamento
  nome_arquivo TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  drive_link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Chave estrangeira para ocr_processamento
  CONSTRAINT fk_documento FOREIGN KEY (documento_id) REFERENCES ocr_processamento(id) ON DELETE CASCADE
);

-- Permissões do RLS (Row Level Security)
ALTER TABLE public.documentos_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para garantir que apenas usuários autenticados possam ver/modificar
CREATE POLICY "Permitir acesso completo a usuários autenticados" 
  ON public.documentos_anexos 
  USING (auth.role() = 'authenticated');

-- Comentários da tabela para documentação
COMMENT ON TABLE public.documentos_anexos IS 'Armazena informações sobre documentos anexados a processos';
COMMENT ON COLUMN public.documentos_anexos.documento_id IS 'Referência ao ID da tabela ocr_processamento';
COMMENT ON COLUMN public.documentos_anexos.nome_arquivo IS 'Nome original do arquivo enviado';
COMMENT ON COLUMN public.documentos_anexos.tipo_arquivo IS 'Tipo de documento (Apólice, Carta Verde, etc.)';
COMMENT ON COLUMN public.documentos_anexos.drive_link IS 'Link para o arquivo no Google Drive'; 