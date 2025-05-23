"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { FileUp, Upload, File, X, CheckCircle, AlertCircle, Loader2, Plus, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import PageTransition from "@/components/PageTransition"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { AnimatedElement } from "@/components/AnimatedElement"
import { useUploadQueue } from "@/components/upload-queue/UploadQueueContext"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<{ file: File, tipo: "proposta" | "apolice" | "endosso" | "cancelado" }[]>([]);
  const [hasSent, setHasSent] = useState(false);
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error" | "checking">("idle")
  const [propostaId, setPropostaId] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [driveLink, setDriveLink] = useState<string | null>(null)
  const [temHistoricoAnexos, setTemHistoricoAnexos] = useState(false)
  const [driveId, setDriveId] = useState<string | null>(null)
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
  const statusIconMap: Record<string, React.ReactNode> = {
    aguardando: <span title="Aguardando"><FileUp className="w-4 h-4 text-gray-400" /></span>,
    enviando: <span title="Enviando"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /></span>,
    processando: <span title="Processando"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /></span>,
    concluido: <span title="Concluído"><CheckCircle className="w-4 h-4 text-green-500" /></span>,
    erro: <span title="Erro"><AlertCircle className="w-4 h-4 text-red-500" /></span>,
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

            // Se temos um link do Drive, vamos atualizá-lo no registro
            // E também salvar na tabela documentos_anexos para exibição na aba anexos
            if (driveLink) {
              try {
                // 1. Atualizar no registro principal
                const { error: updateError } = await supabase
                  .from("ocr_processamento")
                  .update({ drive_link: driveLink })
                  .eq("id", propostaId)
                
                if (updateError) {
                  console.error("Erro ao atualizar link do Drive:", updateError)
                } else {
                  console.log("Link do Drive salvo com sucesso no registro principal:", driveLink)
                }
                
                // 2. Salvar na tabela documentos_anexos (como no UploadDocumentos.tsx)
                const tipoMapping: Record<string, string> = {
                  proposta: "Proposta", 
                  apolice: "Apólice", 
                  endosso: "Endosso", 
                  cancelado: "Cancelamento"
                };
                
                const { error: anexoError } = await supabase
                  .from("documentos_anexos")
                  .insert([{
                    documento_id: propostaId,
                    nome_arquivo: selectedFiles[0].file.name,
                    tipo_arquivo: tipoMapping[selectedFiles[0].tipo] || "Proposta",
                    drive_link: driveLink
                  }])
                
                if (anexoError) {
                  console.error("Erro ao salvar no histórico de anexos:", anexoError)
                } else {
                  console.log("Link do Drive salvo com sucesso na tabela de anexos")
                }
              } catch (updateError) {
                console.error("Erro ao atualizar registros:", updateError)
              }
            }

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
  }, [propostaId, uploadStatus, checkCount, toast, router, driveLink, selectedFiles])

  // Persistência da lista de arquivos no localStorage
  useEffect(() => {
    // Restaurar ao carregar
    const saved = localStorage.getItem("upload_selected_files");
    if (saved) {
      try {
        const arr = JSON.parse(saved);
        // Não é possível restaurar File real, mas podemos restaurar o nome e tipo
        setSelectedFiles(
          arr.map((item: any) => {
            if (typeof window !== 'undefined' && typeof window.File !== 'undefined') {
              return { file: new window.File([""], item.fileName || item.file?.name || "arquivo.pdf", { type: "application/pdf" }), tipo: item.tipo };
            } else {
              // SSR fallback: objeto vazio
              return { file: { name: item.fileName || "arquivo.pdf" } as File, tipo: item.tipo };
            }
          })
        );
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Salvar sempre que mudar
    localStorage.setItem(
      "upload_selected_files",
      JSON.stringify(selectedFiles.map(f => ({ fileName: f.file.name, tipo: f.tipo })))
    );
  }, [selectedFiles]);

  // Adiciona arquivos à lista local
  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles: { file: File, tipo: "proposta" | "apolice" | "endosso" | "cancelado" }[] = [];
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
      validFiles.push({ file, tipo: "proposta" });
    }
    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  // Remover arquivo da lista local
  const handleRemoveFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.file.name !== name));
  };

  // Limpar lista local
  const handleClear = () => {
    setSelectedFiles([]);
  };

  // Enviar arquivos para a fila global
  const handleSend = async () => {
    // Só envia arquivos que ainda não estão na fila global
    const nomesNaFila = queue.map(f => f.name);
    const arquivosParaEnviar = selectedFiles.filter(f => !nomesNaFila.includes(f.file.name));
    if (arquivosParaEnviar.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // 1. Adicionar à fila global
      // Agrupar arquivos por tipo para chamada correta do contexto
      const tiposUnicos = Array.from(new Set(arquivosParaEnviar.map(f => f.tipo)));
      tiposUnicos.forEach(tipo => {
        const arquivosDoTipo = arquivosParaEnviar.filter(f => f.tipo === tipo).map(f => f.file);
        addFiles(arquivosDoTipo, tipo);
      });
      
      toast.success({
        title: "Arquivos enviados para processamento",
        description: `${arquivosParaEnviar.length} arquivo(s) enviados para a fila!`,
      });
      
      // 2. Processar OCR e Drive em paralelo
      // Este processo executa em paralelo com a fila global
      await handleUpload();
      
    } catch (error) {
      console.error("Erro ao processar envio:", error);
      toast.error({
        title: "Erro no processamento",
        description: "Ocorreu um erro ao processar os arquivos.",
      });
      setIsUploading(false);
    }
  };
  
  // Função para obter o status do arquivo na fila global
  const getFileStatus = (name: string) => {
    const item = queue.find((f) => f.name === name);
    return item ? item.status : 'aguardando';
  };

  // Função para obter o id do arquivo na fila global
  const getFileId = (name: string) => {
    const item = queue.find((f) => f.name === name);
    return item ? item.id : undefined;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  // Verificar se existem anexos para o documento ao carregar o componente
  const verificarHistoricoAnexos = async (id: string) => {
    try {
      console.log("Verificando histórico de anexos para ID:", id);
      const { data, error } = await supabase
        .from('documentos_anexos')
        .select('*')
        .eq('documento_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Erro ao verificar histórico de anexos:", error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Histórico de anexos encontrado:", data[0]);
        setTemHistoricoAnexos(true);
        
        // Extrair o drive_id do link, se disponível
        if (data[0].drive_link && data[0].drive_link.includes('drive.google.com')) {
          const driveIdMatch = data[0].drive_link.match(/\/folders\/([^/?]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            setDriveId(driveIdMatch[1]);
            console.log("Drive ID extraído do histórico:", driveIdMatch[1]);
          }
        }
      } else {
        console.log("Nenhum histórico de anexos encontrado para este ID");
        setTemHistoricoAnexos(false);
        setDriveId(null);
      }
    } catch (error) {
      console.error("Erro ao verificar histórico de anexos:", error);
    }
  };

  // Função auxiliar para upload ao Google Drive
  const uploadToGoogleDrive = async (file: File, documentoId: string, tipoArquivo: string): Promise<string | null> => {
    try {
      console.log("=================== INÍCIO UPLOAD GOOGLE DRIVE ===================");
      console.log("Arquivo:", file.name, "Tamanho:", file.size, "bytes", "Tipo MIME:", file.type);
      console.log("ID do documento:", documentoId);
      console.log("Tipo de arquivo formatado:", tipoArquivo);
      
      // Determinar qual webhook usar com base na existência de histórico
      const webhookUrl = temHistoricoAnexos && driveId
        ? process.env.NEXT_PUBLIC_WEBHOOK_DOCUMENTOSUPDT_URL
        : process.env.NEXT_PUBLIC_WEBHOOK_DOCUMENTOS_URL;
      
      console.log(`Usando webhook ${temHistoricoAnexos ? 'de atualização' : 'de criação'}:`, webhookUrl);
      
      if (!webhookUrl) {
        console.error("URL do webhook não configurada");
        return null;
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentoId", documentoId);
      formData.append("nomeSegurado", "Proposta_" + documentoId);
      formData.append("tipoArquivo", tipoArquivo);
      
      // Se temos histórico e ID do Drive, incluir no formData
      if (temHistoricoAnexos && driveId) {
        console.log("Incluindo drive_id existente:", driveId);
        formData.append("drive_id", driveId);
      }
      
      console.log("FormData criado com os campos: file, documentoId, nomeSegurado, tipoArquivo", temHistoricoAnexos ? ", drive_id" : "");
      console.log("Iniciando request para o webhook do Drive...");
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });
      
      console.log("Resposta recebida:", response.status, response.statusText);
      console.log("Headers:", [...response.headers.entries()]);
      
      if (!response.ok) {
        console.error("Erro na resposta do webhook do Drive:", response.status);
        const errorText = await response.text();
        console.error("Detalhes do erro:", errorText);
        return null;
      }
      
      console.log("Lendo texto da resposta...");
      const driveLinkText = await response.text();
      console.log("Texto completo da resposta:", driveLinkText);
      
      if (driveLinkText && driveLinkText.includes('drive.google.com')) {
        console.log("Link do Drive identificado com sucesso:", driveLinkText);
        
        // Se é o primeiro upload (não tinha histórico), extrair o drive_id para uso futuro
        if (!temHistoricoAnexos) {
          const driveIdMatch = driveLinkText.match(/\/folders\/([^/?]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            setDriveId(driveIdMatch[1]);
            setTemHistoricoAnexos(true);
            console.log("Drive ID extraído para futuros uploads:", driveIdMatch[1]);
          }
        }
        
        console.log("=================== FIM UPLOAD GOOGLE DRIVE: SUCESSO ===================");
        return driveLinkText;
      }
      
      console.error("Resposta não contém link do Drive válido");
      console.log("=================== FIM UPLOAD GOOGLE DRIVE: FALHA ===================");
      return null;
    } catch (error) {
      console.error("Exceção durante upload para o Drive:", error);
      console.log("=================== FIM UPLOAD GOOGLE DRIVE: ERRO ===================");
      return null;
    }
  };

  // Função para realizar upload direto
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);
    setCheckCount(0);
    setDriveLink(null);

    const formData = new FormData();
    selectedFiles.forEach((f) => {
      formData.append("data", f.file);
    });
    formData.append("tipo_documento", selectedFiles[0].tipo);

    try {
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // 1. Enviar para processamento OCR (fluxo original)
      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_PROPOSTA_URL || "", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // O ID da proposta vem do retorno do webhook
      const id = data.id;
      setPropostaId(id);
      
      // Verificar se já existem anexos para esta proposta
      await verificarHistoricoAnexos(id);

      // 2. Upload para o Google Drive usando a função auxiliar
      // Converter o tipo para o formato correto
      const tipoMapping: Record<string, string> = {
        proposta: "Proposta", 
        apolice: "Apólice", 
        endosso: "Endosso", 
        cancelado: "Cancelamento"
      };
      const tipoFormatado = tipoMapping[selectedFiles[0].tipo] || "Proposta";
      
      console.log("Preparando upload para o Google Drive");
      console.log("Arquivo selecionado:", selectedFiles[0].file.name);
      console.log("Tipo original:", selectedFiles[0].tipo);
      console.log("Tipo formatado:", tipoFormatado);
      
      // Fazer o upload para o Drive e aguardar o link
      console.log("Chamando função uploadToGoogleDrive...");
      const link = await uploadToGoogleDrive(selectedFiles[0].file, id, tipoFormatado);
      
      if (link) {
        console.log("Link do Drive obtido e armazenado no estado:", link);
        setDriveLink(link);
      } else {
        console.error("Não foi possível obter link do Drive - retornou null");
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Mudar para o estado de verificação
      setUploadStatus("checking");

      toast.info({
        title: "Upload concluído",
        description: "O arquivo foi enviado com sucesso. Verificando registro...",
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      setUploadStatus("error");
      toast.error({
        title: "Erro no upload",
        description: `Ocorreu um erro ao enviar o arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([])
    setUploadStatus("idle")
    setUploadProgress(0)
    setPropostaId(null)
    setCheckCount(0)
    setDriveLink(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Renderização da lista de arquivos
  const arquivosParaExibir = hasSent
    ? queue.filter(f => selectedFiles.some(sf => sf.file.name === f.name))
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
                      {/* Drag-and-drop area só aparece se não houver arquivos selecionados */}
                      {selectedFiles.length === 0 && (
                        <motion.div
                          layout
                          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
                            isDragging
                              ? "border-primary bg-primary/5"
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
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}

                      {/* Lista de arquivos anexados, igual à tela de cotação */}
                      {selectedFiles.length > 0 && (
                        <div className="mb-2">
                          <div className="grid grid-cols-[1fr_120px_32px_32px] gap-2 text-xs">
                            {selectedFiles.map((item, idx) => {
                              const status = getFileStatus(item.file.name);
                              const id = getFileId(item.file.name);
                              const tipoLabel: Record<string, string> = {
                                proposta: "Proposta",
                                apolice: "Apólice",
                                endosso: "Endosso",
                                cancelado: "Cancelamento",
                              };
                              const statusIcon = statusIconMap[status];
                              return (
                                <React.Fragment key={item.file.name}>
                                  <span className="flex items-center font-medium overflow-x-auto whitespace-nowrap min-h-[32px] px-1">
                                    {item.file.name}
                                  </span>
                                  <Select
                                    value={item.tipo}
                                    onValueChange={(value) => {
                                      setSelectedFiles((prev) =>
                                        prev.map((f, i) =>
                                          i === idx ? { ...f, tipo: value as "proposta" | "apolice" | "endosso" | "cancelado" } : f
                                        )
                                      );
                                    }}
                                    disabled={status !== 'aguardando'}
                                  >
                                    <SelectTrigger className="w-full h-7 text-xs">
                                      <SelectValue>{tipoLabel[item.tipo]}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="proposta">Proposta</SelectItem>
                                      <SelectItem value="apolice">Apólice</SelectItem>
                                      <SelectItem value="endosso">Endosso</SelectItem>
                                      <SelectItem value="cancelado">Cancelamento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <span className="flex items-center justify-center">{statusIcon}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      if (id && status !== 'aguardando') removeFile(id);
                                      else handleRemoveFile(item.file.name);
                                    }}
                                    title="Remover arquivo"
                                    disabled={status === 'enviando' || status === 'processando'}
                                    className="w-7 h-7"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedFiles.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" onClick={handleClear} disabled={selectedFiles.length === 0}>
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
                          Processando...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Enviar arquivo
                        </>
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