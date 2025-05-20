"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import "./hover-effects.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, FilePlus, FileCheck, Clock, AlertCircle, Search, Trash2, Eye, Link2, Loader2 } from "lucide-react"
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
  }
  segurado: {
    nome?: string
    cpf?: string
  }
  veiculo: {
    marca_modelo?: string
    placa?: string
  }
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [tabToShow, setTabToShow] = useState(tab)

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

  useEffect(() => {
    const fetchByTab = async () => {
      setIsLoading(true)
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
      if (!error && data) {
        const propostasNormalizadas = data.map((proposta: any) => normalizarProposta(proposta))
        setPropostas(propostasNormalizadas)
        setPropostasFiltradas(propostasNormalizadas)
      }
      setIsLoading(false)
    }
    fetchByTab()
  }, [tab])

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
    
    return (
      <Card
        key={proposta.id}
        className={`overflow-visible transition-all duration-300 bg-black dark:bg-black border border-gray-800 min-h-[250px] max-h-[290px] h-full flex flex-col justify-between group hover:-translate-y-1 hover:z-[5] card-hover-effect ${getTipoHoverClass()}`}
      >
        <CardHeader className="pb-2 relative z-10">
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
        <CardContent className="pb-2 relative z-10">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold mt-2 mb-1 truncate max-w-full">{proposta.segurado.nome}</p>
            <p className="text-sm text-muted-foreground mb-1 truncate max-w-full">
              CPF: {proposta.segurado.cpf}
            </p>
            <p className="text-sm text-muted-foreground mb-1 truncate max-w-full">
              {proposta.veiculo.marca_modelo}
            </p>
            {proposta.veiculo.placa && (
              <p className="text-sm text-muted-foreground mb-2 truncate max-w-full">
                Placa: {proposta.veiculo.placa}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2 flex justify-between items-center mt-auto relative z-10">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
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