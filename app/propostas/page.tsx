"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, FilePlus, FileCheck, Clock, AlertCircle, Search, Trash2, Eye } from "lucide-react"
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

type PropostaProcessada = {
  id: string
  status: string
  resultado: any
  criado_em?: string
  created_at?: string
}

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<PropostaProcessada[]>([])
  const [propostasFiltradas, setPropostasFiltradas] = useState<PropostaProcessada[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [propostaParaExcluir, setPropostaParaExcluir] = useState<string | null>(null)
  const [novaPropostaId, setNovaPropostaId] = useState<string | null>(null)

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
        (payload) => {
          console.log("Nova proposta recebida:", payload)
          const novaProposta = payload.new as PropostaProcessada
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
        (payload) => {
          console.log("Proposta atualizada:", payload)
          const propostaAtualizada = payload.new as PropostaProcessada
          setPropostas((prev) =>
            prev.map((p) => (p.id === propostaAtualizada.id ? propostaAtualizada : p))
          )
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
      const propostaNormalizada = normalizarProposta(proposta)
      
      // Busca por nome do segurado
      const nome = propostaNormalizada.segurado.nome.toLowerCase()
      if (nome.includes(termLower)) return true

      // Busca por CPF
      const cpf = propostaNormalizada.segurado.cpf.toLowerCase()
      if (cpf.includes(termLower)) return true

      // Busca por placa do veículo
      const placa = propostaNormalizada.veiculo.placa.toLowerCase()
      if (placa.includes(termLower)) return true

      // Busca por número da proposta
      const numeroProposta = propostaNormalizada.proposta.numero.toLowerCase()
      if (numeroProposta.includes(termLower)) return true

      // Busca por nome da seguradora
      const seguradora = propostaNormalizada.proposta.cia_seguradora.toLowerCase()
      if (seguradora.includes(termLower)) return true

      // Busca por modelo/marca do veículo
      const marcaModelo = propostaNormalizada.veiculo.marca_modelo.toLowerCase()
      if (marcaModelo.includes(termLower)) return true

      // Busca por nome do corretor
      const corretor = propostaNormalizada.corretor?.nome?.toLowerCase() || ""
      if (corretor.includes(termLower)) return true

      // Busca por ID da proposta
      if (proposta.id.toLowerCase().includes(termLower)) return true

      return false
    })

    setPropostasFiltradas(filtradas)
  }, [searchTerm, propostas])

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
      setPropostas(data || [])
      setPropostasFiltradas(data || [])
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
      toast.error("Erro ao carregar propostas", {
        description: "Não foi possível carregar as propostas. Tente novamente mais tarde.",
      })
    } finally {
      setIsLoading(false)
    }
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

  const renderPropostaCard = (proposta: PropostaProcessada) => {
    const isNovaProposta = proposta.id === novaPropostaId
    const propostaNormalizada = normalizarProposta(proposta)

    return (
      <motion.div
        key={proposta.id}
        initial={isNovaProposta ? { scale: 0.95, opacity: 0 } : false}
        animate={isNovaProposta ? { scale: 1, opacity: 1 } : false}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`overflow-hidden transition-all duration-300 bg-black dark:bg-black border border-gray-800 min-h-[250px] max-h-[290px] h-full flex flex-col justify-between ${
            isNovaProposta ? "ring-2 ring-primary animate-pulse" : ""
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg truncate max-w-[70%]">{propostaNormalizada.proposta.numero || proposta.id.substring(0, 8)}</CardTitle>
              {getStatusBadge(proposta.status)}
            </div>
            <CardDescription className="truncate max-w-full">
              {propostaNormalizada.proposta.cia_seguradora}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold mt-2 mb-1 truncate max-w-full">{propostaNormalizada.segurado.nome}</p>
              <p className="text-sm text-muted-foreground mb-1 truncate max-w-full">
                CPF: {propostaNormalizada.segurado.cpf}
              </p>
              <p className="text-sm text-muted-foreground mb-1 truncate max-w-full">
                {propostaNormalizada.veiculo.marca_modelo}
              </p>
              {propostaNormalizada.veiculo.placa && (
                <p className="text-sm text-muted-foreground mb-2 truncate max-w-full">
                  Placa: {propostaNormalizada.veiculo.placa}
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
              <span className="text-[10px] text-gray-400 dark:text-gray-500 select-all">ID: {proposta.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/30"
                onClick={() => setPropostaParaExcluir(proposta.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir proposta</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                disabled={proposta.status !== "concluido"}
              >
                <Link href={`/propostas/${proposta.id}`}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Ver detalhes</span>
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    )
  }

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF, placa ou número da proposta..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>

          <Tabs defaultValue="todas" className="space-y-4">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
              <TabsTrigger value="processando">Em Processamento</TabsTrigger>
            </TabsList>

            <TabsContent value="todas" className="space-y-4">
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
              ) : propostasFiltradas.length > 0 ? (
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {propostasFiltradas.map((proposta, idx) => (
                      <motion.div
                        key={proposta.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, delay: idx * 0.07 }}
                      >
                        {renderPropostaCard(proposta)}
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

            <TabsContent value="concluidas" className="space-y-4">
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {propostasFiltradas
                    .filter((p) => p.status === "concluido")
                    .map((proposta) => renderPropostaCard(proposta))}
                </AnimatePresence>
              </motion.div>
            </TabsContent>

            <TabsContent value="processando" className="space-y-4">
              {propostasFiltradas
                .filter((p) => p.status === "processando")
                .map((proposta) => renderPropostaCard(proposta))}
            </TabsContent>
          </Tabs>

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