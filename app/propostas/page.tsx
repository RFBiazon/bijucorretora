"use client"

import { useState, useEffect } from "react"
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

  const renderPropostaCard = (proposta: DocumentoProcessado) => {
    return (
      <Card
        key={proposta.id}
        className={"overflow-hidden transition-all duration-300 bg-black dark:bg-black border border-gray-800 min-h-[250px] max-h-[290px] h-full flex flex-col justify-between"}
      >
        <CardHeader className="pb-2">
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
        <CardContent className="pb-2">
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
        <CardFooter className="pt-2 flex justify-between items-center mt-auto">
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