-- Função para obter dados financeiros por documento
CREATE OR REPLACE FUNCTION public.get_dados_financeiros_by_documento(p_documento_id UUID)
RETURNS SETOF dados_financeiros
LANGUAGE sql
AS $$
  SELECT * FROM dados_financeiros WHERE documento_id = p_documento_id LIMIT 1;
$$;

-- Função para obter parcelas por dados financeiros
CREATE OR REPLACE FUNCTION public.get_parcelas_by_dados_financeiros(p_dados_financeiros_id UUID)
RETURNS SETOF parcelas_pagamento
LANGUAGE sql
AS $$
  SELECT * FROM parcelas_pagamento 
  WHERE dados_financeiros_id = p_dados_financeiros_id
  ORDER BY numero_parcela ASC;
$$; 