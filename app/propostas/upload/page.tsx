"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { FileUp, Upload, File, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error" | "checking">("idle")
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Verificar periodicamente se o registro foi criado no Supabase
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (propostaId && uploadStatus === "checking") {
      intervalId = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("ocr_processamento")
            .select("id, status")
            .eq("id", propostaId)
            .single()

          setCheckCount((prev) => prev + 1)

          if (data) {
            // Registro encontrado
            clearInterval(intervalId!)
            setUploadStatus("success")

            toast({
              title: "Proposta registrada",
              description: "A proposta foi registrada com sucesso e está sendo processada.",
            })

            // Redirecionar após um breve delay
            setTimeout(() => {
              router.push("/propostas")
            }, 1500)
          } else if (checkCount >= 12) {
            // 60 segundos (12 verificações de 5 segundos)
            // Timeout após 60 segundos
            clearInterval(intervalId!)
            setUploadStatus("error")

            toast({
              title: "Tempo esgotado",
              description: "Não foi possível confirmar o registro da proposta. Verifique na página de propostas.",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Erro ao verificar registro:", error)
        }
      }, 5000) // Verificar a cada 5 segundos
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [propostaId, uploadStatus, checkCount, toast, router])

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return

    if (selectedFile.type !== "application/pdf") {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      })
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      // 10MB
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB.",
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

    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)
    setCheckCount(0)

    const formData = new FormData()
    formData.append("data", file)

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

      // Enviar para processamento externo
      const response = await fetch("https://n8n.neosystemsai.com/webhook/pdf's", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // O ID da proposta vem do retorno do webhook
      const id = data.id
      setPropostaId(id)

      // Mudar para o estado de verificação
      setUploadStatus("checking")

      toast({
        title: "Upload concluído",
        description: "O arquivo foi enviado com sucesso. Verificando registro...",
      })
    } catch (error) {
      console.error("Erro no upload:", error)
      setUploadStatus("error")
      toast({
        title: "Erro no upload",
        description: `Ocorreu um erro ao enviar o arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setUploadStatus("idle")
    setUploadProgress(0)
    setPropostaId(null)
    setCheckCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cadastro de Proposta/Apólice</CardTitle>
            <CardDescription>Envie o PDF da proposta ou apólice para processamento automático</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
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
                          <Button variant="outline" size="sm" onClick={resetForm} disabled={isUploading}>
                            <X className="mr-1 h-4 w-4" />
                            Remover
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
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

              {uploadStatus !== "idle" && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{uploadStatus === "checking" ? "Verificando registro..." : `${uploadProgress}%`}</span>
                  </div>
                  <Progress value={uploadStatus === "checking" ? undefined : uploadProgress} className="h-2" />
                  <div className="flex items-center justify-center mt-2">
                    {uploadStatus === "uploading" && (
                      <p className="text-sm text-muted-foreground flex items-center">
                        <span className="animate-spin mr-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        </span>
                        Enviando arquivo...
                      </p>
                    )}
                    {uploadStatus === "checking" && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando registro no sistema... ({checkCount}/12)
                      </p>
                    )}
                    {uploadStatus === "success" && (
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Proposta registrada! Redirecionando...
                      </p>
                    )}
                    {uploadStatus === "error" && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Erro no processo. Tente novamente.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/propostas")}>
              Voltar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                !file || uploadStatus === "uploading" || uploadStatus === "checking" || uploadStatus === "success"
              }
            >
              {uploadStatus === "uploading" || uploadStatus === "checking" ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  </span>
                  {uploadStatus === "checking" ? "Verificando..." : "Enviando..."}
                </>
              ) : (
                "Enviar Proposta"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
