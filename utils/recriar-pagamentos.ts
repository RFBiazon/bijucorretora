// Script para recriar dados de pagamento de todos os documentos
import { supabase } from "@/lib/supabase";
import { extrairDadosFinanceiros } from "@/components/gestao-pagamentos/extrairDados";
import { toast } from "sonner";

export async function recriarTodosPagamentos() {
  try {
    toast.info("Iniciando recriação de todos os pagamentos...");
    
    // 1. Buscar todos os documentos (apólices e propostas)
    const { data: documentos, error: erroDocumentos } = await supabase
      .from("ocr_processamento")
      .select("id, tipo_documento, resultado")
      .in("tipo_documento", ["apolice", "proposta"])
      .not("status", "eq", "cancelado");
      
    if (erroDocumentos) {
      throw new Error(`Erro ao buscar documentos: ${erroDocumentos.message}`);
    }
    
    const total = documentos?.length || 0;
    toast.info(`Encontrados ${total} documentos para processamento.`);
    
    let processados = 0;
    let sucessos = 0;
    let falhas = 0;
    
    // 2. Para cada documento, recriar os dados financeiros
    for (const documento of documentos) {
      try {
        processados++;
        toast.info(`Processando documento ${processados}/${total}: ${documento.id}`);
        
        // 2.1 Buscar dados financeiros existentes
        const { data: dadosExistentes } = await supabase
          .from("dados_financeiros")
          .select("id")
          .eq("documento_id", documento.id);
          
        // 2.2 Se existirem dados, excluir parcelas e dados financeiros
        if (dadosExistentes && dadosExistentes.length > 0) {
          console.log(`Encontrados ${dadosExistentes.length} registros financeiros para o documento ${documento.id}`);
          
          for (const dados of dadosExistentes) {
            // Excluir parcelas
            await supabase
              .from("parcelas_pagamento")
              .delete()
              .eq("dados_financeiros_id", dados.id);
              
            // Excluir dados financeiros
            await supabase
              .from("dados_financeiros")
              .delete()
              .eq("id", dados.id);
          }
        }
        
        // 2.3 Criar novos dados financeiros
        // Extrair dados do resultado
        const dadosOriginais = documento.resultado;
        const dadosExtraidos = extrairDadosFinanceiros(dadosOriginais);
        
        const formaPagto = dadosExtraidos.formaPagamento;
        const qtdParcelas = dadosExtraidos.quantidadeParcelas;
        const valorTotal = dadosExtraidos.valorTotal;
        const premioLiquido = dadosExtraidos.premioLiquido;
        const premioBruto = dadosExtraidos.premioBruto;
        const valoresParcelas = dadosExtraidos.valoresParcelas;
        
        // Inserir novos dados financeiros
        const { data: novosDados, error: erroInsercao } = await supabase
          .from("dados_financeiros")
          .insert({
            documento_id: documento.id,
            forma_pagamento: formaPagto,
            quantidade_parcelas: qtdParcelas,
            valor_total: valorTotal,
            premio_liquido: premioLiquido,
            premio_bruto: premioBruto,
            tipo_documento: documento.tipo_documento,
            fonte: "documento",
            dados_confirmados: false
          })
          .select("*")
          .single();
          
        if (erroInsercao) {
          throw new Error(`Erro ao inserir dados financeiros: ${erroInsercao.message}`);
        }
        
        // Obter data de vigência (ou usar hoje)
        const dataVigencia = dadosOriginais?.proposta?.vigencia_inicial
          ? new Date(dadosOriginais.proposta.vigencia_inicial)
          : new Date();
        
        // Data base para vencimentos (30 dias após vigência)
        let dataVencimento = new Date(dataVigencia);
        dataVencimento.setDate(dataVigencia.getDate() + 30);
        
        // Criar parcelas
        const novasParcelas = [];
        for (let i = 0; i < qtdParcelas; i++) {
          // Ajustar data de vencimento para cada parcela
          if (i > 0) {
            const dataAnterior = new Date(dataVencimento);
            dataVencimento = new Date(dataAnterior);
            dataVencimento.setDate(dataAnterior.getDate() + 30);
          }
          
          novasParcelas.push({
            dados_financeiros_id: novosDados.id,
            numero_parcela: i + 1,
            valor: valoresParcelas[i] || valorTotal / qtdParcelas,
            data_vencimento: dataVencimento.toISOString().split("T")[0],
            status: "pendente"
          });
        }
        
        // Inserir parcelas
        const { error: erroParcelas } = await supabase
          .from("parcelas_pagamento")
          .insert(novasParcelas);
          
        if (erroParcelas) {
          throw new Error(`Erro ao inserir parcelas: ${erroParcelas.message}`);
        }
        
        sucessos++;
        console.log(`Documento ${documento.id} processado com sucesso.`);
        
      } catch (erro) {
        falhas++;
        console.error(`Erro ao processar documento ${documento.id}:`, erro);
      }
    }
    
    toast.success(`Processamento concluído. Sucessos: ${sucessos}, Falhas: ${falhas}`);
    return { total, sucessos, falhas };
    
  } catch (erro) {
    console.error("Erro ao recriar pagamentos:", erro);
    toast.error("Erro ao recriar pagamentos: " + erro.message);
    throw erro;
  }
} 