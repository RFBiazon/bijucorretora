"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import "./hover-effects.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, FilePlus, FileCheck, Clock, AlertCircle, Search, Trash2, Eye, Link2, Loader2, SortAsc, CalendarClock, ChevronUp, ChevronDown, Check, CheckCircle2, Filter } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
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
import PageTransition from "@/components/PageTransition"
import { normalizarProposta } from "@/lib/utils/normalize"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

type DocumentoProcessado = {
  id: string
  status: string
  criado_em?: string
  created_at?: string
  tipo_documento: "proposta" | "apolice" | "endosso" | "cancelado"
  proposta: {
    numero?: string
    cia_seguradora?: string
    apolice?: string
    endosso?: string
    vigencia_fim?: string
    forma_pagto?: string
  }
  segurado: {
    nome?: string
    cpf?: string
  }
  veiculo: {
    marca_modelo?: string
    placa?: string
  }
  parcelas?: {
    formaPagamento: string
    totalParcelas?: number
    proximaParcela: {
      numero: number
      valor: number
      data_vencimento: string
      status: string
    } | null
  }
  resultado?: any // Campo para acessar o JSON original
}

function parseDataVigencia(data: string | undefined): Date | null {
  if (!data) return null;
  // Se for formato brasileiro dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('/');
    return new Date(`${ano}-${mes}-${dia}T00:00:00`);
  }
  // Se for formato ISO ou já aceito pelo Date
  const d = new Date(data);
  return isNaN(d.getTime()) ? null : d;
}

// Exibe nome formatado da seguradora conforme regras (mesma da tabela)
function formatarNomeSeguradora(nome: string): string {
  if (!nome) return "";
  const lower = nome.toLowerCase();
  if (lower.includes("tokio marine")) {
    return "Tokio Marine";
  }
  if (lower.includes("hdi")) {
    return "HDI";
  }
  const primeira = nome.split(" ")[0];
  return primeira.charAt(0).toUpperCase() + primeira.slice(1).toLowerCase();
}

// Função para obter status em formato legível (movida para nível global)
function getStatusParcela(status: string, dataVencimento: string) {
  if (status === "pago") return "Pago";
  if (status === "cancelado") return "Cancelado";
  if (status === "atrasado") return "Atrasado";
  // Unificar: se está pendente e vencida, mostrar 'Atrasado'
  if (status === "pendente") {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let dataVenc: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataVencimento)) {
      const [ano, mes, dia] = dataVencimento.split('-');
      dataVenc = new Date(Number(ano), Number(mes) - 1, Number(dia));
    } else {
      dataVenc = new Date(dataVencimento);
    }
    dataVenc.setHours(0, 0, 0, 0);
    if (dataVenc.getTime() === hoje.getTime()) {
      return "Vence Hoje";
    }
    if (dataVenc > hoje) {
      return "À vencer";
    }
    // Se está pendente e vencida, mostrar 'Atrasado'
    return "Atrasado";
  }
  return status;
}

// Função para verificar se o documento é de cartão de crédito
function isCartaoCredito(doc: DocumentoProcessado): boolean {
  const formaPagamento = doc.parcelas?.formaPagamento || "";
  const formaPagto = doc.proposta?.forma_pagto || "";
  
  return formaPagamento.toLowerCase().includes("cartão") || 
         formaPagamento.toLowerCase().includes("cartao") || 
         formaPagto.toLowerCase().includes("cartão") || 
         formaPagto.toLowerCase().includes("cartao");
}

export default function PropostasPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // Todos os hooks devem estar no topo
  const [propostas, setPropostas] = useState<DocumentoProcessado[]>([])
  const [propostasFiltradas, setPropostasFiltradas] = useState<DocumentoProcessado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [propostaParaExcluir, setPropostaParaExcluir] = useState<string | null>(null)
  const [novaPropostaId, setNovaPropostaId] = useState<string | null>(null)
  const [propostaAtualizada, setPropostaAtualizada] = useState<any>(null)
  const [tab, setTab] = useState(tabParam || "todas")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [tabToShow, setTabToShow] = useState(tabParam || "todas")
  const [ordenacao, setOrdenacao] = useState<"recente" | "antiga" | "vigencia_prox" | "vigencia_dist" | "vencimento_prox" | "vencimento_dist">("vencimento_prox")
  
  // Novos estados para filtros
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [filtrosAtivos, setFiltrosAtivos] = useState<{
    seguradoras: string[]
    statusParcela: string[]
    formaPagamento: string[]
    mesesVigencia: number | null
  }>({
    seguradoras: [],
    statusParcela: [],
    formaPagamento: [],
    mesesVigencia: null
  })
  const [seguradorasDisponiveis, setSeguradorasDisponiveis] = useState<string[]>([])
  const [formasPagamentoDisponiveis, setFormasPagamentoDisponiveis] = useState<string[]>([])

  // Atualizar a aba ativa se o parâmetro da URL mudar
  useEffect(() => {
    if (tabParam && tab !== tabParam) setTab(tabParam);
  }, [tabParam]);

  const fetchPropostas = async () => {
    try {
      setIsLoading(true)
      console.log("Iniciando busca de propostas...")
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Erro na busca:", error)
        throw error
      }

      console.log("Propostas encontradas:", data?.length || 0)
      const propostasNormalizadas = data.map((proposta: any) => normalizarProposta(proposta))
      setPropostas(propostasNormalizadas)
      setPropostasFiltradas(propostasNormalizadas)
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
      toast.error("Erro ao carregar propostas", {
        description: "Não foi possível carregar as propostas. Tente novamente mais tarde.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Configurar realtime subscription para novas propostas
    const channel = supabase
      .channel("propostas_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ocr_processamento",
        },
        (payload: any) => {
          console.log("Nova proposta recebida:", payload)
          const novaProposta = payload.new as DocumentoProcessado
          setPropostas((prev) => [novaProposta, ...prev])
          setNovaPropostaId(novaProposta.id)
          toast.success("Nova proposta recebida!", {
            description: "A proposta está sendo processada.",
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ocr_processamento",
        },
        (payload: any) => {
          console.log("Proposta atualizada:", payload)
          const propostaAtualizada = payload.new as DocumentoProcessado
          setPropostaAtualizada(propostaAtualizada)
          if (propostaAtualizada.status === "concluido") {
            toast.success("Proposta processada!", {
              description: "A proposta foi processada com sucesso.",
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const buscar = async () => {
    if (searchTerm.trim() === "") {
      setPropostasFiltradas(propostas)
      return
    }
      setIsLoading(true)
      const term = searchTerm.trim()
      let resultados: any[] = []
      // Regex para identificar padrões
      const soLetras = /^[A-Za-zÀ-ÿ ]+$/
      const placaRegex = /^[A-Za-z]{3}[0-9A-Za-z]{4}$/i
      const soNumeros = /^[0-9]+$/
      let debug = ''
      if (soLetras.test(term) && term.length >= 4) {
        // Buscar só por nome
        debug = 'nome';
        const { data } = await supabase.from("ocr_processamento").select("*").ilike("resultado->segurado->>nome", `%${term}%`).order("criado_em", { ascending: false })
        resultados = data || []
      } else if (placaRegex.test(term)) {
        // Buscar só por placa
        debug = 'placa';
        const { data } = await supabase.from("ocr_processamento").select("*").ilike("resultado->veiculo->>placa", `%${term}%`).order("criado_em", { ascending: false })
        resultados = data || []
      } else if (soNumeros.test(term) && term.length >= 3) {
        // Buscar por CPF, proposta e apólice
        debug = 'numeros';
        const [cpf, numero, apolice] = await Promise.all([
          supabase.from("ocr_processamento").select("*").ilike("resultado->segurado->>cpf", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->proposta->>numero", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->proposta->>apolice", `%${term}%`).order("criado_em", { ascending: false }),
        ])
        resultados = [
          ...(cpf.data || []),
          ...(numero.data || []),
          ...(apolice.data || []),
        ]
      }
      // Fallback se não encontrou nada
      if (resultados.length === 0) {
        debug = 'fallback';
        const [nome, cpf, placa, numero, apolice] = await Promise.all([
          supabase.from("ocr_processamento").select("*").ilike("resultado->segurado->>nome", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->segurado->>cpf", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->veiculo->>placa", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->proposta->>numero", `%${term}%`).order("criado_em", { ascending: false }),
          supabase.from("ocr_processamento").select("*").ilike("resultado->proposta->>apolice", `%${term}%`).order("criado_em", { ascending: false }),
        ])
        resultados = [
          ...(nome.data || []),
          ...(cpf.data || []),
          ...(placa.data || []),
          ...(numero.data || []),
          ...(apolice.data || []),
        ]
      }
      // Remover duplicados por id
      const vistos = new Set()
      const unicos = resultados.filter((item: any) => {
        if (vistos.has(item.id)) return false
        vistos.add(item.id)
        return true
      })
      setPropostasFiltradas(unicos.map((proposta: any) => normalizarProposta(proposta)))
      setIsLoading(false)
      // Log para debug
      console.log(`[BUSCA] termo: '${term}' | modo: ${debug} | encontrados: ${unicos.length}`)
    }
    buscar()
  }, [searchTerm])

  // Modificar a função fetchByTab para implementar a solução de forma mais direta
  useEffect(() => {
    const fetchByTab = async () => {
      setIsLoading(true);
      
      try {
        // 1. Buscar documentos por tipo (dependendo da aba)
        let query = supabase.from("ocr_processamento").select("*").order("criado_em", { ascending: false }).limit(30)
        if (tab === "propostas") {
          query = query.eq("tipo_documento", "proposta")
        } else if (tab === "apolices") {
          query = query.eq("tipo_documento", "apolice")
        } else if (tab === "endossos") {
          query = query.eq("tipo_documento", "endosso")
        } else if (tab === "cancelados") {
          query = query.eq("tipo_documento", "cancelado")
        }
        
        const { data, error } = await query
        if (error) {
          console.error("Erro ao buscar documentos:", error)
          return
        }
        
        if (!data || data.length === 0) {
          setPropostas([])
          setPropostasFiltradas([])
          setIsLoading(false)
          return
        }
        
        // 2. Normalizar os documentos
        const propostasNormalizadas = data.map((proposta: any) => normalizarProposta(proposta))
        
        // 3. Buscar os dados financeiros para cada documento
        const propostasComParcelas = await Promise.all(
          propostasNormalizadas.map(async (doc) => {
            try {
              // 3.1 Buscar os dados financeiros
              const { data: dadosFinanceiros } = await supabase
                .from("dados_financeiros")
                .select("*")
                .eq("documento_id", doc.id)
                .single();
                
              if (!dadosFinanceiros) return doc;
              
              // 3.2 Buscar as parcelas
              const { data: parcelas } = await supabase
                .from("parcelas_pagamento")
                .select("*")
                .eq("dados_financeiros_id", dadosFinanceiros.id)
                .order("numero_parcela", { ascending: true });
                
              if (!parcelas || parcelas.length === 0) return doc;
              
              // 3.3 Determinar a próxima parcela a ser exibida
              let proximaParcela = null;
              
              if (doc.tipo_documento === "proposta") {
                // Para propostas, mostrar a primeira parcela (parcela de entrada)
                proximaParcela = parcelas[0];
              } else {
                // Para apólices, endossos ou cancelados, mostrar a parcela posterior à última paga
                const parcelasPagas = parcelas.filter(p => p.status === "pago");
                const ultimaParcelaPaga = parcelasPagas.length > 0 
                  ? parcelasPagas.sort((a, b) => b.numero_parcela - a.numero_parcela)[0] 
                  : null;
                
                if (ultimaParcelaPaga) {
                  // Encontrar a próxima parcela após a última paga
                  proximaParcela = parcelas.find(p => p.numero_parcela > ultimaParcelaPaga.numero_parcela) || null;
                } else {
                  // Se nenhuma parcela foi paga, mostrar a primeira
                  proximaParcela = parcelas[0];
                }
              }
              
              // 3.4 Atualizar o documento com as informações de parcelas e total de parcelas
              return {
                ...doc,
                parcelas: {
                  formaPagamento: dadosFinanceiros.forma_pagamento,
                  totalParcelas: parcelas.length, // Adicionar o total de parcelas diretamente
                  proximaParcela: proximaParcela ? {
                    numero: proximaParcela.numero_parcela,
                    valor: proximaParcela.valor,
                    data_vencimento: proximaParcela.data_vencimento,
                    status: proximaParcela.status
                  } : null
                }
              };
            } catch (error) {
              console.error(`Erro ao buscar parcelas para documento ${doc.id}:`, error);
              return doc;
            }
          })
        );
        
        // 4. Ordenar os documentos por vencimento da parcela
        const propostasOrdenadas = [...propostasComParcelas].sort((a, b) => {
          // Verificar se algum dos documentos é cartão de crédito
          const aCartao = isCartaoCredito(a);
          const bCartao = isCartaoCredito(b);
          
          // Se um é cartão e outro não, o cartão vai depois
          if (aCartao && !bCartao) return 1;
          if (!aCartao && bCartao) return -1;
          
          // Obter datas de vencimento
          const getDataVencimento = (doc: DocumentoProcessado) => {
            if (!doc.parcelas?.proximaParcela?.data_vencimento) return null;
            return new Date(doc.parcelas.proximaParcela.data_vencimento);
          };
          
          const vencA = getDataVencimento(a);
          const vencB = getDataVencimento(b);
          
          // Se um tem data e outro não, o que tem data vem primeiro
          if (vencA && !vencB) return -1;
          if (!vencA && vencB) return 1;
          
          // Se ambos têm datas, comparar por proximidade (mais próximo primeiro)
          if (vencA && vencB) {
            // Comparar as datas
            const hoje = new Date();
            
            // Verificar se alguma data está no passado
            const vencAPassado = vencA < hoje;
            const vencBPassado = vencB < hoje;
            
            // Se uma está no passado e a outra no futuro, a do futuro vem primeiro
            if (vencAPassado && !vencBPassado) return 1;
            if (!vencAPassado && vencBPassado) return -1;
            
            // Se ambas estão no passado ou ambas no futuro, ordenar normalmente por proximidade
            return vencA.getTime() - vencB.getTime();
          }
          
          // Se nenhum tem data de vencimento, ordenar por data de criação
          const dateA = a.criado_em || "";
          const dateB = b.criado_em || "";
          return dateB.localeCompare(dateA); // mais recente primeiro
        });
        
        // 5. Atualizar os estados
        setPropostas(propostasOrdenadas);
        setPropostasFiltradas(propostasOrdenadas);
        
      } catch (err) {
        console.error("Erro ao processar dados:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Executar ao mudar de aba
    fetchByTab();
  }, [tab]);

  useEffect(() => {
    if (tab !== tabToShow) {
      setIsTabLoading(true)
      const timeout = setTimeout(() => {
        setTabToShow(tab)
        setIsTabLoading(false)
      }, 400) // 400ms de loading
      return () => clearTimeout(timeout)
    }
  }, [tab])

  useEffect(() => {
    if (propostaAtualizada) {
      setPropostas((prev) =>
        prev.map((p) => (p.id === propostaAtualizada.id ? propostaAtualizada : p))
      )
      setPropostaAtualizada(null)
    }
  }, [propostaAtualizada]);

  const excluirProposta = async () => {
    if (!propostaParaExcluir) return

    try {
      const { error } = await supabase.from("ocr_processamento").delete().eq("id", propostaParaExcluir)

      if (error) {
        throw error
      }

      // Atualiza a lista de propostas após excluir
      setPropostas((prev) => prev.filter((p) => p.id !== propostaParaExcluir))
      setPropostasFiltradas((prev) => prev.filter((p) => p.id !== propostaParaExcluir))

      toast.success("Proposta excluída", {
        description: "A proposta foi excluída com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir proposta:", error)
      toast.error("Erro ao excluir proposta", {
        description: "Não foi possível excluir a proposta. Tente novamente mais tarde.",
      })
    } finally {
      setPropostaParaExcluir(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 px-2 py-1 rounded-full text-xs">
            <FileCheck className="h-3 w-3" />
            <span>Concluído</span>
          </div>
        )
      case "processando":
        return (
          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
            <Clock className="h-3 w-3 animate-spin" />
            <span>Processando</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-2 py-1 rounded-full text-xs">
            <AlertCircle className="h-3 w-3" />
            <span>Erro</span>
          </div>
        )
    }
  }

  const tipoBadge = (tipo: string) => {
    let color = "bg-blue-600";
    let hoverColor = "hover:bg-blue-500";
    let label = "Proposta";
    if (tipo === "apolice") {
      color = "bg-green-600";
      hoverColor = "hover:bg-green-500";
      label = "Apólice";
    } else if (tipo === "endosso") {
      color = "bg-yellow-500 text-black";
      hoverColor = "hover:bg-yellow-400";
      label = "Endosso";
    } else if (tipo === "cancelado") {
      color = "bg-red-600";
      hoverColor = "hover:bg-red-500";
      label = "Cancelado";
    }
    return <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${color} ${hoverColor} transition-colors duration-200 relative z-10`}>{label}</span>;
  };

  const getNumeroDocumento = (doc: DocumentoProcessado) => {
    if (doc.tipo_documento === "apolice") {
      return doc.proposta.apolice || doc.proposta.numero || doc.id.substring(0, 8);
    }
    if (doc.tipo_documento === "endosso") {
      return doc.proposta.endosso || doc.proposta.numero || doc.id.substring(0, 8);
    }
    return doc.proposta.numero || doc.id.substring(0, 8);
  };

  const renderPropostaCard = (proposta: DocumentoProcessado) => {
    // Determina a classe de hover baseada no tipo de documento
    const getTipoHoverClass = () => {
      switch (proposta.tipo_documento) {
        case "proposta":
          return "proposta-hover";
        case "apolice":
          return "apolice-hover";
        case "endosso":
          return "endosso-hover";
        case "cancelado":
          return "cancelado-hover";
        default:
          return "proposta-hover"; // Padrão
      }
    };
    
    // Função para formatar data no formato brasileiro
    const formatarData = (dataString: string) => {
      if (!dataString) return "N/A";
      // Se for formato YYYY-MM-DD, criar no horário local
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
        const [ano, mes, dia] = dataString.split('-');
        const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
        return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      // Outros formatos
      const data = new Date(dataString);
      return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    };
    
    // Função para formatar valor monetário
    const formatarMoeda = (valor: number) => {
      return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    // Função para verificar se o seguro está totalmente quitado
    const isSeguroQuitado = (proposta: DocumentoProcessado): boolean => {
      // Verificar se o método de pagamento é boleto ou débito em conta
      const formaPagamento = proposta.parcelas?.formaPagamento?.toLowerCase() || "";
      const isBoletoOuDebito = 
        formaPagamento.includes("boleto") || 
        formaPagamento.includes("carnê") || 
        formaPagamento.includes("carne") || 
        formaPagamento.includes("débito") || 
        formaPagamento.includes("debito");
      
      if (!isBoletoOuDebito) return false;
      
      // Extrair número total de parcelas contratadas
      let totalParcelas = 1; // Padrão é 1
      if (proposta.parcelas?.formaPagamento) {
        // Tentar extrair o número de parcelas da string (ex: "6 x")
        const match = proposta.parcelas.formaPagamento.match(/(\d+)\s*x/i);
        if (match && match[1]) {
          totalParcelas = parseInt(match[1]);
        }
      }
      
      // Se não temos informação sobre a próxima parcela
      if (!proposta.parcelas?.proximaParcela) {
        // Sem parcelas, consideramos quitado apenas para pagamentos à vista
        return totalParcelas <= 1;
      }
      
      // Se a próxima parcela tem status "pendente" ou similar, seguro não está quitado
      if (proposta.parcelas.proximaParcela.status !== "pago") {
        return false;
      }
      
      // Verificar o número da parcela atual
      const numeroParcela = proposta.parcelas.proximaParcela.numero;
      
      // Para propostas, só considerar quitado se for pagamento à vista e a parcela estiver paga
      if (proposta.tipo_documento === "proposta") {
        // Verificar se é pagamento à vista
        return totalParcelas === 1 && proposta.parcelas.proximaParcela.status === "pago";
      }
      
      // Casos específicos para determinar se está quitado (para apólices, endossos, etc):
      
      // Caso 1: Se a parcela atual é a última e está paga
      if (numeroParcela === totalParcelas && proposta.parcelas.proximaParcela.status === "pago") {
        return true;
      }
      
      // Caso 2: Se for uma parcela única (à vista)
      if (totalParcelas === 1 && proposta.parcelas.proximaParcela.status === "pago") {
        return true;
      }
      
      // Em todos os outros casos, não consideramos quitado
      return false;
    };

    return (
      <Card
        key={proposta.id}
        className={`overflow-visible transition-all duration-300 bg-black dark:bg-black ${isSeguroQuitado(proposta) ? 'border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border border-gray-800'} h-full flex flex-col justify-between group hover:-translate-y-1 hover:z-[5] card-hover-effect ${getTipoHoverClass()}`}
      >
        <CardHeader className="pb-1 relative z-10">
          {isSeguroQuitado(proposta) && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-md z-20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-mono flex items-center">
                {getNumeroDocumento(proposta)}
              </CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/documentos/${proposta.id}`} className="inline-block p-0 m-0">
              {tipoBadge(proposta.tipo_documento)}
            </Link>
                </TooltipTrigger>
                <TooltipContent>Ver detalhes do documento</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="truncate max-w-full">
            {formatarNomeSeguradora(proposta.proposta.cia_seguradora || "")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-1 relative z-10">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold mt-2 mb-0 truncate max-w-full">{proposta.segurado.nome}</p>
            <p className="text-sm text-muted-foreground mb-0 truncate max-w-full">
              CPF: {proposta.segurado.cpf}
            </p>
            <p className="text-sm text-muted-foreground mb-0 truncate max-w-full">
              {proposta.veiculo.marca_modelo}
            </p>
            {proposta.veiculo.placa && (
              <p className="text-sm text-muted-foreground truncate max-w-full">
                Placa: {proposta.veiculo.placa}
              </p>
            )}
            
            {/* Informações de parcelas */}
            {proposta.parcelas?.proximaParcela ? (
              <Link
                href={`/documentos/${proposta.id}?tab=valores`}
                className="block mt-0.5 text-xs pt-0.5 cursor-pointer focus:outline-none"
                style={{ textDecoration: 'none' }}
              >
                <motion.div
                  className="relative overflow-hidden p-1.5 rounded-md bg-gradient-to-br from-transparent to-transparent hover:from-primary/5 hover:to-primary/10 transition-colors"
                  initial={{ opacity: 0, y: 5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                >
                  {proposta.parcelas?.formaPagamento === "Cartão de Crédito" ? (
                    <p className="text-muted-foreground">
                      <span className="font-bold text-white">Pagamento:</span> Cartão de Crédito
                    </p>
                  ) : isSeguroQuitado(proposta) ? (
                    <>
                      <p className="text-muted-foreground">
                        <span className="font-bold text-white">Prêmio Pago:</span> {formatarMoeda(proposta.parcelas?.proximaParcela?.valor * (proposta.parcelas?.formaPagamento?.includes(" x") ? 
                          parseInt(proposta.parcelas?.formaPagamento?.split(" x")[0]) : 1) || 0)}
                      </p>
                      <p className="text-muted-foreground flex justify-between">
                        <span>
                          <span className="font-bold text-white">Parcelas:</span> {proposta.parcelas?.formaPagamento?.includes(" x") ? 
                            proposta.parcelas?.formaPagamento?.split(" x")[0] : 1}
                        </span>
                        <span className="text-green-500">Quitado</span>
                      </p>
                    </>
                  ) : proposta.tipo_documento === "proposta" ? (
                    <>
                      <p className="text-muted-foreground">
                          <span className="font-bold text-white">Parcela de Entrada:</span> {formatarData(proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                      </p>
                      <p className="text-muted-foreground flex justify-between">
                          <span>
                            <span className="font-bold text-white">Valor:</span> {formatarMoeda(proposta.parcelas?.proximaParcela?.valor || 0)}
                          </span>
                          <span className={`
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Atrasado' ? 'text-orange-500' : ''}
                            ${proposta.parcelas?.proximaParcela?.status === 'pago' ? 'text-green-500' : ''}
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'À vencer' ? 'text-blue-500' : ''}
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Vence Hoje' ? 'text-yellow-500' : ''}
                          `}>
                          {proposta.tipo_documento.includes("cancelado") ? "Cancelado" : getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                          <span className="font-bold text-white">
                          {(() => {
                            const numParcela = proposta.parcelas?.proximaParcela?.numero;
                            const parcelaStr = String(numParcela || '');
                            
                            // Extrair total de parcelas - considerando várias fontes possíveis
                            let totalParcelas = 1;
                            
                            // 1. Primeira fonte: totalParcelas definido diretamente no objeto parcelas
                            if (proposta.parcelas?.totalParcelas && proposta.parcelas.totalParcelas > 0) {
                              totalParcelas = proposta.parcelas.totalParcelas;
                            }
                            // 2. Segunda fonte: JSON original do documento
                            else if (proposta.resultado?.valores?.parcelamento?.quantidade) {
                              const qtdParcelas = parseInt(proposta.resultado.valores.parcelamento.quantidade);
                              if (!isNaN(qtdParcelas) && qtdParcelas > 0) {
                                totalParcelas = qtdParcelas;
                              }
                            } 
                            // 3. Terceira fonte: string de formaPagamento
                            else if (proposta.parcelas?.formaPagamento) {
                              const match = proposta.parcelas.formaPagamento.match(/(\d+)\s*x/i);
                              if (match && match[1]) {
                                totalParcelas = parseInt(match[1]);
                              } else if (proposta.parcelas.formaPagamento.toLowerCase().includes('3x')) {
                                totalParcelas = 3; // Caso específico para "3x"
                              }
                            }
                            
                            // Debug para identificar problemas
                            if (proposta.id === 'd3ab0140') { // ID mostrado na imagem
                              console.log('Documento com problema:', {
                                id: proposta.id,
                                formaPagamento: proposta.parcelas?.formaPagamento,
                                resultado: proposta.resultado?.valores?.parcelamento,
                                totalParcelasCalculado: totalParcelas
                              });
                            }
                            
                            if (parcelaStr === '1' || parcelaStr.toLowerCase().includes('vista')) {
                              // Se totalParcelas > 1, é a primeira de várias parcelas, não uma parcela única
                              return totalParcelas > 1 ? 
                                `Parcela de Entrada [1/${totalParcelas}]:` : 
                                'À Vista:';
                            } else if (numParcela === totalParcelas) {
                              return `Última Parcela [${numParcela}/${totalParcelas}]:`;
                            } else {
                              // Determinar o nome ordinal da parcela
                              const nomesParcelas = [
                                "", "Primeira", "Segunda", "Terceira", "Quarta", "Quinta", 
                                "Sexta", "Sétima", "Oitava", "Nona", "Décima", 
                                "Décima Primeira", "Décima Segunda"
                              ];
                              
                              // Se o número da parcela está no nosso array de nomes, usar o nome específico
                              if (numParcela > 1 && numParcela < nomesParcelas.length) {
                                return `${nomesParcelas[numParcela]} Parcela [${numParcela}/${totalParcelas}]:`;
                              } else {
                                // Caso o número seja maior que nossos nomes predefinidos, usar formato genérico
                                return `Parcela ${numParcela} [${numParcela}/${totalParcelas}]:`;
                              }
                            }
                          })()}
                        </span> {formatarData(proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                      </p>
                      <p className="text-muted-foreground flex justify-between">
                          <span>
                            <span className="font-bold text-white">Valor:</span> {formatarMoeda(proposta.parcelas?.proximaParcela?.valor || 0)}
                          </span>
                          <span className={`
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Atrasado' ? 'text-orange-500' : ''}
                            ${proposta.parcelas?.proximaParcela?.status === 'pago' ? 'text-green-500' : ''}
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'À vencer' ? 'text-blue-500' : ''}
                            ${getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Vence Hoje' ? 'text-yellow-500' : ''}
                          `}>
                          {proposta.tipo_documento.includes("cancelado") ? "Cancelado" : getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                        </span>
                      </p>
                    </>
                  )}
                </motion.div>
              </Link>
            ) : proposta.proposta.forma_pagto === "cartão de crédito" || proposta.proposta.forma_pagto === "cartao de credito" ? (
              <motion.div 
                className="mt-0.5 text-xs pt-0.5"
                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.4, 
                  delay: 0.2,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
              >
                <motion.div
                  className="relative overflow-hidden p-1.5 rounded-md bg-gradient-to-br from-transparent to-transparent hover:from-primary/5 hover:to-primary/10"
                  whileHover={{ 
                    boxShadow: "0 0 8px rgba(var(--color-primary), 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                <p className="text-muted-foreground">
                  <span className="text-primary">Pagamento:</span> Cartão de Crédito
                </p>
                </motion.div>
              </motion.div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="pt-1 flex justify-between items-center mt-auto relative z-10">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white">
              Vigência: {parseDataVigencia(proposta.proposta.vigencia_fim)
                ? parseDataVigencia(proposta.proposta.vigencia_fim)!.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">ID: {proposta.id.substring(0, 8)}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  onClick={() => setPropostaParaExcluir(proposta.id)}
                  disabled={deletingId === proposta.id}
                >
                  <Trash2 className="h-4 w-4" />
          </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    );
  };

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("ocr_processamento").delete().eq("id", id);
    setPropostas((prev) => prev.filter((doc) => doc.id !== id));
    setPropostasFiltradas((prev) => prev.filter((doc) => doc.id !== id));
    setDeletingId(null);
  }

  // Função para ordenar os documentos
  const ordenarDocumentos = (docs: DocumentoProcessado[]) => {
    return [...docs].sort((a, b) => {
      // Verificar se algum dos documentos é cartão de crédito
      const aCartao = isCartaoCredito(a);
      const bCartao = isCartaoCredito(b);
      
      // Se um é cartão e outro não, o cartão vai depois
      if (aCartao && !bCartao) return 1;
      if (!aCartao && bCartao) return -1;
      
      // Se ambos são cartão ou ambos não são, seguir a regra de ordenação selecionada
      if (ordenacao === "recente") {
        // Ordenar por data de cadastro (mais recente primeiro)
        const dateA = a.criado_em || "";
        const dateB = b.criado_em || "";
        return dateB.localeCompare(dateA);
      } else if (ordenacao === "antiga") {
        // Ordenar por data de cadastro (mais antiga primeiro)
        const dateA = a.criado_em || "";
        const dateB = b.criado_em || "";
        return dateA.localeCompare(dateB);
      } else if (ordenacao === "vigencia_prox") {
        // Ordenar por vigência (mais próxima primeiro)
        const vigA = parseDataVigencia(a.proposta.vigencia_fim);
        const vigB = parseDataVigencia(b.proposta.vigencia_fim);
        if (!vigA && !vigB) return 0;
        if (!vigA) return 1;
        if (!vigB) return -1;
        return vigA.getTime() - vigB.getTime();
      } else if (ordenacao === "vigencia_dist") {
        // Ordenar por vigência (mais distante primeiro)
        const vigA = parseDataVigencia(a.proposta.vigencia_fim);
        const vigB = parseDataVigencia(b.proposta.vigencia_fim);
        if (!vigA && !vigB) return 0;
        if (!vigA) return 1;
        if (!vigB) return -1;
        return vigB.getTime() - vigA.getTime();
      } else if (ordenacao === "vencimento_prox") {
        // Ordenar por data de vencimento da parcela (mais próxima primeiro)
        const getDataVencimento = (doc: DocumentoProcessado) => {
          if (!doc.parcelas?.proximaParcela?.data_vencimento) return null;
          return new Date(doc.parcelas.proximaParcela.data_vencimento);
        };
        
        const vencA = getDataVencimento(a);
        const vencB = getDataVencimento(b);
        
        // Se um tem data e outro não, o que tem data vem primeiro
        if (vencA && !vencB) return -1;
        if (!vencA && vencB) return 1;
        
        // Se ambos têm datas, comparar
        if (vencA && vencB) {
          // Comparar as datas
          const hoje = new Date();
          
          // Verificar se alguma data está no passado
          const vencAPassado = vencA < hoje;
          const vencBPassado = vencB < hoje;
          
          // Se uma está no passado e a outra no futuro, a do futuro vem primeiro
          if (vencAPassado && !vencBPassado) return 1;
          if (!vencAPassado && vencBPassado) return -1;
          
          // Se ambas estão no passado ou ambas no futuro, ordenar normalmente por proximidade
          return vencA.getTime() - vencB.getTime();
        }
        
        // Documentos sem parcelas ficam no fim
        return 0;
      } else if (ordenacao === "vencimento_dist") {
        // Ordenar por data de vencimento da parcela (mais distante primeiro)
        const getDataVencimento = (doc: DocumentoProcessado) => {
          if (!doc.parcelas?.proximaParcela?.data_vencimento) return null;
          return new Date(doc.parcelas.proximaParcela.data_vencimento);
        };
        
        const vencA = getDataVencimento(a);
        const vencB = getDataVencimento(b);
        
        // Se um tem data e outro não, o que tem data vem primeiro
        if (vencA && !vencB) return -1;
        if (!vencA && vencB) return 1;
        
        // Se ambos têm datas, comparar
        if (vencA && vencB) {
          // Comparar as datas
          const hoje = new Date();
          
          // Verificar se alguma data está no passado
          const vencAPassado = vencA < hoje;
          const vencBPassado = vencB < hoje;
          
          // Se uma está no passado e a outra no futuro, a do futuro vem primeiro
          if (vencAPassado && !vencBPassado) return 1;
          if (!vencAPassado && vencBPassado) return -1;
          
          // Se ambas estão no passado ou ambas no futuro, ordenar normalmente (mais distante primeiro)
          return vencB.getTime() - vencA.getTime();
        }
        
        // Documentos sem parcelas ficam no fim
        return 0;
      }
      return 0;
    });
  };

  // Aplicar ordenação sempre que um desses estados mudar
  useEffect(() => {
    setPropostasFiltradas(ordenarDocumentos(propostasFiltradas));
  }, [ordenacao]);

  // Atualizar resultado filtrado quando as propostas mudarem
  useEffect(() => {
    setPropostasFiltradas(ordenarDocumentos(propostas));
  }, [propostas]);

  useEffect(() => {
    // Extrair listas de seguradoras e formas de pagamento disponíveis
    if (propostas.length > 0) {
      const seguradoras = new Set<string>();
      const formasPagamento = new Set<string>();
      
      propostas.forEach(doc => {
        if (doc.proposta.cia_seguradora) {
          seguradoras.add(formatarNomeSeguradora(doc.proposta.cia_seguradora));
        }
        
        if (doc.parcelas?.formaPagamento) {
          // Simplificar para categorias principais: Boleto, Cartão, etc.
          const formaPagto = doc.parcelas.formaPagamento.toLowerCase();
          if (formaPagto.includes('boleto') || formaPagto.includes('carnê') || formaPagto.includes('carne')) {
            formasPagamento.add('Boleto/Carnê');
          } else if (formaPagto.includes('cartão') || formaPagto.includes('cartao')) {
            formasPagamento.add('Cartão de Crédito');
          } else if (formaPagto.includes('débito') || formaPagto.includes('debito')) {
            formasPagamento.add('Débito em Conta');
          } else if (formaPagto.includes('vista')) {
            formasPagamento.add('À Vista');
          } else {
            formasPagamento.add('Outros');
          }
        }
      });
      
      setSeguradorasDisponiveis(Array.from(seguradoras).sort());
      setFormasPagamentoDisponiveis(Array.from(formasPagamento).sort());
    }
  }, [propostas]);
  
  // Função para filtrar documentos com base nos filtros selecionados
  useEffect(() => {
    if (searchTerm.trim() !== "") return; // Se há termo de busca, ignorar filtros
    
    let resultado = [...propostas];
    
    // Aplicar filtros
    if (filtrosAtivos.seguradoras.length > 0) {
      resultado = resultado.filter(doc => 
        doc.proposta.cia_seguradora && 
        filtrosAtivos.seguradoras.includes(formatarNomeSeguradora(doc.proposta.cia_seguradora))
      );
    }
    
    if (filtrosAtivos.formaPagamento.length > 0) {
      resultado = resultado.filter(doc => {
        if (!doc.parcelas?.formaPagamento) return false;
        
        const formaPagto = doc.parcelas.formaPagamento.toLowerCase();
        return (
          (filtrosAtivos.formaPagamento.includes('Boleto/Carnê') && 
           (formaPagto.includes('boleto') || formaPagto.includes('carnê') || formaPagto.includes('carne'))) ||
          (filtrosAtivos.formaPagamento.includes('Cartão de Crédito') && 
           (formaPagto.includes('cartão') || formaPagto.includes('cartao'))) ||
          (filtrosAtivos.formaPagamento.includes('Débito em Conta') && 
           (formaPagto.includes('débito') || formaPagto.includes('debito'))) ||
          (filtrosAtivos.formaPagamento.includes('À Vista') && 
           formaPagto.includes('vista')) ||
          (filtrosAtivos.formaPagamento.includes('Outros') && 
           !formaPagto.includes('boleto') && !formaPagto.includes('carnê') && 
           !formaPagto.includes('carne') && !formaPagto.includes('cartão') && 
           !formaPagto.includes('cartao') && !formaPagto.includes('débito') && 
           !formaPagto.includes('debito') && !formaPagto.includes('vista'))
        );
      });
    }
    
    if (filtrosAtivos.statusParcela.length > 0) {
      resultado = resultado.filter(doc => {
        if (!doc.parcelas?.proximaParcela) return false;
        
        const status = doc.parcelas.proximaParcela.status;
        const dataVencimento = doc.parcelas.proximaParcela.data_vencimento;
        
        // Mapeamento para status exibidos
        const statusExibido = getStatusParcela(status, dataVencimento);
        
        return filtrosAtivos.statusParcela.includes(statusExibido);
      });
    }
    
    if (filtrosAtivos.mesesVigencia !== null) {
      const hoje = new Date();
      const mesesFiltro = filtrosAtivos.mesesVigencia;
      
      resultado = resultado.filter(doc => {
        const dataVigencia = parseDataVigencia(doc.proposta.vigencia_fim);
        if (!dataVigencia) return false;
        
        // Calcular diferença em meses
        const diffMeses = (dataVigencia.getFullYear() - hoje.getFullYear()) * 12 + 
                          (dataVigencia.getMonth() - hoje.getMonth());
        
        return diffMeses <= mesesFiltro;
      });
    }
    
    // Aplicar a ordenação atual
    resultado = ordenarDocumentos(resultado);
    
    setPropostasFiltradas(resultado);
  }, [filtrosAtivos, propostas, ordenacao]);

  // Componente de filtros (adicionar no render)
  const FiltroPainel = () => (
    <motion.div 
      className={`mb-4 bg-black border border-gray-800 rounded-md ${filtroAberto ? 'mt-2' : 'mt-0'}`}
      initial={false}
      animate={{ height: filtroAberto ? 'auto' : 0, opacity: filtroAberto ? 1 : 0, marginBottom: filtroAberto ? 16 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {filtroAberto && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por seguradora */}
            <div>
              <h3 className="text-sm font-medium mb-2">Seguradoras</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {seguradorasDisponiveis.map((seguradora) => (
                  <div key={seguradora} className="flex items-center">
                    <Checkbox 
                      id={`seguradora-${seguradora}`}
                      checked={filtrosAtivos.seguradoras.includes(seguradora)}
                      onCheckedChange={(checked) => {
                        setFiltrosAtivos(prev => {
                          if (checked) {
                            return {...prev, seguradoras: [...prev.seguradoras, seguradora]};
                          } else {
                            return {...prev, seguradoras: prev.seguradoras.filter(s => s !== seguradora)};
                          }
                        });
                      }}
                    />
                    <label 
                      htmlFor={`seguradora-${seguradora}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {seguradora}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Filtro por forma de pagamento */}
            <div>
              <h3 className="text-sm font-medium mb-2">Forma de Pagamento</h3>
              <div className="space-y-1">
                {formasPagamentoDisponiveis.map((forma) => (
                  <div key={forma} className="flex items-center">
                    <Checkbox 
                      id={`pagamento-${forma}`}
                      checked={filtrosAtivos.formaPagamento.includes(forma)}
                      onCheckedChange={(checked) => {
                        setFiltrosAtivos(prev => {
                          if (checked) {
                            return {...prev, formaPagamento: [...prev.formaPagamento, forma]};
                          } else {
                            return {...prev, formaPagamento: prev.formaPagamento.filter(f => f !== forma)};
                          }
                        });
                      }}
                    />
                    <label 
                      htmlFor={`pagamento-${forma}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {forma}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Filtro por status */}
            <div>
              <h3 className="text-sm font-medium mb-2">Status da Parcela</h3>
              <div className="space-y-1">
                {["Pago", "À vencer", "Vence Hoje", "Atrasado", "Cancelado"].map((status) => (
                  <div key={status} className="flex items-center">
                    <Checkbox 
                      id={`status-${status}`}
                      checked={filtrosAtivos.statusParcela.includes(status)}
                      onCheckedChange={(checked) => {
                        setFiltrosAtivos(prev => {
                          if (checked) {
                            return {...prev, statusParcela: [...prev.statusParcela, status]};
                          } else {
                            return {...prev, statusParcela: prev.statusParcela.filter(s => s !== status)};
                          }
                        });
                      }}
                    />
                    <label 
                      htmlFor={`status-${status}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Filtro por vigência */}
            <div className="md:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-medium mb-2">Vigência</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { meses: 1, label: "Próximo mês" },
                  { meses: 3, label: "Próximos 3 meses" },
                  { meses: 6, label: "Próximos 6 meses" },
                  { meses: 12, label: "Próximo ano" }
                ].map((opcao) => (
                  <Button
                    key={opcao.meses}
                    variant={filtrosAtivos.mesesVigencia === opcao.meses ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFiltrosAtivos(prev => ({
                        ...prev, 
                        mesesVigencia: prev.mesesVigencia === opcao.meses ? null : opcao.meses
                      }));
                    }}
                    className="text-xs"
                  >
                    {opcao.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Botões de ação dos filtros */}
          <div className="flex justify-end mt-4 gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFiltrosAtivos({
                  seguradoras: [],
                  statusParcela: [],
                  formaPagamento: [],
                  mesesVigencia: null
                });
              }}
            >
              Limpar filtros
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setFiltroAberto(false)}
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-8">
          {/* Topo animado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Propostas e Apólices</h1>
                <p className="text-muted-foreground">Gerencie propostas e apólices processadas</p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-2">
                <Button asChild>
                  <Link href="/documentos/upload">
                    <FileUpload className="mr-2 h-4 w-4" />
                    Novo Documento
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/documentos/tabela">
                    Relatório de Vigências
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mb-2 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF, placa ou número da proposta..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFiltroAberto(!filtroAberto)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                    {(filtrosAtivos.seguradoras.length > 0 || 
                      filtrosAtivos.statusParcela.length > 0 || 
                      filtrosAtivos.formaPagamento.length > 0 ||
                      filtrosAtivos.mesesVigencia !== null) && (
                      <Badge variant="secondary" className="ml-1">
                        {filtrosAtivos.seguradoras.length + 
                         filtrosAtivos.statusParcela.length + 
                         filtrosAtivos.formaPagamento.length + 
                         (filtrosAtivos.mesesVigencia !== null ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        <span>Ordenar</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2">
                      <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={ordenacao}>
                        <DropdownMenuRadioItem value="recente" 
                          onClick={() => setOrdenacao(ordenacao === "recente" ? "antiga" : "recente")}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span>Data de Cadastro</span>
                          {ordenacao === "recente" ? <ChevronDown className="h-4 w-4 ml-2" /> : 
                           ordenacao === "antiga" ? <ChevronUp className="h-4 w-4 ml-2" /> : null}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="vigencia_prox" 
                          onClick={() => setOrdenacao(ordenacao === "vigencia_prox" ? "vigencia_dist" : "vigencia_prox")}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span>Vigência</span>
                          {ordenacao === "vigencia_prox" ? <ChevronUp className="h-4 w-4 ml-2" /> : 
                           ordenacao === "vigencia_dist" ? <ChevronDown className="h-4 w-4 ml-2" /> : null}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="vencimento_prox" 
                          onClick={() => setOrdenacao(ordenacao === "vencimento_prox" ? "vencimento_dist" : "vencimento_prox")}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <span>Data de Vencimento</span>
                          {ordenacao === "vencimento_prox" ? <ChevronUp className="h-4 w-4 ml-2" /> : 
                           ordenacao === "vencimento_dist" ? <ChevronDown className="h-4 w-4 ml-2" /> : null}
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Componente de filtro */}
              <FiltroPainel />
              
            </div>
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="propostas">Propostas</TabsTrigger>
                <TabsTrigger value="apolices">Apólices</TabsTrigger>
                <TabsTrigger value="endossos">Endossos</TabsTrigger>
                <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Grid de cards animado, só aparece após o topo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsContent value={tab} className="space-y-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse bg-black dark:bg-black border border-gray-800">
                        <CardHeader className="pb-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                        </CardContent>
                        <CardFooter>
                          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {isTabLoading ? (
                      <motion.div
                        key={tab + "-loading"}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center min-h-[200px]"
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </motion.div>
                    ) : propostasFiltradas.length > 0 ? (
                      <motion.div
                        key={tabToShow}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 cards-container"
                      >
                        {propostasFiltradas.map((proposta, idx) => (
                          <motion.div
                            key={proposta.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            className="card-container relative z-[1]"
                            onMouseMove={(e) => {
                              const card = e.currentTarget;
                              const rect = card.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const y = e.clientY - rect.top;
                              card.style.setProperty("--mouse-x", `${x}px`);
                              card.style.setProperty("--mouse-y", `${y}px`);
                            }}
                          >
                            {renderPropostaCard(proposta as DocumentoProcessado)}
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={tabToShow + "-empty"}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center min-h-[200px] text-muted-foreground"
                      >
                        Nenhum documento encontrado para esta aba.
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          <AlertDialog open={!!propostaParaExcluir} onOpenChange={() => setPropostaParaExcluir(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir proposta</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={excluirProposta} className="bg-red-500 hover:bg-red-600">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageTransition>
    </ProtectedRoute>
  )
}