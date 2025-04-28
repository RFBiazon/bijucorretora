"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Copy, Upload, RefreshCw, CheckCircle, FileUp, File, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { validatePdfFile } from "@/utils/file-validation"
import { HistoricoCotacoes } from "./components/historico-cotacoes"
import { v4 as uuidv4 } from "uuid"
import { extrairNomeSegurado } from "@/utils/extrator-dados"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"

interface ResultadoCotacao {
  texto: string
  id?: string
  nome?: string
  nomeSegurado?: string
  data?: string
}

export default function CotacaoPage() {
  const [file, setFile] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ResultadoCotacao | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return

    const validation = validatePdfFile(selectedFile)
    if (!validation.valid) {
      toast({
        title: "Erro",
        description: validation.message,
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return 95
          }
          return prev + 5
        })
      }, 200)

      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_URL || "", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Extrair nome do segurado do texto
      const nomeSegurado = extrairNomeSegurado(data.texto)

      setResultado({
        ...data,
        nomeSegurado,
      })

      toast({
        title: "Sucesso",
        description: "PDF processado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error)
      toast({
        title: "Erro",
        description: "Falha ao processar o PDF. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (resultado?.texto) {
      navigator.clipboard
        .writeText(resultado.texto)
        .then(() => {
          setCopied(true)
          toast({
            title: "Copiado!",
            description: "Texto copiado para a área de transferência",
          })
          setTimeout(() => setCopied(false), 2000)
        })
        .catch(() => {
          toast({
            title: "Erro",
            description: "Falha ao copiar o texto",
            variant: "destructive",
          })
        })
    }
  }

  const resetForm = () => {
    setFile(null)
    setResultado(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const salvarCotacao = () => {
    if (!resultado || !file) return

    const novaCotacao = {
      id: uuidv4(),
      nome: resultado.nomeSegurado || file.name, // Usar nome do segurado ou nome do arquivo como fallback
      nomeArquivo: file.name,
      data: new Date().toLocaleDateString("pt-BR"),
      texto: resultado.texto,
    }

    const cotacoesExistentes = JSON.parse(localStorage.getItem("cotacoes") || "[]")
    const novasCotacoes = [novaCotacao, ...cotacoesExistentes]
    localStorage.setItem("cotacoes", JSON.stringify(novasCotacoes))

    toast({
      title: "Cotação salva",
      description: "A cotação foi adicionada ao histórico",
    })
  }

  const carregarCotacao = (cotacao: any) => {
    setResultado(cotacao)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Cotação de Seguro</span>
            <span className="text-2xl">🚗</span>
          </CardTitle>
          <CardDescription>Envie o PDF da cotação para processamento automático</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!resultado ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
                      : "border-gray-300 hover:border-primary hover:bg-gray-50 dark:border-gray-700 dark:hover:border-primary dark:hover:bg-gray-800/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <AnimatePresence mode="wait">
                    {!file ? (
                      <motion.div
                        key="upload-prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center"
                      >
                        <div className="p-3 mb-4 rounded-full bg-primary/10">
                          <FileUp className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Arraste e solte o arquivo PDF aqui</h3>
                        <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar um arquivo</p>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                          <Upload className="mr-2 h-4 w-4" />
                          Selecionar arquivo
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                          className="hidden"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="file-selected"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center w-full"
                      >
                        <div className="p-3 mb-4 rounded-full bg-green-100 dark:bg-green-900/30">
                          <File className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Arquivo selecionado</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs truncate">{file.name}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={resetForm} disabled={loading}>
                            <X className="mr-1 h-4 w-4" />
                            Remover
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                          >
                            <Upload className="mr-1 h-4 w-4" />
                            Trocar arquivo
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : null}

            {loading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso do processamento</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  {uploadProgress < 100 ? "Processando PDF..." : "Processamento concluído!"}
                </p>
              </div>
            )}

            {resultado && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">
                    {resultado.nomeSegurado ? `Cotação de: ${resultado.nomeSegurado}` : "Texto da Cotação:"}
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="flex items-center gap-1">
                      {copied ? (
                        <>
                          <CheckCircle size={16} className="text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copiar
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={salvarCotacao} className="flex items-center gap-1">
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700 text-sm overflow-auto max-h-[300px]">
                    {resultado.texto}
                  </pre>
                </div>
                <Button variant="outline" onClick={resetForm} className="w-full">
                  Nova Consulta
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        {!resultado && file && (
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Processar PDF"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
      {!resultado && (
        <Card className="w-full max-w-lg mt-6">
          <CardHeader>
            <CardTitle>Histórico de Cotações</CardTitle>
          </CardHeader>
          <CardContent>
            <HistoricoCotacoes onSelect={carregarCotacao} />
          </CardContent>
        </Card>
      )}
      <Toaster />
    </div>
  )
}
