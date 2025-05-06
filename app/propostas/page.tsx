"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadIcon as FileUpload, FilePlus, FileCheck, Clock, AlertCircle, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import type { PropostaProcessada } from "@/types/proposta"
import { useToast } from "@/components/ui/use-toast"
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

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<PropostaProcessada[]>([])
  const [propostasFiltradas, setPropostasFiltradas] = useState<PropostaProcessada[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [propostaParaExcluir, setPropostaParaExcluir] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPropostas()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setPropostasFiltradas(propostas)
      return
    }

    const termLower = searchTerm.toLowerCase().trim()
    const filtradas = propostas.filter((proposta) => {
      // Busca por nome do segurado
      const nome = proposta.resultado?.segurado?.nome?.toLowerCase() || ""
      if (nome.includes(termLower)) return true

      // Busca por CPF
      const cpf = proposta.resultado?.segurado?.cpf?.toLowerCase() || ""
      if (cpf.includes(termLower)) return true

      // Busca por placa do veículo
      const placa = proposta.resultado?.veiculo?.placa?.toLowerCase() || ""
      if (placa.includes(termLower)) return true

      // Busca por número da proposta
      const numeroProposta = proposta.resultado?.proposta?.numero?.toLowerCase() || ""
      if (numeroProposta.includes(termLower)) return true

      // Busca por ID da proposta
      if (proposta.id.toLowerCase().includes(termLower)) return true

      return false
    })

    setPropostasFiltradas(filtradas)
  }, [searchTerm, propostas])

  const fetchPropostas = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("ocr_processamento").select("*").limit(50)

      if (error) {
        throw error
      }

      setPropostas(data || [])
      setPropostasFiltradas(data || [])
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
      toast({
        title: "Erro ao carregar propostas",
        description: "Não foi possível carregar as propostas. Tente novamente mais tarde.",
        variant: "destructive",
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

      toast({
        title: "Proposta excluída",
        description: "A proposta foi excluída com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir proposta:", error)
      toast({
        title: "Erro ao excluir proposta",
        description: "Não foi possível excluir a proposta. Tente novamente mais tarde.",
        variant: "destructive",
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

  const renderPropostaCard = (proposta: PropostaProcessada) => (
    <Card key={proposta.id} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {proposta.resultado?.proposta?.numero || proposta.id.substring(0, 8)}
          </CardTitle>
          {getStatusBadge(proposta.status)}
        </div>
        <CardDescription>
          {proposta.resultado?.proposta?.cia_seguradora || "Seguradora não identificada"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">{proposta.resultado?.segurado?.nome || "Segurado não identificado"}</p>
          <p className="text-sm text-muted-foreground">
            {proposta.resultado?.veiculo?.marca_modelo || "Veículo não identificado"}
            {proposta.resultado?.veiculo?.placa ? ` - Placa: ${proposta.resultado.veiculo.placa}` : ""}
          </p>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">ID: {proposta.id.substring(0, 8)}</span>
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
          <Button variant="outline" size="sm" asChild disabled={proposta.status !== "concluido"}>
            <Link href={`/propostas/${proposta.id}`}>Ver detalhes</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )

  return (
    <div className="container py-8">
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
                <Card key={i} className="animate-pulse">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propostasFiltradas.map((proposta) => renderPropostaCard(proposta))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                {searchTerm ? (
                  <>
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma proposta encontrada</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Não encontramos propostas correspondentes à sua busca. Tente outros termos.
                    </p>
                    <Button variant="outline" onClick={() => setSearchTerm("")}>
                      Limpar busca
                    </Button>
                  </>
                ) : (
                  <>
                    <FilePlus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhuma proposta encontrada</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-6">
                      Você ainda não tem propostas processadas. Envie um PDF para começar.
                    </p>
                    <Button asChild>
                      <Link href="/propostas/upload">
                        <FileUpload className="mr-2 h-4 w-4" />
                        Nova Proposta
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="concluidas">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propostasFiltradas.filter((p) => p.status === "concluido").map((proposta) => renderPropostaCard(proposta))}
          </div>
        </TabsContent>

        <TabsContent value="processando">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propostasFiltradas
              .filter((p) => p.status === "processando")
              .map((proposta) => renderPropostaCard(proposta))}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!propostaParaExcluir} onOpenChange={(open) => !open && setPropostaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirProposta} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}