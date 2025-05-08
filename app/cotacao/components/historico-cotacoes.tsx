"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Trash2, Eye, User } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    console.log("Iniciando exclusão da cotação:", id)
    try {
      // Primeiro, remova do Supabase
      console.log("Enviando requisição para o Supabase...")
      const { error } = await supabase.from("cotacoes").delete().eq("id", id)

      if (error) {
        console.error("Erro do Supabase ao excluir:", error)
        throw error
      }

      console.log("Cotação excluída com sucesso do Supabase")
      
      // Atualizar o estado local imediatamente
      setCotacoes((prev) => {
        console.log("Atualizando estado local...")
        const novasCotacoes = prev.filter((cotacao) => cotacao.id !== id)
        console.log("Novo estado:", novasCotacoes)
        return novasCotacoes
      })

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
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: i * 0.1,
              ease: [0.4, 0, 0.2, 1]
            }}
          >
            <Card>
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
          </motion.div>
        ))}
      </div>
    )
  }

  if (cotacoes.length === 0) {
    return (
      <motion.div 
        className="text-center py-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
        <h3 className="text-lg font-medium">Nenhuma cotação salva</h3>
        <p className="text-sm text-muted-foreground mt-1">As cotações salvas aparecerão aqui.</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {cotacoes.map((cotacao, index) => (
          <motion.div
            key={cotacao.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: [0.4, 0, 0.2, 1]
            }}
            layout
          >
            <Card className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="font-medium max-w-full break-words whitespace-normal">{cotacao.nome}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatarData(cotacao.data)}</p>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button variant="ghost" size="icon" onClick={() => onSelect(cotacao)}>
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Visualizar cotação</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4" />
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
                            onClick={() => {
                              console.log("Botão de exclusão clicado para ID:", cotacao.id)
                              excluirCotacao(cotacao.id)
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
