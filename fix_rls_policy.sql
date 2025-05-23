-- SQL para atualizar a política RLS da tabela dados_financeiros
-- Substituir a política existente com uma versão otimizada

-- Primeiro, remover a política existente
DROP POLICY IF EXISTS "Inserção de dados financeiros apenas para usuários autentica" ON "public"."dados_financeiros";

-- Criar a nova política com a verificação de autenticação otimizada
CREATE POLICY "Inserção de dados financeiros apenas para usuários autentica" 
ON "public"."dados_financeiros"
-- Usando a mesma operação da política original, mas com a otimização
FOR ALL
TO authenticated
USING (
  -- Uma destas condições pode ser a correta, dependendo de como sua política atual está configurada:
  -- Se estiver verificando o usuário editor:
  (SELECT auth.uid()::text) = usuario_editor
  -- OU se estiver verificando acesso baseado em documento:
  -- documento_id IN (SELECT id FROM ocr_processamento WHERE (SELECT auth.uid()::text) = usuario_criador)
);

-- Observação: Você precisa ajustar essa política para corresponder exatamente 
-- à lógica de segurança que você quer implementar. A mudança principal é 
-- envolver as chamadas de função auth em um SELECT. 