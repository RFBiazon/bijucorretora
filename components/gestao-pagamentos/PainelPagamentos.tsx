"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronDown, ChevronRight, PlusCircle, Save, Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Função auxiliar para converter valores monetários em string para número
function converterValorMonetario(valorString: string): number {
  if (!valorString) return 0;
  
  try {
    // Remover "R$" e espaços
    const valorLimpo = valorString.replace(/R\$\s*/g, "").trim();
    
    // Converter para formato numérico (substituir pontos de milhar e vírgulas decimais)
    return parseFloat(valorLimpo.replace(/\./g, "").replace(",", ".")) || 0;
  } catch (e) {
    console.error("Erro ao converter valor monetário:", valorString, e);
    return 0;
  }
}

// Tipos para os dados financeiros
interface Parcela {
  id: string
  numero_parcela: number
  valor: number
  data_vencimento: string | null
  data_pagamento: string | null
  status: "pendente" | "pago" | "atrasado" | "cancelado"
  detalhes?: any
}

interface DadosFinanceiros {
  id: string
  documento_id: string
  forma_pagamento: string
  quantidade_parcelas: number
  valor_total: number
  premio_liquido: number
  premio_bruto: number
  ultima_atualizacao: string
  usuario_editor?: string
  fonte: "documento" | "manual" | "misto"
  tipo_documento: string
  dados_confirmados: boolean
}

interface PainelPagamentosProps {
  documentoId: string
  tipoDocumento: string
  dadosOriginais: any
}

// Função para formatar valores monetários no padrão brasileiro
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Função para extrair valor numérico de uma string de preço
function extrairValorNumerico(valor: string): number {
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

// Função especializada para extrair dados financeiros da página e dados originais
function extrairDadosFinanceiros(dadosOriginais: any) {
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
  const valoresDireto = dadosOriginais?.valores || {};
  const valoresAninhado = dadosOriginais?.resultado?.valores || {};
  const valoresProposta = dadosOriginais?.proposta || {};
  const valoresPropostaAninhado = dadosOriginais?.resultado?.proposta || {};
  
  // Tentar obter valores do objeto mais completo
  let valores = {};
  
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
        valor_parcela: (valoresPropostaAninhado.premio_total / valoresPropostaAninhado.quantidade_parcelas) || 0
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
        valor_parcela: (valoresProposta.premio_total / valoresProposta.quantidade_parcelas) || 0
      }
    };
    console.log("Usando valores convertidos de dadosOriginais.proposta");
  } else {
    // Como último recurso, tentar extrair informações diretamente da UI
    console.log("Nenhum dado encontrado nas propriedades, tentando extrair da UI");
    
    try {
      // Esta função só funciona no navegador
      if (typeof document !== 'undefined') {
        // Tentar obter valores da interface do usuário
        const precoTotalUI = document.querySelector('.card-header .valor-total')?.textContent || 
                             document.querySelector('[id*="preco-total"]')?.textContent ||
                             document.querySelector('*:contains("Preço Total")')?.parentElement?.querySelector('input, .valor')?.textContent || "";
        
        const precoLiquidoUI = document.querySelector('.card-header .valor-liquido')?.textContent || 
                               document.querySelector('[id*="preco-liquido"]')?.textContent || "";
        
        const formaPagtoUI = document.querySelector('.card-header .forma-pagamento')?.textContent || 
                             document.querySelector('[id*="forma-pagamento"]')?.textContent || 
                             document.querySelector('*:contains("Forma de Pagamento")')?.parentElement?.querySelector('input, .valor')?.textContent || "Não informado";
        
        const qtdParcelasUI = document.querySelector('.card-header .quantidade-parcelas')?.textContent || 
                              document.querySelector('[id*="quantidade-parcelas"]')?.textContent || 
                              document.querySelector('*:contains("Quantidade de Parcelas")')?.parentElement?.querySelector('input, .valor')?.textContent || "1";
        
        const valorParcelaUI = document.querySelector('.card-header .valor-parcela')?.textContent || 
                               document.querySelector('[id*="valor-parcela"]')?.textContent || 
                               document.querySelector('*:contains("Valor da Parcela")')?.parentElement?.querySelector('input, .valor')?.textContent || "";
        
        console.log("Valores extraídos da UI:", {
          precoTotalUI,
          precoLiquidoUI,
          formaPagtoUI,
          qtdParcelasUI,
          valorParcelaUI
        });
        
        // Processar os valores extraídos
        const precoTotal = extrairValorNumerico(precoTotalUI);
        const precoLiquido = extrairValorNumerico(precoLiquidoUI);
        const qtdParcelas = extrairNumeroParcelas(qtdParcelasUI);
        const valorParcela = extrairValorNumerico(valorParcelaUI);
        
        // Só usar se encontrou algo relevante
        if (precoTotal > 0 || qtdParcelas > 1 || valorParcela > 0) {
          valores = {
            forma_pagamento: normalizarFormaPagamento(formaPagtoUI),
            preco_total: precoTotal,
            preco_liquido: precoLiquido,
            parcelamento: {
              quantidade: qtdParcelas,
              valor_parcela: valorParcela > 0 ? valorParcela : (precoTotal / qtdParcelas)
            }
          };
          console.log("Usando valores extraídos da UI");
        }
      }
    } catch (e) {
      console.error("Erro ao extrair dados da UI:", e);
    }
    
    // Se ainda não tiver dados, criar objeto vazio com valores padrão
    if (Object.keys(valores).length === 0) {
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
  }
  
  console.log("Objeto valores escolhido:", valores);
  
  // Extração direta do objeto valores (formato preferencial)
  if (Object.keys(valores).length > 0) {
    try {
      // FORMATO PREFERENCIAL:
      // "valores": {
      //    "iof": "111,74",
      //    "preco_total": "1.625,93",
      //    "parcelamento": { "quantidade": "10", "valor_parcela": "162,59" },
      //    "preco_liquido": "1.514,19",
      //    "forma_pagamento": "Cartão de Crédito"
      // }
      
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
      
      const resultado = {
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
  
  // Outras tentativas... (manter o resto da função como estava)
  
  // Tentativa 2: Usar dados do objeto valores_apolice
  const valoresApolice = dadosOriginais?.valores_apolice || {};
  console.log("Objeto valores_apolice:", valoresApolice);
  
  // Tentativa 3: Checar se valores está em formato string
  let valoresObjeto = {};
  if (typeof dadosOriginais?.valores === 'string') {
    try {
      valoresObjeto = JSON.parse(dadosOriginais.valores);
      console.log("Objeto valores (parseado de string):", valoresObjeto);
    } catch (e) {
      console.error("Erro ao parsear string de valores:", e);
    }
  }
  
  // Combinar todas as fontes possíveis
  const todasFontes = [valores, valoresApolice, valoresObjeto, dadosOriginais?.proposta || {}];
  
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
        const partes = textoValorParcela.split(" a R$").map(p => p.trim());
        const valor1 = extrairValorNumerico(partes[0]);
        const valor2 = extrairValorNumerico("R$ " + partes[1]);
        
        console.log("Valores extraídos:", valor1, valor2);
        
        if (quantidadeParcelas === 2) {
          valoresParcelas = [valor1, valor2];
        } else if (quantidadeParcelas === 3) {
          valoresParcelas = [valor1, valor1, valor2];
        } else {
          valoresParcelas = Array(quantidadeParcelas).fill(0).map((_, i) => 
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
  
  const resultado = {
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

// Função auxiliar para garantir data consistente sem problemas de fuso horário
function parseConsistentDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined;
  
  // Garantir que a data seja interpretada como UTC
  // Formato da entrada esperada: "YYYY-MM-DD"
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (!year || !month || !day) return undefined;
  
  // Criar uma nova data no UTC, meio-dia para evitar problemas de fuso
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date;
}

// Função para formatar data para armazenamento
function formatDateForStorage(date: Date | null): string | null {
  if (!date) return null;
  
  // Extrair ano, mês e dia ignorando o fuso horário
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function PainelPagamentos({ documentoId, tipoDocumento, dadosOriginais }: PainelPagamentosProps) {
  const [expanded, setExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [dadosFinanceiros, setDadosFinanceiros] = useState<DadosFinanceiros | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [novaQuantidadeParcelas, setNovaQuantidadeParcelas] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [abaAtual, setAbaAtual] = useState('financeiro')
  const [mostrarAlertaRecriacao, setMostrarAlertaRecriacao] = useState(false)

  // Verificar se precisa usar a gestão financeira - exibir para todas as apólices e propostas
  const usarGestaoFinanceira = tipoDocumento === "apolice" || tipoDocumento === "proposta";

  // Carregar dados quando necessário
  useEffect(() => {
    if (usarGestaoFinanceira && abaAtual === 'financeiro' && !dadosFinanceiros) {
      console.log("Carregando dados iniciais...");
      carregarDadosFinanceiros();
    }
  }, [abaAtual, usarGestaoFinanceira, dadosFinanceiros, documentoId]);

  // Remover duplicatas de parcelas se houver
  useEffect(() => {
    if (parcelas.length > 0) {
      // Verificar se há duplicatas por número de parcela
      const numerosUnicos = [...new Set(parcelas.map(p => p.numero_parcela))];
      
      // Se a quantidade de números únicos for menor que o total, há duplicatas
      if (numerosUnicos.length < parcelas.length) {
        console.log("Detectadas parcelas duplicadas. Removendo duplicatas...");
        
        // Para cada número de parcela, manter apenas a primeira ocorrência
        const parcelasSemDuplicatas: Parcela[] = [];
        const parcelasProcessadas = new Set<number>();
        
        // Primeiro, vamos identificar as duplicatas
        const duplicatas: {[key: number]: string[]} = {};
        parcelas.forEach(p => {
          if (!duplicatas[p.numero_parcela]) {
            duplicatas[p.numero_parcela] = [];
          }
          duplicatas[p.numero_parcela].push(p.id);
        });
        
        // Listar as duplicatas encontradas para debug
        Object.keys(duplicatas).forEach(numParcela => {
          const ids = duplicatas[Number(numParcela)];
          if (ids.length > 1) {
            console.log(`Parcela ${numParcela} tem ${ids.length} duplicatas:`, ids);
          }
        });
        
        // Filtrar parcelas mantendo apenas a primeira ocorrência de cada número
        parcelas.forEach(parcela => {
          if (!parcelasProcessadas.has(parcela.numero_parcela)) {
            parcelasSemDuplicatas.push(parcela);
            parcelasProcessadas.add(parcela.numero_parcela);
          } else if (dadosFinanceiros) {
            // Remover a parcela duplicada do banco de dados
            console.log(`Removendo parcela duplicada ${parcela.id} (parcela ${parcela.numero_parcela})`);
            supabase
              .from("parcelas_pagamento")
              .delete()
              .eq("id", parcela.id)
              .then(({ error }) => {
                if (error) {
                  console.error(`Erro ao remover parcela duplicada ${parcela.id}:`, error);
                }
              });
          }
        });
        
        // Atualizar estado com parcelas sem duplicatas
        console.log("Parcelas originais:", parcelas.length);
        console.log("Parcelas sem duplicatas:", parcelasSemDuplicatas.length);
        setParcelas(parcelasSemDuplicatas);
        
        // Atualizar quantidade no banco de dados
        if (dadosFinanceiros) {
          supabase
            .from("dados_financeiros")
            .update({ 
              quantidade_parcelas: parcelasSemDuplicatas.length,
              ultima_atualizacao: new Date().toISOString()
            })
            .eq("id", dadosFinanceiros.id)
            .then(({ error }) => {
              if (error) {
                console.error("Erro ao atualizar quantidade de parcelas:", error);
              } else {
                console.log("Quantidade de parcelas atualizada para:", parcelasSemDuplicatas.length);
              }
            });
        }
      }
    }
  }, [parcelas, dadosFinanceiros]);

  // Certificar que as parcelas estão ordenadas
  useEffect(() => {
    if (parcelas.length > 0) {
      // Ordenar parcelas por número da parcela
      const parcelasOrdenadas = [...parcelas].sort((a, b) => a.numero_parcela - b.numero_parcela);
      
      // Verificar se a ordenação é diferente do estado atual
      const ordenacaoDiferente = parcelasOrdenadas.some((p, i) => p.id !== parcelas[i]?.id);
      
      // Só atualizar se for diferente
      if (ordenacaoDiferente) {
        console.log("Ordenando parcelas:", parcelasOrdenadas);
        setParcelas(parcelasOrdenadas);
      }
    }
  }, [parcelas]);

  // Log para depuração
  useEffect(() => {
    console.log("Estado do PainelPagamentos:", {
      documentoId,
      tipoDocumento,
      erro,
      expanded,
      isLoading,
      temDados: !!dadosFinanceiros,
      parcelas: parcelas.length
    });
  }, [documentoId, tipoDocumento, erro, expanded, isLoading, dadosFinanceiros, parcelas]);

  async function carregarDadosFinanceiros() {
    try {
      setIsLoading(true);
      setErro(null);
      console.log("Iniciando carregamento de dados financeiros para documento:", documentoId);

      // Verificar se há múltiplos registros para este documento (erro)
      const { data: todosRegistros, error: erroConsultaMultiplos } = await supabase
        .from("dados_financeiros")
        .select("*")
        .eq("documento_id", documentoId);
        
      if (erroConsultaMultiplos) {
        console.error("Erro ao verificar múltiplos registros:", erroConsultaMultiplos);
      } else if (todosRegistros && todosRegistros.length > 1) {
        console.warn("ATENÇÃO: Foram encontrados múltiplos registros financeiros para este documento:", todosRegistros);
        
        // Manter apenas o registro mais recente e excluir os demais
        const registrosOrdenados = [...todosRegistros].sort((a, b) => 
          new Date(b.ultima_atualizacao).getTime() - new Date(a.ultima_atualizacao).getTime()
        );
        
        const registroMaisRecente = registrosOrdenados[0];
        console.log("Mantendo o registro mais recente:", registroMaisRecente);
        
        // Excluir registros duplicados
        for (let i = 1; i < registrosOrdenados.length; i++) {
          const registroDuplicado = registrosOrdenados[i];
          console.log(`Removendo registro duplicado ${i}:`, registroDuplicado);
          
          // Remover parcelas associadas
          await supabase
            .from("parcelas_pagamento")
            .delete()
            .eq("dados_financeiros_id", registroDuplicado.id);
            
          // Remover o registro financeiro
          await supabase
            .from("dados_financeiros")
            .delete()
            .eq("id", registroDuplicado.id);
        }
        
        // Usar o registro mais recente
        const dadosExistentes = registroMaisRecente;
        console.log("Usando o registro mais recente como dados financeiros:", dadosExistentes);
        
        setDadosFinanceiros(dadosExistentes);
        setFormaPagamento(dadosExistentes.forma_pagamento);
        setNovaQuantidadeParcelas(dadosExistentes.quantidade_parcelas);
        
        // Carregar parcelas
        const { data: parcelasExistentes, error: erroParecelas } = await supabase
          .from("parcelas_pagamento")
          .select("*")
          .eq("dados_financeiros_id", dadosExistentes.id)
          .order("numero_parcela", { ascending: true });
          
        if (erroParecelas) {
          throw new Error(`Erro ao buscar parcelas: ${erroParecelas.message}`);
        }
        
        console.log("Parcelas existentes carregadas:", parcelasExistentes?.length || 0);
        setParcelas(parcelasExistentes || []);
        return;
      }

      // Verificar se já existem dados financeiros
      const { data: dadosExistentes, error } = await supabase
        .from("dados_financeiros")
        .select("*")
        .eq("documento_id", documentoId)
        .single();

      if (error) {
        console.log("Erro ao buscar dados financeiros:", error);
        
        if (error.code === "PGRST116") {
          // Dados não encontrados, criar novos
          console.log("Dados financeiros não encontrados, criando novos...");
          return await criarDadosFinanceiros();
        } else {
          // Outro tipo de erro
          throw new Error(`Erro ao buscar dados financeiros: ${error.message}`);
        }
      }

      if (dadosExistentes) {
        // Dados encontrados, carregar parcelas
        console.log("Dados financeiros existentes:", dadosExistentes);
        setDadosFinanceiros(dadosExistentes);
        setFormaPagamento(dadosExistentes.forma_pagamento);
        setNovaQuantidadeParcelas(dadosExistentes.quantidade_parcelas);

        const { data: parcelasExistentes, error: erroParecelas } = await supabase
          .from("parcelas_pagamento")
          .select("*")
          .eq("dados_financeiros_id", dadosExistentes.id)
          .order("numero_parcela", { ascending: true });

        if (erroParecelas) {
          throw new Error(`Erro ao buscar parcelas: ${erroParecelas.message}`);
        }

        console.log("Parcelas existentes:", parcelasExistentes);
        setParcelas(parcelasExistentes || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      setErro(error instanceof Error ? error.message : "Erro desconhecido");
      toast.error("Não foi possível carregar os dados financeiros");
    } finally {
      setIsLoading(false);
    }
  }

  async function criarDadosFinanceiros() {
    try {
      console.log("Criando novos dados financeiros para:", documentoId);
      
      // Usar a função especializada para extrair os dados financeiros
      const dadosExtraidos = extrairDadosFinanceiros(dadosOriginais);
      
      // Usar os dados extraídos
      const formaPagto = dadosExtraidos.formaPagamento;
      const qtdParcelas = dadosExtraidos.quantidadeParcelas;
      const valorTotal = dadosExtraidos.valorTotal;
      const premioLiquido = dadosExtraidos.premioLiquido;
      const premioBruto = dadosExtraidos.premioBruto;
      const valoresParcelas = dadosExtraidos.valoresParcelas;
      
      console.log("Dados a serem inseridos:", {
        documento_id: documentoId,
        forma_pagamento: formaPagto,
        quantidade_parcelas: qtdParcelas,
        valor_total: valorTotal,
        premio_liquido: premioLiquido,
        premio_bruto: premioBruto
      });

      setFormaPagamento(formaPagto);
      setNovaQuantidadeParcelas(qtdParcelas);

      // Verificar se já existe dados financeiros para este documento
      const { data: dadosExistentes, error: erroConsulta } = await supabase
        .from("dados_financeiros")
        .select("*")
        .eq("documento_id", documentoId);
        
      if (erroConsulta) {
        console.error("Erro ao verificar dados existentes:", erroConsulta);
      }
      
      // Se já existir, remover antes de criar novos
      if (dadosExistentes && dadosExistentes.length > 0) {
        console.log("Dados financeiros já existem para este documento. Removendo dados existentes...");
        
        // Remover parcelas existentes
        for (const dados of dadosExistentes) {
          await supabase
            .from("parcelas_pagamento")
            .delete()
            .eq("dados_financeiros_id", dados.id);
            
          // Remover dados financeiros
          await supabase
            .from("dados_financeiros")
            .delete()
            .eq("id", dados.id);
        }
        
        console.log("Dados existentes removidos com sucesso.");
      }

      // Inserir na tabela dados_financeiros
      const { data: novosDados, error } = await supabase
        .from("dados_financeiros")
        .insert({
          documento_id: documentoId,
          forma_pagamento: formaPagto,
          quantidade_parcelas: qtdParcelas,
          valor_total: valorTotal,
          premio_liquido: premioLiquido,
          premio_bruto: premioBruto,
          tipo_documento: tipoDocumento,
          fonte: "documento",
          dados_confirmados: false
        })
        .select("*")
        .single();

      if (error) {
        console.error("Erro ao inserir dados financeiros:", error);
        throw new Error(`Erro ao inserir dados financeiros: ${error.message}`);
      }

      console.log("Dados financeiros criados com sucesso:", novosDados);
      setDadosFinanceiros(novosDados);

      // Obter data de vigência (ou usar hoje)
      const dataVigencia = dadosOriginais?.proposta?.vigencia_inicial
        ? new Date(dadosOriginais.proposta.vigencia_inicial)
        : new Date();
      
      // Data base para vencimentos (30 dias após vigência)
      let dataVencimento = new Date(dataVigencia);
      dataVencimento.setDate(dataVigencia.getDate() + 30);
      
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
      
      console.log("Parcelas a serem inseridas:", novasParcelas);
      
      // Inserir as parcelas
      const { data: parcelasInseridas, error: erroParcelas } = await supabase
        .from("parcelas_pagamento")
        .insert(novasParcelas)
        .select("*");
        
      if (erroParcelas) {
        console.error("Erro ao inserir parcelas:", erroParcelas);
        throw new Error(`Erro ao inserir parcelas: ${erroParcelas.message}`);
      }
      
      console.log("Parcelas inseridas com sucesso:", parcelasInseridas);
      setParcelas(parcelasInseridas || []);
      
    } catch (error) {
      console.error("Erro ao criar dados financeiros:", error);
      setErro(error instanceof Error ? error.message : "Erro desconhecido");
      toast.error("Não foi possível criar os dados financeiros");
    }
  }

  async function salvarDadosFinanceiros() {
    try {
      setSalvando(true);
      
      if (!dadosFinanceiros) {
        console.error("Não há dados financeiros para salvar");
        toast.error("Não foi possível salvar os dados financeiros");
        return;
      }
      
      console.log("=== INÍCIO DO SALVAMENTO ===");
      console.log("ID do documento:", documentoId);
      console.log("ID dados financeiros:", dadosFinanceiros.id);
      console.log("Forma de pagamento:", formaPagamento);
      console.log("Quantidade de parcelas:", novaQuantidadeParcelas);
      console.log("Parcelas a salvar:", parcelas);
      
      // 1. Calcular valor total com base nas parcelas
      const valorTotalAtualizado = parcelas.reduce((total, parcela) => total + parcela.valor, 0);
      console.log("Valor total calculado:", valorTotalAtualizado);
      
      // 2. Preparar dados para atualização
      const dadosParaAtualizar = {
        forma_pagamento: formaPagamento,
        quantidade_parcelas: novaQuantidadeParcelas,
        dados_confirmados: true,
        fonte: "manual",
        valor_total: valorTotalAtualizado,
        ultima_atualizacao: new Date().toISOString()
      };
      
      console.log("Dados para atualizar:", dadosParaAtualizar);
      
      // 3. Atualizar dados financeiros
      const { data: dadosAtualizados, error } = await supabase
        .from("dados_financeiros")
        .update(dadosParaAtualizar)
        .eq("id", dadosFinanceiros.id)
        .select("*")
        .single();
        
      if (error) {
        console.error("Erro ao atualizar dados financeiros:", error);
        throw new Error(`Erro ao atualizar dados financeiros: ${error.message}`);
      }
      
      console.log("Dados financeiros atualizados com sucesso:", dadosAtualizados);
      
      // 4. Atualizar parcelas uma por uma
      const parcelasAtualizadas = [];
      
      for (const parcela of parcelas) {
        console.log(`Atualizando parcela ${parcela.numero_parcela} (ID: ${parcela.id}):`, parcela);
        
        // Garantir que os campos de data estejam no formato correto
        const dadosParcelaParaAtualizar = {
          valor: parcela.valor,
          data_vencimento: parcela.data_vencimento 
            ? (typeof parcela.data_vencimento === 'string' 
                ? parcela.data_vencimento 
                : parcela.data_vencimento.toISOString().split('T')[0])
            : null,
          data_pagamento: parcela.data_pagamento 
            ? (typeof parcela.data_pagamento === 'string' 
                ? parcela.data_pagamento 
                : parcela.data_pagamento.toISOString().split('T')[0])
            : null,
          status: parcela.status
        };
        
        console.log("Dados da parcela para atualizar:", dadosParcelaParaAtualizar);
        
        const { data: parcelaAtualizada, error: erroParcela } = await supabase
          .from("parcelas_pagamento")
          .update(dadosParcelaParaAtualizar)
          .eq("id", parcela.id)
          .select("*")
          .single();
          
        if (erroParcela) {
          console.error(`Erro ao atualizar parcela ${parcela.numero_parcela}:`, erroParcela);
          throw new Error(`Erro ao atualizar parcela ${parcela.numero_parcela}: ${erroParcela.message}`);
        }
        
        console.log(`Parcela ${parcela.numero_parcela} atualizada com sucesso:`, parcelaAtualizada);
        parcelasAtualizadas.push(parcelaAtualizada);
      }
      
      // 5. Atualizar o estado com os dados salvos (sem recarregar do banco)
      setDadosFinanceiros(dadosAtualizados);
      setParcelas(parcelasAtualizadas);
      
      console.log("=== FIM DO SALVAMENTO ===");
      toast.success("Dados financeiros salvos com sucesso");
      
      // 6. Sair do modo de edição
      setEditando(false);
    } catch (error) {
      console.error("Erro ao salvar dados financeiros:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os dados financeiros");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarParcela(id: string, campo: keyof Parcela, valor: any) {
    console.log(`Atualizando parcela ${id}, campo ${String(campo)}, valor:`, valor);
    setParcelas(prev => prev.map(parcela => 
      parcela.id === id 
        ? { ...parcela, [campo]: valor } 
        : parcela
    ));
  }

  function adicionarParcela() {
    if (!dadosFinanceiros) return;
    
    console.log("Adicionando nova parcela...");
    
    // Encontrar a última parcela para calcular a próxima data de vencimento
    const ultimaParcela = [...parcelas].sort((a, b) => b.numero_parcela - a.numero_parcela)[0];
    
    let dataVencimento = null;
    if (ultimaParcela?.data_vencimento) {
      const dataUltima = new Date(ultimaParcela.data_vencimento);
      const dataProxima = new Date(dataUltima);
      dataProxima.setDate(dataUltima.getDate() + 30);
      dataVencimento = dataProxima.toISOString().split("T")[0];
    } else {
      // Se não houver data da última parcela, usar hoje + 30 dias
      const hoje = new Date();
      const dataProxima = new Date(hoje);
      dataProxima.setDate(hoje.getDate() + 30);
      dataVencimento = dataProxima.toISOString().split("T")[0];
    }
    
    // Calcular valor médio das parcelas existentes
    const valorMedio = parcelas.length > 0 
      ? parcelas.reduce((total, parcela) => total + parcela.valor, 0) / parcelas.length
      : dadosFinanceiros.valor_total;
    
    const novaParcela: Partial<Parcela> = {
      dados_financeiros_id: dadosFinanceiros.id,
      numero_parcela: ultimaParcela ? ultimaParcela.numero_parcela + 1 : 1,
      valor: valorMedio,
      data_vencimento: dataVencimento,
      status: "pendente"
    };
    
    console.log("Nova parcela a adicionar:", novaParcela);
    
    // Adicionar parcela no banco de dados
    supabase
      .from("parcelas_pagamento")
      .insert(novaParcela)
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao adicionar parcela:", error);
          toast.error("Não foi possível adicionar a parcela");
          return;
        }
        
        console.log("Parcela adicionada com sucesso:", data);
        
        // Adicionar ao estado
        setParcelas(prev => [...prev, data]);
        
        // Atualizar quantidade de parcelas nos dados financeiros
        const novaQuantidade = parcelas.length + 1;
        setNovaQuantidadeParcelas(novaQuantidade);
        
        // Atualizar no banco de dados
        supabase
          .from("dados_financeiros")
          .update({ 
            quantidade_parcelas: novaQuantidade,
            ultima_atualizacao: new Date().toISOString()
          })
          .eq("id", dadosFinanceiros.id)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao atualizar quantidade de parcelas:", error);
            }
          });
      });
  }

  function removerParcela(id: string) {
    if (!dadosFinanceiros) return;
    
    console.log("Removendo parcela:", id);
    
    // Confirmar remoção
    if (!confirm("Tem certeza que deseja remover esta parcela?")) {
      return;
    }
    
    // Remover parcela do banco de dados
    supabase
      .from("parcelas_pagamento")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao remover parcela:", error);
          toast.error("Não foi possível remover a parcela");
          return;
        }
        
        console.log("Parcela removida com sucesso");
        
        // Remover do estado
        setParcelas(prev => prev.filter(p => p.id !== id));
        
        // Atualizar quantidade de parcelas nos dados financeiros
        const novaQuantidade = parcelas.length - 1;
        setNovaQuantidadeParcelas(novaQuantidade);
        
        // Atualizar no banco de dados
        supabase
          .from("dados_financeiros")
          .update({ 
            quantidade_parcelas: novaQuantidade,
            ultima_atualizacao: new Date().toISOString()
          })
          .eq("id", dadosFinanceiros.id)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao atualizar quantidade de parcelas:", error);
            }
          });
      });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "pendente":
        return <Badge className="bg-blue-500">Pendente</Badge>;
      case "atrasado":
        return <Badge className="bg-red-500">Atrasado</Badge>;
      case "cancelado":
        return <Badge className="bg-gray-500">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  }

  async function recriarDados() {
    try {
      // Tentar apagar dados existentes e recriar
      setIsLoading(true);
      toast.info("Recriando dados financeiros...");
      
      if (dadosFinanceiros) {
        // Excluir parcelas
        await supabase
          .from("parcelas_pagamento")
          .delete()
          .eq("dados_financeiros_id", dadosFinanceiros.id);
          
        // Excluir dados financeiros
        await supabase
          .from("dados_financeiros")
          .delete()
          .eq("id", dadosFinanceiros.id);
      }
      
      // Recriar tudo
      await criarDadosFinanceiros();
      
      toast.success("Dados financeiros recriados com sucesso!");
      setErro(null);
    } catch (e) {
      console.error("Erro ao recriar dados:", e);
      setErro(e instanceof Error ? e.message : "Erro ao recriar dados");
      toast.error("Erro ao recriar dados financeiros");
    } finally {
      setIsLoading(false);
    }
  }

  // Se não for uma apólice ou proposta, não exibe nada
  if (tipoDocumento !== "apolice" && tipoDocumento !== "proposta") {
    console.log("Não exibindo componente de gestão de pagamentos: tipo de documento não compatível");
    return null;
  }

  return (
    <Card className="mt-6 bg-card border border-gray-800 transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-card border-b border-gray-800">
        <div className="flex items-center gap-2 min-h-[32px]">
          <CardTitle className="text-md font-medium">
            Informações de Pagamento
          </CardTitle>
          {dadosFinanceiros && (
            <Badge variant="outline" className="ml-2">
              {dadosFinanceiros.quantidade_parcelas}x de {formatarMoeda(dadosFinanceiros.valor_total / dadosFinanceiros.quantidade_parcelas)}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-2 p-1 rounded flex items-center justify-center h-full self-center hover:bg-muted/30 transition"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardContent className="pt-2 bg-card">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : erro ? (
                <div className="p-4 border border-red-300 bg-red-50 rounded text-red-800 flex flex-col space-y-2">
                  <h3 className="font-semibold">Erro ao carregar dados financeiros</h3>
                  <p>{erro}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => carregarDadosFinanceiros()}>
                      Tentar novamente
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={async () => {
                        try {
                          // Tentar apagar dados existentes e recriar
                          setIsLoading(true);
                          
                          if (dadosFinanceiros) {
                            // Excluir parcelas
                            await supabase
                              .from("parcelas_pagamento")
                              .delete()
                              .eq("dados_financeiros_id", dadosFinanceiros.id);
                              
                            // Excluir dados financeiros
                            await supabase
                              .from("dados_financeiros")
                              .delete()
                              .eq("id", dadosFinanceiros.id);
                          }
                          
                          // Recriar tudo
                          await criarDadosFinanceiros();
                          
                          setErro(null);
                        } catch (e) {
                          console.error("Erro ao recriar dados:", e);
                          setErro(e instanceof Error ? e.message : "Erro ao recriar dados");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                    >
                      Forçar recriação
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Cabeçalho com dados gerais */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
                        {editando ? (
                          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                            <SelectTrigger id="forma-pagamento" className="bg-background border border-gray-800 focus:ring-0 focus:outline-none">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Boleto / Carnê">Boleto / Carnê</SelectItem>
                              <SelectItem value="Débito em Conta">Débito em Conta</SelectItem>
                              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-2 border border-gray-800 rounded-md text-sm bg-background">
                            {formaPagamento || "Não informado"}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
                        <div className="p-2 border border-gray-800 rounded-md text-sm bg-background">
                          {novaQuantidadeParcelas || 0}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="valor-total">Valor Total</Label>
                        <div className="p-2 border border-gray-800 rounded-md text-sm bg-background">
                          {formatarMoeda(dadosFinanceiros?.valor_total || 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Tabela de parcelas */}
                    <div className="border border-gray-800 rounded-md bg-card">
                      <Table className="w-full">
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[10%] text-center">Parcela</TableHead>
                            <TableHead className="w-[25%]">Vencimento</TableHead>
                            <TableHead className="w-[25%]">Valor (R$)</TableHead>
                            <TableHead className="w-[20%]">Status</TableHead>
                            <TableHead className="w-[20%] text-center">Pago</TableHead>
                            {editando && <TableHead className="w-[10%]">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelas.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={editando ? 6 : 5} className="text-center py-4 italic text-gray-500">
                                Nenhuma parcela cadastrada
                              </TableCell>
                            </TableRow>
                          ) : (
                            parcelas.map(parcela => (
                              <TableRow key={parcela.id} className="transition-colors">
                                <TableCell className="text-center">{parcela.numero_parcela}</TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal bg-background border border-gray-800">
                                          {parcela.data_vencimento ? format(parseConsistentDate(parcela.data_vencimento) || new Date(), "dd/MM/yyyy") : "Selecionar data"}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={parseConsistentDate(parcela.data_vencimento)}
                                          onSelect={(date) => {
                                            console.log("Nova data selecionada:", date);
                                            // Usar nossa função segura para formatar a data
                                            if (date) {
                                              const dataFormatada = formatDateForStorage(date);
                                              console.log("Data formatada:", dataFormatada);
                                              atualizarParcela(parcela.id, "data_vencimento", dataFormatada);
                                            }
                                          }}
                                          locale={ptBR}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    parcela.data_vencimento ?
                                      format(parseConsistentDate(parcela.data_vencimento) || new Date(), "dd/MM/yyyy")
                                      : "Não definido"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Input
                                      type="number"
                                      value={parcela.valor}
                                      onChange={e => {
                                        const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        atualizarParcela(parcela.id, "valor", valor);
                                      }}
                                      className="w-full bg-background border border-gray-800 focus:ring-0 focus:outline-none"
                                      step="0.01"
                                      min="0"
                                      onBlur={e => {
                                        const valor = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        if (isNaN(valor) || valor < 0) {
                                          atualizarParcela(parcela.id, "valor", 0);
                                        }
                                      }}
                                    />
                                  ) : (
                                    formatarMoeda(parcela.valor)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Select value={parcela.status} onValueChange={v => {
                                      atualizarParcela(parcela.id, "status", v);
                                    }}>
                                      <SelectTrigger className="bg-background border border-gray-800 focus:ring-0 focus:outline-none">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="pago">Pago</SelectItem>
                                        <SelectItem value="atrasado">Atrasado</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <div className="min-w-20">
                                      {getStatusBadge(parcela.status)}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <label className="relative inline-flex items-center justify-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={parcela.status === "pago"}
                                      onChange={async () => {
                                        const novoStatus = parcela.status === "pago" ? "pendente" : "pago";
                                        // Atualizar status localmente
                                        atualizarParcela(parcela.id, "status", novoStatus);
                                        // Atualizar no banco de dados
                                        const dataPagamento = novoStatus === "pago" ? new Date().toISOString().split("T")[0] : null;
                                        atualizarParcela(parcela.id, "data_pagamento", dataPagamento);
                                        
                                        try {
                                          const { error } = await supabase
                                            .from("parcelas_pagamento")
                                            .update({
                                              status: novoStatus,
                                              data_pagamento: dataPagamento
                                            })
                                            .eq("id", parcela.id);
                                            
                                          if (error) {
                                            console.error("Erro ao atualizar status da parcela:", error);
                                            toast.error("Não foi possível atualizar o status da parcela");
                                            // Reverter mudança local em caso de erro
                                            atualizarParcela(parcela.id, "status", parcela.status);
                                            atualizarParcela(parcela.id, "data_pagamento", parcela.data_pagamento);
                                          } else {
                                            toast.success(`Parcela ${novoStatus === "pago" ? "marcada como paga" : "marcada como pendente"}`);
                                          }
                                        } catch (error) {
                                          console.error("Erro na operação:", error);
                                          toast.error("Ocorreu um erro ao atualizar a parcela");
                                        }
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                  </label>
                                </TableCell>
                                {editando && (
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removerParcela(parcela.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex justify-between">
                      {editando ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={adicionarParcela}
                            disabled={salvando}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Parcela
                          </Button>
                          
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setEditando(false)}
                              disabled={salvando}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={salvarDadosFinanceiros}
                              disabled={salvando}
                            >
                              {salvando ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Salvando...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  Salvar
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditando(true)}
                          >
                            Editar Pagamentos
                          </Button>
                          
                          <AlertDialog open={mostrarAlertaRecriacao} onOpenChange={setMostrarAlertaRecriacao}>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Recriar Dados
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Recriar dados financeiros</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja recriar os dados financeiros? Todos os dados atuais serão perdidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={recriarDados}>
                                  OK
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
} 