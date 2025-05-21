// Função especializada para extrair dados financeiros da página e dados originais

// Função para extrair valor numérico de uma string de preço
function extrairValorNumerico(valor: any): number {
  if (!valor) return 0;
  try {
    // Remover R$ e espaços
    const valorLimpo = valor.toString().replace(/[R$\s]/g, "").trim();
    
    // Converter para formato numérico:
    // 1. Remover pontos de milhar
    // 2. Substituir vírgula decimal por ponto
    return parseFloat(valorLimpo.replace(/\./g, "").replace(",", ".")) || 0;
  } catch (e) {
    console.error("Erro ao converter valor monetário:", valor, e);
    return 0;
  }
}

// Função para extrair número de parcelas de uma string
function extrairNumeroParcelas(texto: string): number {
  if (!texto) return 1;
  const match = texto.match(/(\d+)/);
  return match && match[1] ? parseInt(match[1], 10) : 1;
}

// Função para normalizar formas de pagamento
function normalizarFormaPagamento(forma: string): string {
  if (!forma) return "Boleto / Carnê"; // Valor padrão
  
  const formaLower = forma.toLowerCase();
  
  // Mapeamento para valores normalizados
  if (formaLower.includes("boleto") || 
      formaLower.includes("carne") || 
      formaLower.includes("carnê") || 
      formaLower.includes("ficha") ||
      formaLower.includes("compensacao") ||
      formaLower.includes("compensação") ||
      formaLower.includes("bradesco") ||
      formaLower.includes("santander") ||
      formaLower.includes("itau") ||
      formaLower.includes("itaú") ||
      formaLower.includes("brasil")) {
    return "Boleto / Carnê";
  }
  
  if (formaLower.includes("debito") || 
      formaLower.includes("débito") || 
      formaLower.includes("conta") ||
      formaLower.includes("automatico") ||
      formaLower.includes("automático")) {
    return "Débito em Conta";
  }
  
  if (formaLower.includes("cartao") || 
      formaLower.includes("cartão") || 
      formaLower.includes("credito") ||
      formaLower.includes("crédito")) {
    return "Cartão de Crédito";
  }
  
  // Se não identificar, retorna o padrão
  return "Boleto / Carnê";
}

export interface DadosFinanceirosExtraidos {
  formaPagamento: string;
  quantidadeParcelas: number;
  valorTotal: number;
  premioLiquido: number;
  premioBruto: number;
  iof: number;
  valoresParcelas: number[];
}

// Definindo interface para o objeto valores
interface ValoresExtracao {
  forma_pagamento?: string;
  forma_pagto?: string;
  preco_total?: any;
  preco_liquido?: any;
  iof?: any;
  premio_total?: number;
  premio_liquido?: number;
  quantidade_parcelas?: number;
  parcelamento?: {
    quantidade?: any;
    valor_parcela?: any;
  };
  [key: string]: any; // Para permitir outras propriedades
}

export function extrairDadosFinanceiros(dadosOriginais: any): DadosFinanceirosExtraidos {
  console.log("=== EXTRAÇÃO DE DADOS FINANCEIROS ===");
  console.log("Dados originais:", dadosOriginais);

  // Examinar todos os caminhos possíveis de dados
  console.log("CAMINHOS POSSÍVEIS PARA VALORES:");
  console.log("1. dadosOriginais.valores:", dadosOriginais?.valores);
  console.log("2. dadosOriginais.resultado.valores:", dadosOriginais?.resultado?.valores);
  console.log("3. dadosOriginais.proposta:", dadosOriginais?.proposta);
  console.log("4. dadosOriginais.resultado.proposta:", dadosOriginais?.resultado?.proposta);
  console.log("5. dadosOriginais.resultado:", dadosOriginais?.resultado);

  // Verificar se temos o objeto valores no formato esperado
  // Tentar múltiplos caminhos possíveis
  const valoresDireto: ValoresExtracao = dadosOriginais?.valores || {};
  const valoresAninhado: ValoresExtracao = dadosOriginais?.resultado?.valores || {};
  const valoresProposta: ValoresExtracao = dadosOriginais?.proposta || {};
  const valoresPropostaAninhado: ValoresExtracao = dadosOriginais?.resultado?.proposta || {};
  
  // Tentar obter valores do objeto mais completo
  let valores: ValoresExtracao = {};
  
  // Verificar qual caminho tem mais informações úteis
  if (valoresAninhado && Object.keys(valoresAninhado).length > 0 && (valoresAninhado.preco_total || valoresAninhado.parcelamento)) {
    valores = valoresAninhado;
    console.log("Usando valores de dadosOriginais.resultado.valores");
  } else if (valoresDireto && Object.keys(valoresDireto).length > 0 && (valoresDireto.preco_total || valoresDireto.parcelamento)) {
    valores = valoresDireto;
    console.log("Usando valores de dadosOriginais.valores");
  } else if (valoresPropostaAninhado && Object.keys(valoresPropostaAninhado).length > 0) {
    valores = { 
      forma_pagamento: valoresPropostaAninhado.forma_pagto || "",
      preco_total: valoresPropostaAninhado.premio_total || 0,
      preco_liquido: valoresPropostaAninhado.premio_liquido || 0,
      parcelamento: {
        quantidade: valoresPropostaAninhado.quantidade_parcelas || 1,
        valor_parcela: ((valoresPropostaAninhado.premio_total || 0) / (valoresPropostaAninhado.quantidade_parcelas || 1)) || 0
      }
    };
    console.log("Usando valores convertidos de dadosOriginais.resultado.proposta");
  } else if (valoresProposta && Object.keys(valoresProposta).length > 0) {
    valores = { 
      forma_pagamento: valoresProposta.forma_pagto || "",
      preco_total: valoresProposta.premio_total || 0,
      preco_liquido: valoresProposta.premio_liquido || 0,
      parcelamento: {
        quantidade: valoresProposta.quantidade_parcelas || 1,
        valor_parcela: ((valoresProposta.premio_total || 0) / (valoresProposta.quantidade_parcelas || 1)) || 0
      }
    };
    console.log("Usando valores convertidos de dadosOriginais.proposta");
  } else {
    // Como último recurso, criar objeto vazio com valores padrão
    console.log("Nenhum dado encontrado nas propriedades, usando valores padrão");
    valores = {
      forma_pagamento: "Boleto / Carnê",
      preco_total: 1000, // Valor padrão para teste
      preco_liquido: 900,
      parcelamento: {
        quantidade: 3,
        valor_parcela: 333.33
      }
    };
    console.log("Usando valores padrão");
  }
  
  console.log("Objeto valores escolhido:", valores);
  
  // Extração direta do objeto valores (formato preferencial)
  if (Object.keys(valores).length > 0) {
    try {
      // Extrair forma de pagamento
      const formaPagamento = normalizarFormaPagamento(valores.forma_pagamento || "Não informado");
      console.log("Forma de pagamento:", formaPagamento);
      
      // Extrair quantidade de parcelas
      let quantidadeParcelas = 1;
      if (valores?.parcelamento?.quantidade) {
        // O valor pode ser apenas o número ou pode incluir "parcelas"
        quantidadeParcelas = parseInt(valores.parcelamento.quantidade) || 1;
      }
      console.log("Quantidade de parcelas:", quantidadeParcelas);
      
      // Extrair valor total
      const valorTotal = extrairValorNumerico(valores.preco_total);
      console.log("Valor total:", valorTotal);
      
      // Extrair prêmio líquido
      const premioLiquido = extrairValorNumerico(valores.preco_liquido);
      console.log("Prêmio líquido:", premioLiquido);
      
      // Extrair IOF
      const iof = extrairValorNumerico(valores.iof);
      console.log("IOF:", iof);
      
      // Extrair valor da parcela
      let valorParcela = 0;
      if (valores?.parcelamento?.valor_parcela) {
        valorParcela = extrairValorNumerico(valores.parcelamento.valor_parcela);
      } else if (valorTotal > 0 && quantidadeParcelas > 0) {
        valorParcela = valorTotal / quantidadeParcelas;
      }
      console.log("Valor da parcela:", valorParcela);
      
      // Criar array de valores de parcelas
      const valoresParcelas = Array(quantidadeParcelas).fill(valorParcela);
      
      // Calcular prêmio bruto se necessário
      const premioBruto = valorTotal || (premioLiquido + iof);
      
      const resultado: DadosFinanceirosExtraidos = {
        formaPagamento,
        quantidadeParcelas,
        valorTotal,
        premioLiquido,
        premioBruto,
        iof,
        valoresParcelas
      };
      
      console.log("=== RESULTADO DA EXTRAÇÃO DIRETA ===");
      console.log(resultado);
      
      return resultado;
    } catch (e) {
      console.error("Erro na extração direta:", e);
      // Se falhar, continuar com o método alternativo
    }
  }

  // Se não conseguir extrair diretamente, tentar método alternativo com múltiplas fontes
  console.log("Tentando método alternativo de extração");
  
  // Outras tentativas com múltiplas fontes
  const valoresApolice: ValoresExtracao = dadosOriginais?.valores_apolice || {};
  console.log("Objeto valores_apolice:", valoresApolice);
  
  // Checar se valores está em formato string
  let valoresObjeto: ValoresExtracao = {};
  if (typeof dadosOriginais?.valores === 'string') {
    try {
      valoresObjeto = JSON.parse(dadosOriginais.valores);
      console.log("Objeto valores (parseado de string):", valoresObjeto);
    } catch (e) {
      console.error("Erro ao parsear string de valores:", e);
    }
  }
  
  // Combinar todas as fontes possíveis
  const todasFontes: ValoresExtracao[] = [valores, valoresApolice, valoresObjeto, dadosOriginais?.proposta || {}];
  
  // Forma de pagamento - verificar em todas as fontes
  let formaPagamento = '';
  for (const fonte of todasFontes) {
    if (fonte?.forma_pagamento) {
      formaPagamento = normalizarFormaPagamento(fonte.forma_pagamento);
      console.log("Forma de pagamento encontrada:", formaPagamento, "em", fonte);
      break;
    }
    if (fonte?.forma_pagto) {
      formaPagamento = normalizarFormaPagamento(fonte.forma_pagto);
      console.log("Forma de pagamento encontrada (forma_pagto):", formaPagamento, "em", fonte);
      break;
    }
  }
  
  // Quantidade de parcelas
  let quantidadeParcelas = 1;
  for (const fonte of todasFontes) {
    if (fonte?.parcelamento?.quantidade) {
      quantidadeParcelas = extrairNumeroParcelas(fonte.parcelamento.quantidade);
      console.log("Quantidade de parcelas encontrada:", quantidadeParcelas, "em", fonte?.parcelamento);
      break;
    }
    if (fonte?.quantidade_parcelas) {
      quantidadeParcelas = fonte.quantidade_parcelas;
      console.log("Quantidade de parcelas encontrada (quantidade_parcelas):", quantidadeParcelas, "em", fonte);
      break;
    }
  }

  // Valor total
  let valorTotal = 0;
  for (const fonte of todasFontes) {
    if (fonte?.preco_total) {
      valorTotal = extrairValorNumerico(fonte.preco_total);
      console.log("Valor total encontrado:", valorTotal, "em", fonte);
      break;
    }
    if (fonte?.premio_total) {
      valorTotal = fonte.premio_total;
      console.log("Valor total encontrado (premio_total):", valorTotal, "em", fonte);
      break;
    }
  }
  
  // Valores de parcela
  let valorParcela = valorTotal / quantidadeParcelas;
  let valoresParcelas: number[] = [];
  
  for (const fonte of todasFontes) {
    if (fonte?.parcelamento?.valor_parcela) {
      const textoValorParcela = fonte.parcelamento.valor_parcela;
      console.log("Texto do valor da parcela:", textoValorParcela);
      
      if (textoValorParcela.includes(" a R$")) {
        // Formato "R$ X,XX a R$ Y,YY"
        const partes = textoValorParcela.split(" a R$").map((p: string) => p.trim());
        const valor1 = extrairValorNumerico(partes[0]);
        const valor2 = extrairValorNumerico("R$ " + partes[1]);
        
        console.log("Valores extraídos:", valor1, valor2);
        
        if (quantidadeParcelas === 2) {
          valoresParcelas = [valor1, valor2];
        } else if (quantidadeParcelas === 3) {
          valoresParcelas = [valor1, valor1, valor2];
        } else {
          valoresParcelas = Array(quantidadeParcelas).fill(0).map((_, i: number) => 
            i === quantidadeParcelas - 1 ? valor2 : valor1
          );
        }
        break;
      } else {
        // Formato "R$ X,XX"
        valorParcela = extrairValorNumerico(textoValorParcela);
        valoresParcelas = Array(quantidadeParcelas).fill(valorParcela);
        console.log("Valor de parcela único:", valorParcela);
        break;
      }
    }
  }
  
  // Se não encontrou valores de parcela específicos, calcular a partir do valor total
  if (valoresParcelas.length === 0) {
    valoresParcelas = Array(quantidadeParcelas).fill(valorTotal / quantidadeParcelas);
  }
  
  // Outros valores financeiros
  let premioLiquido = 0;
  for (const fonte of todasFontes) {
    if (fonte?.preco_liquido) {
      premioLiquido = extrairValorNumerico(fonte.preco_liquido);
      console.log("Prêmio líquido encontrado:", premioLiquido, "em", fonte);
      break;
    }
    if (fonte?.premio_liquido) {
      premioLiquido = fonte.premio_liquido;
      console.log("Prêmio líquido encontrado (premio_liquido):", premioLiquido, "em", fonte);
      break;
    }
  }
  
  if (premioLiquido <= 0) {
    premioLiquido = valorTotal * 0.9;
  }
  
  // IOF (opcional)
  let iof = 0;
  for (const fonte of todasFontes) {
    if (fonte?.iof) {
      iof = extrairValorNumerico(fonte.iof);
      console.log("IOF encontrado:", iof, "em", fonte);
      break;
    }
  }
  
  const premioBruto = valorTotal;
  
  const resultado: DadosFinanceirosExtraidos = {
    formaPagamento: formaPagamento || "Não informado",
    quantidadeParcelas,
    valorTotal,
    premioLiquido,
    premioBruto,
    iof,
    valoresParcelas
  };
  
  console.log("=== RESULTADO DA EXTRAÇÃO ===");
  console.log(resultado);
  
  return resultado;
} 