/**
 * Utilitários para processamento de dados financeiros
 */

import { format, addMonths, addDays, parse, isValid } from 'date-fns';

export interface DadosFinanceirosBase {
  forma_pagamento?: string;
  quantidade_parcelas?: number;
  premio_total?: number;
  premio_liquido?: number;
  premio_bruto?: number;
}

/**
 * Extrai dados financeiros básicos de um documento processado
 */
export function extrairDadosFinanceiros(documento: any): DadosFinanceirosBase {
  // Verifica se há dados financeiros básicos no documento
  const dadosProsposta = documento?.proposta || {};
  
  return {
    forma_pagamento: dadosProsposta.forma_pagto || '',
    quantidade_parcelas: parseInt(dadosProsposta.quantidade_parcelas || '1', 10),
    premio_total: parseFloat(dadosProsposta.premio_total || '0'),
    premio_liquido: parseFloat(dadosProsposta.premio_liquido || '0'),
    premio_bruto: parseFloat(dadosProsposta.premio_bruto || '0'),
  };
}

/**
 * Calcula as datas de vencimento para parcelas baseado na quantidade
 * @param dataBase Data base para o primeiro vencimento
 * @param quantidadeParcelas Número de parcelas
 * @param intervaloEmDias Intervalo entre parcelas em dias (padrão: 30)
 */
export function calcularDatasVencimento(
  dataBase: Date | string | null,
  quantidadeParcelas: number,
  intervaloEmDias: number = 30
): string[] {
  // Se não tiver data base, usa a data atual + 30 dias
  let dataInicial: Date;
  
  if (!dataBase) {
    dataInicial = new Date();
    dataInicial.setDate(dataInicial.getDate() + 30);
  } else if (typeof dataBase === 'string') {
    // Tenta parsear a string de data
    const dataParseada = parseDataString(dataBase);
    if (dataParseada && isValid(dataParseada)) {
      dataInicial = dataParseada;
    } else {
      dataInicial = new Date();
      dataInicial.setDate(dataInicial.getDate() + 30);
    }
  } else {
    dataInicial = dataBase;
  }
  
  const datasVencimento: string[] = [];
  
  for (let i = 0; i < quantidadeParcelas; i++) {
    if (i === 0) {
      datasVencimento.push(format(dataInicial, 'yyyy-MM-dd'));
    } else {
      // Adiciona o intervalo para as próximas parcelas
      const dataAnterior = addDays(
        parse(datasVencimento[i - 1], 'yyyy-MM-dd', new Date()),
        intervaloEmDias
      );
      datasVencimento.push(format(dataAnterior, 'yyyy-MM-dd'));
    }
  }
  
  return datasVencimento;
}

/**
 * Calcula os valores de cada parcela baseado no valor total
 */
export function calcularValoresParcelas(
  valorTotal: number,
  quantidadeParcelas: number
): number[] {
  if (quantidadeParcelas <= 0) return [valorTotal];
  
  const valorBase = valorTotal / quantidadeParcelas;
  const valores: number[] = [];
  
  // Distribui o valor de forma que a soma seja exatamente igual ao total
  let valorRestante = valorTotal;
  
  for (let i = 0; i < quantidadeParcelas; i++) {
    if (i === quantidadeParcelas - 1) {
      // Última parcela recebe o valor restante para evitar diferenças por arredondamento
      valores.push(valorRestante);
    } else {
      const valorParcela = Math.round((valorBase + Number.EPSILON) * 100) / 100;
      valores.push(valorParcela);
      valorRestante -= valorParcela;
    }
  }
  
  return valores;
}

/**
 * Tenta parsear uma string de data em vários formatos comuns
 */
function parseDataString(dataString: string): Date | null {
  // Lista de formatos possíveis para tentar
  const formatos = [
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd.MM.yyyy',
    'yyyy.MM.dd',
    'dd-MM-yyyy',
  ];
  
  for (const formato of formatos) {
    try {
      const data = parse(dataString, formato, new Date());
      if (isValid(data)) {
        return data;
      }
    } catch (e) {
      // Continua tentando outros formatos
    }
  }
  
  // Se não conseguiu parsear, pode tentar extrair números
  const numerosExtraidos = dataString.match(/\d+/g);
  if (numerosExtraidos && numerosExtraidos.length >= 3) {
    // Assume formato dia/mês/ano 
    const dia = parseInt(numerosExtraidos[0], 10);
    const mes = parseInt(numerosExtraidos[1], 10) - 1; // Meses em JS são 0-indexed
    const ano = parseInt(numerosExtraidos[2], 10);
    
    // Ajusta o ano se necessário (ex: 23 -> 2023)
    const anoAjustado = ano < 100 ? 2000 + ano : ano;
    
    const data = new Date(anoAjustado, mes, dia);
    if (isValid(data)) {
      return data;
    }
  }
  
  return null;
} 