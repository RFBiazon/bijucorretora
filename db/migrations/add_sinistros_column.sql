-- Adicionar coluna para armazenar informações de sinistros em formato JSON
ALTER TABLE ocr_processamento
ADD COLUMN IF NOT EXISTS sinistros JSONB DEFAULT '[]';
 
-- Comentários da tabela para documentação
COMMENT ON COLUMN ocr_processamento.sinistros IS 'Array de objetos JSON contendo informações sobre sinistros relacionados ao seguro'; 