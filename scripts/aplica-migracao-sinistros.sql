-- Script para adicionar coluna de sinistros à tabela ocr_processamento
-- Execute este script no seu banco de dados Supabase

-- Adicionar coluna para armazenar informações de sinistros em formato JSON
ALTER TABLE ocr_processamento
ADD COLUMN IF NOT EXISTS sinistros JSONB DEFAULT '[]';

-- Comentários da tabela para documentação
COMMENT ON COLUMN ocr_processamento.sinistros IS 'Array de objetos JSON contendo informações sobre sinistros relacionados ao seguro';

-- Verificar se a coluna foi adicionada com sucesso
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ocr_processamento' 
  AND column_name = 'sinistros'; 