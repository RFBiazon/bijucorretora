"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { recriarTodosPagamentos } from "@/utils/recriar-pagamentos"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function AdministracaoPagamentos() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultado, setResultado] = useState<{
    total: number
    sucessos: number
    falhas: number
  } | null>(null)

  async function handleRecriarPagamentos() {
    if (!confirm("ATENÇÃO: Esta operação irá recriar TODOS os dados de pagamento. Os dados existentes serão excluídos e novos serão criados com base nos dados originais de cada documento. Deseja continuar?")) {
      return
    }
    
    try {
      setIsProcessing(true)
      setResultado(null)
      
      const result = await recriarTodosPagamentos()
      setResultado(result)
      
      toast.success("Processo concluído!")
    } catch (error) {
      console.error("Erro ao recriar pagamentos:", error)
      toast.error("Erro ao processar: " + (error instanceof Error ? error.message : "Erro desconhecido"))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Administração de Pagamentos</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recriar Todos os Pagamentos</CardTitle>
            <CardDescription>
              Recria os dados de pagamento para todos os documentos (apólices e propostas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Esta operação irá excluir todos os dados de pagamento existentes e recriar com base nos dados 
                originais de cada documento. Utilize com cautela.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleRecriarPagamentos}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recriar Todos os Pagamentos
                </>
              )}
            </Button>
            
            {resultado && (
              <div className="mt-4 p-4 border rounded-md">
                <h3 className="font-medium mb-2">Resultado do processamento:</h3>
                <p>Total de documentos: {resultado.total}</p>
                <p className="text-green-500">Sucessos: {resultado.sucessos}</p>
                <p className="text-red-500">Falhas: {resultado.falhas}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
} 