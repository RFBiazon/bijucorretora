"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, FilePlus, FileCheck, Clock, AlertCircle, Search, Trash2, Eye, Link2 } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import PageTransition from "@/components/PageTransition"
import { normalizarProposta } from "@/lib/utils/normalize"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
    proximaParcela: {
      numero: number
      valor: number
      data_vencimento: string
      status: string
    } | null
  }
}

export default function PropostasPage() {
  // Todos os hooks devem estar no topo
  const [propostas, setPropostas] = useState<DocumentoProcessado[]>([])
  const [propostasFiltradas, setPropostasFiltradas] = useState<DocumentoProcessado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [propostaParaExcluir, setPropostaParaExcluir] = useState<string | null>(null)
  const [novaPropostaId, setNovaPropostaId] = useState<string | null>(null)
  const [propostaAtualizada, setPropostaAtualizada] = useState<any>(null)
  const [tab, setTab] = useState("todas")
  const [documentosComParcelas, setDocumentosComParcelas] = useState<Set<string>>(new Set())

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
    fetchPropostas()

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
    if (searchTerm.trim() === "") {
      setPropostasFiltradas(propostas)
      return
    }

    const termLower = searchTerm.toLowerCase().trim()
    const filtradas = propostas.filter((proposta) => {
      // Busca por nome do segurado
      const nome = proposta.segurado.nome?.toLowerCase() || ""
      if (nome.includes(termLower)) return true

      // Busca por CPF
      const cpf = proposta.segurado.cpf?.toLowerCase() || ""
      if (cpf.includes(termLower)) return true

      // Busca por placa do veículo
      const placa = proposta.veiculo.placa?.toLowerCase() || ""
      if (placa.includes(termLower)) return true

      // Busca por número da proposta
      const numeroProposta = proposta.proposta.numero?.toLowerCase() || ""
      if (numeroProposta.includes(termLower)) return true

      return false
    })

    setPropostasFiltradas(filtradas)
  }, [searchTerm, propostas])

  if (propostaAtualizada) {
    setPropostas((prev) =>
      prev.map((p) => (p.id === propostaAtualizada.id ? propostaAtualizada : p))
    )
    setPropostaAtualizada(null)
  }

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
    let label = "Proposta";
    if (tipo === "apolice") {
      color = "bg-green-600";
      label = "Apólice";
    } else if (tipo === "endosso") {
      color = "bg-yellow-500 text-black";
      label = "Endosso";
    }
    return <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{label}</span>;
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

  const propostasFiltradasPorTab = propostasFiltradas.filter((p) => {
    if (tab === "apolices") return p.tipo_documento === "apolice";
    if (tab === "propostas") return p.tipo_documento === "proposta";
    return true;
  });

  // Função para buscar informações de parcelas para um documento
  const buscarInfoParcelas = useCallback(async (documento: DocumentoProcessado) => {
    if (documentosComParcelas.has(documento.id)) return documento;
    
    try {
      // Primeiro, busca os dados financeiros
      const { data: dadosFinanceiros } = await supabase
        .from("dados_financeiros")
        .select("*")
        .eq("documento_id", documento.id)
        .single();
      
      if (!dadosFinanceiros) return documento;
      
      // Buscar parcelas associadas
      const { data: parcelas } = await supabase
        .from("parcelas_pagamento")
        .select("*")
        .eq("dados_financeiros_id", dadosFinanceiros.id)
        .order("numero_parcela", { ascending: true });
      
      if (!parcelas || parcelas.length === 0) return documento;
      
      // Determinar a próxima parcela a ser exibida
      let proximaParcela = null;
      
      if (documento.tipo_documento === "proposta") {
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
      
      // Atualizar o documento com as informações de parcelas
      documento.parcelas = {
        formaPagamento: dadosFinanceiros.forma_pagamento,
        proximaParcela: proximaParcela ? {
          numero: proximaParcela.numero_parcela,
          valor: proximaParcela.valor,
          data_vencimento: proximaParcela.data_vencimento,
          status: proximaParcela.status
        } : null
      };
      
      // Marcar documento como já processado
      setDocumentosComParcelas(prev => new Set([...prev, documento.id]));
      
      return documento;
    } catch (error) {
      console.error("Erro ao buscar informações de parcelas:", error);
      return documento;
    }
  }, [documentosComParcelas]);

  // Este efeito carrega parcelas quando propostas são carregadas inicialmente
  useEffect(() => {
    if (!isLoading && propostas.length > 0) {
      // Pegar todos os documentos sem parcelas
      const documentosSemParcelas = propostas.filter(doc => !doc.parcelas);
      if (documentosSemParcelas.length > 0) {
        console.log(`Buscando parcelas para ${documentosSemParcelas.length} documentos`);
        
        // Processar todos os documentos sem parcelas
        Promise.all(documentosSemParcelas.map(doc => buscarInfoParcelas(doc)))
          .then(documentosProcessados => {
            // Atualizar a lista de propostas com os documentos processados
            setPropostas(prev => 
              prev.map(doc => {
                const docProcessado = documentosProcessados.find(d => d.id === doc.id);
                return docProcessado || doc;
              })
            );
          });
      }
    }
  }, [isLoading, propostas.length, buscarInfoParcelas]);

  // Atualizar as informações de parcelas quando as propostas filtradas mudarem
  useEffect(() => {
    // Buscar parcelas para TODOS os documentos exibidos, independente da aba
    const documentosSemParcelas = propostasFiltradas.filter(doc => !doc.parcelas);
    
    if (documentosSemParcelas.length > 0) {
      // Processar todos os documentos sem informações de parcelas
      Promise.all(documentosSemParcelas.map(doc => buscarInfoParcelas(doc)))
        .then(documentosProcessados => {
          // Atualizar a lista de propostas filtradas com os documentos processados
          setPropostasFiltradas(prev => 
            prev.map(doc => {
              const docProcessado = documentosProcessados.find(d => d.id === doc.id);
              return docProcessado || doc;
            })
          );
        });
    }
  }, [propostasFiltradas, buscarInfoParcelas]);

  const renderPropostaCard = (proposta: DocumentoProcessado) => {
    // Função para formatar data no formato brasileiro
    const formatarData = (dataString: string) => {
      if (!dataString) return "N/A";
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

    // Função para obter status em formato legível
    const getStatusParcela = (status: string, dataVencimento: string) => {
      if (status === "pago") return "Pago";
      if (status === "cancelado") return "Cancelado";
      if (status === "atrasado") return "Atrasado";
      
      // Verificar se é pendente, vence hoje ou à vencer com base na data de vencimento
      if (status === "pendente") {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataVenc = new Date(dataVencimento);
        dataVenc.setHours(0, 0, 0, 0);
        
        // Se a data de vencimento for exatamente hoje
        if (dataVenc.getTime() === hoje.getTime()) {
          return "Vence hoje";
        }
        
        // Se a data de vencimento for maior que hoje, está à vencer
        // Se for menor que hoje, está pendente (atrasada)
        return dataVenc > hoje ? "À vencer" : "Pendente";
      }
      
      return status;
    };

    return (
      <Card
        key={proposta.id}
        className={"overflow-hidden transition-all duration-300 bg-black dark:bg-black border border-gray-800 h-full flex flex-col justify-between"}
      >
        <CardHeader className="pb-1">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-mono flex items-center">
                {getNumeroDocumento(proposta)}
                {tipoBadge(proposta.tipo_documento)}
              </CardTitle>
            </div>
            {getStatusBadge(proposta.status)}
          </div>
          <CardDescription className="truncate max-w-full">
            {proposta.proposta.cia_seguradora}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-1">
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
              <div className="mt-0.5 text-xs border-t border-gray-800 pt-0.5">
                {proposta.parcelas?.formaPagamento === "Cartão de Crédito" ? (
                  <p className="text-muted-foreground">
                    <span className="text-primary">Pagamento:</span> Cartão de Crédito
                  </p>
                ) : proposta.tipo_documento === "proposta" ? (
                  <>
                    <p className="text-muted-foreground">
                      <span className="text-primary">Parcela de Entrada:</span> {formatarData(proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                    </p>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Valor: {formatarMoeda(proposta.parcelas?.proximaParcela?.valor || 0)}</span>
                      <span className={`${proposta.parcelas?.proximaParcela?.status === 'atrasado' ? 'text-red-500' : 
                        proposta.parcelas?.proximaParcela?.status === 'pago' ? 'text-green-500' : 
                        getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'À vencer' ? 'text-blue-500' : 
                        getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Vence hoje' ? 'text-yellow-500' : 
                        'text-yellow-500'}`}>
                        {proposta.tipo_documento.includes("cancelado") ? "Cancelado" : getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      <span className="text-primary">
                        {(() => {
                          const numParcela = proposta.parcelas?.proximaParcela?.numero;
                          const parcelaStr = String(numParcela || '');
                          
                          if (parcelaStr === '1' || parcelaStr.toLowerCase().includes('vista')) {
                            return 'Primeira Parcela:';
                          } else {
                            return `Próxima Parcela [${numParcela}]:`;
                          }
                        })()}
                      </span> {formatarData(proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                    </p>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Valor: {formatarMoeda(proposta.parcelas?.proximaParcela?.valor || 0)}</span>
                      <span className={`${proposta.parcelas?.proximaParcela?.status === 'atrasado' ? 'text-red-500' : 
                        proposta.parcelas?.proximaParcela?.status === 'pago' ? 'text-green-500' : 
                        getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'À vencer' ? 'text-blue-500' : 
                        getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '') === 'Vence hoje' ? 'text-yellow-500' : 
                        'text-yellow-500'}`}>
                        {proposta.tipo_documento.includes("cancelado") ? "Cancelado" : getStatusParcela(proposta.parcelas?.proximaParcela?.status || '', proposta.parcelas?.proximaParcela?.data_vencimento || '')}
                      </span>
                    </p>
                  </>
                )}
              </div>
            ) : proposta.proposta.forma_pagto === "cartão de crédito" || proposta.proposta.forma_pagto === "cartao de credito" ? (
              <div className="mt-0.5 text-xs border-t border-gray-800 pt-0.5">
                <p className="text-muted-foreground">
                  <span className="text-primary">Pagamento:</span> Cartão de Crédito
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="pt-1 flex justify-between items-center mt-auto">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {proposta.criado_em || proposta.created_at
                ? new Date((proposta.criado_em || proposta.created_at) ?? "").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">ID: {proposta.id.substring(0, 8)}</span>
          </div>
          <div className="flex gap-2">
            <Link href={`/propostas/${proposta.id}`}>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPropostaParaExcluir(proposta.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

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
              <div className="mt-4 md:mt-0">
                <Button asChild>
                  <Link href="/propostas/upload">
                    <FileUpload className="mr-2 h-4 w-4" />
                    Nova Proposta
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, placa ou número da proposta..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="apolices">Apólices</TabsTrigger>
                <TabsTrigger value="propostas">Propostas</TabsTrigger>
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
                ) : propostasFiltradasPorTab.length > 0 ? (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {propostasFiltradasPorTab.map((proposta, idx) => (
                        <motion.div
                          key={proposta.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 1, delay: 0.7 + idx * 0.07 }}
                        >
                          {renderPropostaCard(proposta as DocumentoProcessado)}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <Card className="bg-black dark:bg-black border border-gray-800">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma proposta encontrada</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {searchTerm
                          ? "Nenhuma proposta corresponde à sua busca."
                          : "Comece enviando uma nova proposta."}
                      </p>
                      <Button asChild>
                        <Link href="/propostas/upload">
                          <FileUpload className="mr-2 h-4 w-4" />
                          Nova Proposta
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
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