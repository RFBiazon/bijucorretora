"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Trash2, Eye, User } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"

interface Cotacao {
  id: string
  nome: string
  nome_arquivo?: string
  data: string
  texto: string
  created_at: string
}

interface HistoricoCotacoesProps {
  onSelect: (cotacao: Cotacao) => void
}

export function HistoricoCotacoes({ onSelect }: HistoricoCotacoesProps) {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchCotacoes()
  }, [])

  const fetchCotacoes = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase.from("cotacoes").select("*").order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setCotacoes(data || [])
    } catch (error) {
      console.error("Erro ao buscar cotações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de cotações.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const excluirCotacao = async (id: string) => {
    try {
      // Primeiro, remova do Supabase
      const { error } = await supabase.from("cotacoes").delete().eq("id", id)

      if (error) {
        throw error
      }

      // Se a exclusão no Supabase for bem-sucedida, atualize a interface
      setCotacoes(cotacoes.filter((cotacao) => cotacao.id !== id))

      toast({
        title: "Cotação excluída",
        description: "A cotação foi removida com sucesso do banco de dados.",
        variant: "default",
      })
    } catch (error) {
      console.error("Erro ao excluir cotação:", error)
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a cotação. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const formatarData = (dataString: string) => {
    try {
      const data = parseISO(dataString)
      return format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (cotacoes.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <h3 className="text-lg font-medium">Nenhuma cotação salva</h3>
        <p className="text-sm text-muted-foreground mt-1">As cotações salvas aparecerão aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cotacoes.map((cotacao) => (
        <Card key={cotacao.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-medium truncate max-w-[200px]">{cotacao.nome}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{formatarData(cotacao.data)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => onSelect(cotacao)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cotação</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => excluirCotacao(cotacao.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
