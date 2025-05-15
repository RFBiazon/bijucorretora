"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { FileUp, Upload, File, X, CheckCircle, AlertCircle, Loader2, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import PageTransition from "@/components/PageTransition"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AnimatedElement } from "@/components/AnimatedElement"
import { useUploadQueue } from "@/components/upload-queue/UploadQueueContext"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hasSent, setHasSent] = useState(false);
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error" | "checking">("idle")
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [tipoDocumento, setTipoDocumento] = useState<"proposta" | "apolice" | "endosso">("proposta")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const router = useRouter()
  const { addFiles, queue, removeFile, clearQueue } = useUploadQueue()

  const statusLabel: Record<string, string> = {
    aguardando: 'Aguardando',
    enviando: 'Enviando...',
    processando: 'Processando...',
    concluido: 'Concluído',
    erro: 'Erro',
  };
  const statusColor: Record<string, string> = {
    aguardando: 'text-gray-400',
    enviando: 'text-blue-400',
    processando: 'text-blue-400',
    concluido: 'text-green-500',
    erro: 'text-red-500',
  };
  const statusIcon: Record<string, React.ReactNode> = {
    aguardando: <FileUp className="w-4 h-4 text-gray-400" />,
    enviando: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
    processando: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
    concluido: <CheckCircle className="w-4 h-4 text-green-500" />,
    erro: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

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

            toast.success({
              title: "Proposta registrada",
              description: "A proposta foi registrada com sucesso e está sendo processada.",
            })

            // Redirecionar após um breve delay
            setTimeout(() => {
              router.push("/propostas")
            }, 1500)
          } else if (checkCount >= 24) {
            // 120 segundos (24 verificações de 5 segundos)
            // Timeout após 120 segundos
            clearInterval(intervalId!)
            setUploadStatus("error")

            toast.error({
              title: "Tempo esgotado",
              description: "Não foi possível confirmar o registro da proposta. Verifique na página de propostas.",
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

  // Adiciona arquivos à lista local
  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== "application/pdf") {
        toast.error({
          title: "Tipo de arquivo inválido",
          description: `O arquivo ${file.name} não é um PDF.`,
        });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error({
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} excede 10MB.`,
        });
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  // Remover arquivo da lista local
  const handleRemoveFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  // Limpar lista local
  const handleClear = () => {
    setSelectedFiles([]);
  };

  // Enviar arquivos para a fila global
  const handleSend = () => {
    if (selectedFiles.length === 0) return;
    addFiles(selectedFiles, tipoDocumento);
    setHasSent(true);
    toast.success({
      title: "Arquivos enviados para processamento",
      description: `${selectedFiles.length} arquivo(s) enviados para a fila!`,
    });
  };

  // Sincronizar status dos arquivos enviados com a fila global
  const getFileStatus = (name: string) => {
    const item = queue.find((f) => f.name === name);
    return item ? item.status : 'aguardando';
  };

  const getFileId = (name: string) => {
    const item = queue.find((f) => f.name === name);
    return item ? item.id : undefined;
  };

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
      handleFileChange(e.dataTransfer.files)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadStatus("uploading")
    setUploadProgress(0)
    setCheckCount(0)

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append("data", file)
    })
    formData.append("tipo_documento", tipoDocumento)

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
      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_PROPOSTA_URL || "", {
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

      toast.info({
        title: "Upload concluído",
        description: "O arquivo foi enviado com sucesso. Verificando registro...",
      })
    } catch (error) {
      console.error("Erro no upload:", error)
      setUploadStatus("error")
      toast.error({
        title: "Erro no upload",
        description: `Ocorreu um erro ao enviar o arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      })
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setSelectedFiles([])
    setUploadStatus("idle")
    setUploadProgress(0)
    setPropostaId(null)
    setCheckCount(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Renderização da lista de arquivos
  const arquivosParaExibir = hasSent
    ? queue.filter(f => selectedFiles.some(sf => sf.name === f.name))
    : selectedFiles;

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container mx-auto p-4">
          <AnimatedElement index={1}>
            <div className="flex justify-center">
              <div className="w-full max-w-xl">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Envio de Documento <span role="img" aria-label="documento">📄</span>
                    </CardTitle>
                    <CardDescription>
                      Faça upload do arquivo PDF do documento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="tipo-documento">Tipo de Documento</Label>
                        <Select
                          value={tipoDocumento}
                          onValueChange={(value: "proposta" | "apolice" | "endosso") => setTipoDocumento(value)}
                        >
                          <SelectTrigger id="tipo-documento">
                            <SelectValue placeholder="Selecione o tipo de documento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proposta">Proposta</SelectItem>
                            <SelectItem value="apolice">Apólice</SelectItem>
                            <SelectItem value="endosso">Endosso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <motion.div
                        layout
                        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                          isDragging
                            ? "border-primary bg-primary/5"
                            : selectedFiles.length > 0
                              ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
                              : "border-gray-300 hover:border-primary hover:bg-gray-50 dark:border-gray-700 dark:hover:border-primary dark:hover:bg-gray-800/50"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }}
                      >
                        <div className="flex flex-col items-center justify-center text-center">
                          <AnimatePresence mode="wait">
                            {selectedFiles.length === 0 && (
                              <motion.div
                                key="upload-prompt"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                  duration: 0.4,
                                  ease: [0.4, 0, 0.2, 1]
                                }}
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
                                  multiple
                                  onChange={(e) => handleFileChange(e.target.files)}
                                  className="hidden"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>

                      {selectedFiles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, height: 0 }}
                          animate={{ opacity: 1, scale: 1, height: "auto" }}
                          exit={{ opacity: 0, scale: 0.95, height: 0 }}
                          transition={{
                            duration: 0.4,
                            ease: [0.4, 0, 0.2, 1]
                          }}
                          className="space-y-2"
                        >
                          <div className="flex justify-between text-sm">
                            <span>Progresso do upload</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                            {uploadStatus === "uploading" && "Enviando arquivo..."}
                            {uploadStatus === "checking" && `Verificando registro... (${checkCount}/24)`}
                            {uploadStatus === "success" && "Upload concluído com sucesso!"}
                            {uploadStatus === "error" && "Erro no upload. Tente novamente."}
                          </p>
                        </motion.div>
                      )}

                      {arquivosParaExibir.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {arquivosParaExibir.map((file) => {
                            const name = file.name;
                            const status = hasSent ? getFileStatus(name) : 'aguardando';
                            const id = hasSent ? getFileId(name) : undefined;
                            return (
                              <div key={name} className={`flex items-center justify-between rounded px-2 py-1 text-xs transition group ${
                                status === 'concluido'
                                  ? 'bg-green-950/40'
                                  : status === 'erro'
                                  ? 'bg-red-950/30'
                                  : status === 'enviando' || status === 'processando'
                                  ? 'bg-blue-950/30'
                                  : 'bg-neutral-800'
                              }`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  {statusIcon[status]}
                                  <span className="truncate max-w-[120px]" title={name}>{name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={statusColor[status] + ' font-medium'}>{statusLabel[status]}</span>
                                  <button
                                    onClick={() => {
                                      if (hasSent && id) removeFile(id);
                                      else handleRemoveFile(name);
                                    }}
                                    className="ml-1 text-neutral-500 hover:text-red-400 transition"
                                    title="Remover ou cancelar envio"
                                    disabled={status === 'enviando' || status === 'processando'}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {arquivosParaExibir.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" onClick={handleClear} disabled={arquivosParaExibir.length === 0}>
                            Limpar lista
                          </Button>
                          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Plus className="mr-2 h-4 w-4" /> Adicionar arquivos
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSend} disabled={selectedFiles.length === 0 || isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar arquivos"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </PageTransition>
    </ProtectedRoute>
  )
}