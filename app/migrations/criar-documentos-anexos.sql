-- Criação da tabela para armazenamento de documentos anexos
CREATE TABLE IF NOT EXISTS public.documentos_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentoId TEXT NOT NULL,
  nomeSegurado TEXT NOT NULL,
  nomeArquivo TEXT NOT NULL,
  tipoArquivo TEXT NOT NULL,
  driveLink TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  
  -- Descomente a linha abaixo se a tabela 'documentos' já existir no seu banco
  -- , CONSTRAINT fk_documento FOREIGN KEY (documentoId) REFERENCES documentos(id) ON DELETE CASCADE
);

-- Permissões do RLS (Row Level Security)
ALTER TABLE public.documentos_anexos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para garantir que apenas usuários autenticados possam ver/modificar
CREATE POLICY "Permitir acesso completo a usuários autenticados" 
  ON public.documentos_anexos 
  USING (auth.role() = 'authenticated');

-- Comentários da tabela para documentação
COMMENT ON TABLE public.documentos_anexos IS 'Armazena informações sobre documentos anexados a processos';
COMMENT ON COLUMN public.documentos_anexos.documentoId IS 'Referência ao ID do documento principal';
COMMENT ON COLUMN public.documentos_anexos.nomeSegurado IS 'Nome do segurado associado ao documento';
COMMENT ON COLUMN public.documentos_anexos.nomeArquivo IS 'Nome original do arquivo enviado';
COMMENT ON COLUMN public.documentos_anexos.tipoArquivo IS 'Tipo de documento (Apólice, Carta Verde, etc.)';
COMMENT ON COLUMN public.documentos_anexos.driveLink IS 'Link para o arquivo no Google Drive';