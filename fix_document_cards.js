/**
 * SOLUÇÃO PARA PROBLEMA DE RENDERIZAÇÃO DOS CARDS DE DOCUMENTOS
 * 
 * Problema identificado:
 * 1. Múltiplas consultas ao Supabase para cada cartão (verificação de status de quitação, sinistros, anexos)
 * 2. A função isSeguroQuitado causa sobrecarga no banco de dados 
 * 3. O índice adicionado à tabela documentos_anexos já deve estar ajudando
 * 4. Problemas na política RLS da tabela dados_financeiros que já foi corrigido
 * 
 * A solução proposta contempla as seguintes mudanças:
 */

// 1. Modificar a função carregarStatusQuitacao para otimizar as consultas
const carregarStatusQuitacao = async (propostas) => {
  if (!propostas.length) return;
  
  try {
    // Obter todos os IDs de documentos de uma vez
    const documentoIds = propostas.map(p => p.id);
    
    // Buscar todos os dados financeiros de uma vez só
    const { data: dadosFinanceiros, error } = await supabase
      .from("dados_financeiros")
      .select("id, documento_id")
      .in("documento_id", documentoIds);
      
    if (error) throw error;
    
    // Mapear IDs de documentos para IDs de dados financeiros
    const mapaDadosFinanceiros = {};
    dadosFinanceiros?.forEach(dado => {
      mapaDadosFinanceiros[dado.documento_id] = dado.id;
    });
    
    // Buscar parcelas para todos os dados financeiros de uma vez
    const idsFinanceiros = dadosFinanceiros?.map(df => df.id) || [];
    
    if (idsFinanceiros.length === 0) {
      return;
    }
    
    // Buscar em lotes de 20 para evitar sobrecarga
    const resultados = {};
    const tamanhoLote = 20;
    
    for (let i = 0; i < idsFinanceiros.length; i += tamanhoLote) {
      const loteAtual = idsFinanceiros.slice(i, i + tamanhoLote);
      
      const { data: parcelas, error: erroParcelasSuporte } = await supabase
        .from("parcelas_pagamento")
        .select("dados_financeiros_id, status")
        .in("dados_financeiros_id", loteAtual);
      
      if (erroParcelasSuporte) {
        console.error("Erro ao buscar parcelas:", erroParcelasSuporte);
        continue;
      }
      
      // Agrupar por dados_financeiros_id
      parcelas?.forEach(parcela => {
        if (!resultados[parcela.dados_financeiros_id]) {
          resultados[parcela.dados_financeiros_id] = [];
        }
        resultados[parcela.dados_financeiros_id].push(parcela.status);
      });
      
      // Aguardar um pequeno timeout entre lotes para não sobrecarregar
      if (i + tamanhoLote < idsFinanceiros.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Mapear resultados para status de quitação
    const novoStatusQuitacao = {};
    
    for (const proposta of propostas) {
      const idFinanceiro = mapaDadosFinanceiros[proposta.id];
      if (idFinanceiro) {
        const statusParcelas = resultados[idFinanceiro] || [];
        // Documento está quitado se houver parcelas e todas estiverem pagas
        novoStatusQuitacao[proposta.id] = statusParcelas.length > 0 && 
          statusParcelas.every(status => status === "pago");
      } else {
        novoStatusQuitacao[proposta.id] = false;
      }
    }
    
    setStatusQuitacao(novoStatusQuitacao);
  } catch (error) {
    console.error("Erro ao carregar status de quitação:", error);
  }
};

// 2. Modificar renderização para mostrar cards de forma progressiva
// Na função useEffect principal (componente PropostasPage):

useEffect(() => {
  // Certifique-se de que o estado visibleCount não seja muito alto para carregamento inicial
  const INITIAL_BATCH = 6;
  setVisibleCount(INITIAL_BATCH);
  
  // Carregar informações de sinistros e anexos em lotes separados
  const carregarInformacoes = async () => {
    // Carregar apenas para os primeiros itens visíveis
    const propostas = propostasFiltradas.slice(0, INITIAL_BATCH);
    
    // Carregar status de quitação primeiro (mais importante para UI)
    await carregarStatusQuitacao(propostas);
    
    // Carregar informações de anexos e sinistros em paralelo,
    // mas com um pequeno atraso para priorizar a renderização inicial
    setTimeout(() => {
      carregarInfoAnexos(propostas);
      setTimeout(() => {
        carregarInfoSinistros(propostas);
      }, 300);
    }, 200);
    
    // Se tiver mais itens, carregar em lotes subsequentes
    if (propostasFiltradas.length > INITIAL_BATCH) {
      const lote2 = propostasFiltradas.slice(INITIAL_BATCH, INITIAL_BATCH * 2);
      setTimeout(async () => {
        await carregarStatusQuitacao(lote2);
        setVisibleCount(prev => prev + lote2.length);
        
        setTimeout(() => {
          carregarInfoAnexos(lote2);
          setTimeout(() => {
            carregarInfoSinistros(lote2);
          }, 300);
        }, 200);
      }, 800);
    }
  };
  
  if (propostasFiltradas.length > 0) {
    carregarInformacoes();
  }
}, [propostasFiltradas]);

// 3. Forçar nova renderização quando a busca for realizada
// Adicionar isto na função de busca:

const buscar = async () => {
  // Código original...
  
  // Depois de obter os resultados:
  setPropostas(resultados);
  setPropostasFiltradas(resultados);
  
  // Forçar nova renderização com timeout para garantir que 
  // o React tenha tempo de processar a mudança de estado
  setTimeout(() => {
    // Resetar a contagem visível
    setVisibleCount(6);
    
    // Forçar carregamento de informações para os primeiros itens
    if (resultados.length > 0) {
      const primeirosItens = resultados.slice(0, 6);
      carregarStatusQuitacao(primeirosItens);
      setTimeout(() => {
        carregarInfoAnexos(primeirosItens);
        carregarInfoSinistros(primeirosItens);
      }, 300);
    }
  }, 100);
};

/**
 * IMPORTANTE: Estas alterações vão:
 * 1. Reduzir o número de consultas ao Supabase
 * 2. Carregar os dados em lotes menores
 * 3. Priorizar a renderização dos primeiros cards
 * 4. Introduzir pequenos atrasos entre consultas para não sobrecarregar o banco
 * 5. Garantir que mais cards sejam renderizados corretamente
 */ 