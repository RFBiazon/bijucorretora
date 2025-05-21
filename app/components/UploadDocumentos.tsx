"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ExternalLink, Loader2, CheckCircle, AlertCircle, Trash2, FileText, File } from "lucide-react";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

interface UploadDocumentosProps {
  documentoId: string;
  nomeSegurado: string;
}

type DocumentoTipo = 
  | "Apólice" 
  | "Cartão da Assistência 24Hs" 
  | "Carta Verde" 
  | "Boletos" 
  | "CRLV-E" 
  | "Nota Fiscal" 
  | "Documentos Pessoais";

interface SelectedFile {
  file: File;
  tipo: DocumentoTipo | "";
}

interface DocumentoHistorico {
  id: string;
  documento_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  drive_link: string;
  created_at: string;
}

export function UploadDocumentos({ documentoId, nomeSegurado }: UploadDocumentosProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [documentosHistorico, setDocumentosHistorico] = useState<DocumentoHistorico[]>([]);
  const [temHistorico, setTemHistorico] = useState(false);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar histórico de documentos do Supabase
  useEffect(() => {
    carregarHistorico();
  }, [documentoId]);

  const carregarHistorico = async () => {
    if (!documentoId) return;
    
    setIsLoadingHistorico(true);
    try {
      // Verificar se o cliente Supabase está inicializado corretamente
      if (!supabase) {
        console.error("Cliente Supabase não está inicializado");
        toast.error("Erro ao conectar com o banco de dados");
        return;
      }

      // Verificar se o documentoId é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(documentoId)) {
        console.error("O ID do documento não é um UUID válido:", documentoId);
        toast.error("ID do documento inválido");
        return;
      }

      console.log("Buscando documentos para o ID:", documentoId);
      
      const { data, error } = await supabase
        .from('documentos_anexos')
        .select('*')
        .eq('documento_id', documentoId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro Supabase:", error.code, error.message, error.details);
        toast.error("Erro ao carregar histórico de documentos");
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Dados recuperados do Supabase:", data);
        setDocumentosHistorico(data);
        setTemHistorico(true);
        
        // Pegar o último link do Drive
        if (data[0].drive_link) {
          setDriveLink(data[0].drive_link);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar histórico de documentos:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles: SelectedFile[] = Array.from(e.dataTransfer.files).map(file => ({
        file,
        tipo: ""
      }));
      
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: SelectedFile[] = Array.from(e.target.files).map(file => ({
        file,
        tipo: ""
      }));
      
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileTypeChange = (index: number, value: string) => {
    setSelectedFiles(prev => 
      prev.map((file, i) => 
        i === index ? { ...file, tipo: value as DocumentoTipo } : file
      )
    );
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const salvarNoSupabase = async (arquivoInfo: { 
    documentoId: string, 
    nomeArquivo: string, 
    tipoArquivo: string, 
    driveLink: string 
  }) => {
    try {
      // Verificar se o cliente Supabase está inicializado corretamente
      if (!supabase) {
        throw new Error("Cliente Supabase não está inicializado");
      }
      
      // Verificar se o documentoId é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(arquivoInfo.documentoId)) {
        throw new Error("O ID do documento não é um UUID válido");
      }
      
      console.log("Salvando no Supabase com snake_case:", {
        documento_id: arquivoInfo.documentoId,
        nome_arquivo: arquivoInfo.nomeArquivo,
        tipo_arquivo: arquivoInfo.tipoArquivo,
        drive_link: arquivoInfo.driveLink
      });
      
      const { error } = await supabase
        .from('documentos_anexos')
        .insert([{
          documento_id: arquivoInfo.documentoId,
          nome_arquivo: arquivoInfo.nomeArquivo,
          tipo_arquivo: arquivoInfo.tipoArquivo,
          drive_link: arquivoInfo.driveLink
        }]);
      
      if (error) {
        console.error("Erro ao inserir no Supabase:", error.code, error.message, error.details);
        throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
      }
      
      // Recarregar o histórico
      await carregarHistorico();
    } catch (error) {
      console.error("Erro ao salvar no Supabase:", error);
      throw error;
    }
  };

  const handleUpload = async () => {
    // Verificar se há arquivos selecionados e se todos têm um tipo definido
    if (selectedFiles.length === 0) {
      toast.error("Nenhum arquivo selecionado");
      return;
    }

    const filesSemTipo = selectedFiles.filter(file => !file.tipo);
    if (filesSemTipo.length > 0) {
      toast.error("Todos os arquivos precisam ter um tipo selecionado");
      return;
    }

    setIsUploading(true);
    setStatus('uploading');
    
    try {
      // Variável para armazenar o link do Drive obtido na operação atual
      let lastDriveLink = null;
      let usarWebhookAtualizacao = temHistorico;
      let driveId = null;
      
      // Se já existe histórico, extrair o drive_id do último registro
      if (temHistorico && documentosHistorico.length > 0 && documentosHistorico[0].drive_link) {
        const driveLinkAtual = documentosHistorico[0].drive_link;
        const driveIdMatch = driveLinkAtual.match(/\/folders\/([^/?]+)/);
        
        if (driveIdMatch && driveIdMatch[1]) {
          driveId = driveIdMatch[1];
        }
      }
      
      for (const selectedFile of selectedFiles) {
        const file = selectedFile.file;
        const tipoArquivo = selectedFile.tipo;
        
        // Escolher o webhook adequado com base na condição atual
        const webhookUrl = usarWebhookAtualizacao 
          ? process.env.NEXT_PUBLIC_WEBHOOK_DOCUMENTOSUPDT_URL 
          : process.env.NEXT_PUBLIC_WEBHOOK_DOCUMENTOS_URL;
        
        console.log(`Usando webhook ${usarWebhookAtualizacao ? 'de atualização' : 'de criação'} para o arquivo ${file.name}`);
        
        if (!webhookUrl) {
          throw new Error("URL do webhook não configurada");
        }
        
        // Preparar FormData para o upload do arquivo
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentoId', documentoId);
        formData.append('nomeSegurado', nomeSegurado);
        formData.append('nomeArquivo', file.name);
        formData.append('tipoArquivo', tipoArquivo);
        
        // Se estamos usando o webhook de atualização e temos um driveId, enviá-lo
        if (usarWebhookAtualizacao && driveId) {
          console.log('Enviando drive_id:', driveId);
          formData.append('drive_id', driveId);
        }
        
        // Enviar para o webhook
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Erro ao enviar arquivo: ${response.statusText}`);
        }
        
        // Obter a resposta como texto puro (o link do Drive)
        const driveLink = await response.text();
        
        // Verificar se o webhook retornou o link do Google Drive
        if (driveLink && driveLink.includes('drive.google.com')) {
          // Salvar informações no Supabase
          await salvarNoSupabase({
            documentoId,
            nomeArquivo: file.name,
            tipoArquivo: tipoArquivo as string,
            driveLink
          });
          
          // Após o primeiro arquivo ser enviado com sucesso, usar o webhook de atualização para os próximos
          if (!usarWebhookAtualizacao) {
            usarWebhookAtualizacao = true;
            
            // Extrair o drive_id do link recém-obtido
            const driveIdMatch = driveLink.match(/\/folders\/([^/?]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              driveId = driveIdMatch[1];
              console.log('Extraído novo drive_id para próximos arquivos:', driveId);
            }
          }
          
          setDriveLink(driveLink);
          lastDriveLink = driveLink;
        } else {
          throw new Error("Link do Google Drive não retornado pelo servidor");
        }
      }
      
      setStatus('success');
      toast.success("Arquivos enviados com sucesso!");
      setSelectedFiles([]);
      
      // Atualizar o estado de histórico após enviar todos os arquivos com sucesso
      if (!temHistorico && lastDriveLink) {
        setTemHistorico(true);
      }
      
    } catch (error) {
      console.error("Erro no upload:", error);
      setStatus('error');
      toast.error("Erro ao enviar arquivo", { 
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Documentos Adicionais
        </CardTitle>
        <CardDescription>
          Arraste e solte ou clique para adicionar arquivos relacionados a este documento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-700 hover:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            disabled={isUploading}
            multiple
          />
          
          {status === 'uploading' ? (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">Enviando arquivos...</p>
            </div>
          ) : status === 'success' ? (
            <div className="flex flex-col items-center py-4">
              <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
              <p className="text-center font-medium mb-2">Arquivos enviados com sucesso!</p>
              <p className="text-center text-muted-foreground text-sm">O histórico de documentos está disponível abaixo</p>
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center py-4">
              <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
              <p className="text-center font-medium mb-2">Erro ao enviar arquivos</p>
              <p className="text-center text-muted-foreground text-sm">Por favor, tente novamente ou entre em contato com o suporte</p>
            </div>
          ) : (
            <>
              <Upload className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-center font-medium mb-2">Clique ou arraste arquivos aqui</p>
              <p className="text-center text-muted-foreground text-sm">
                Suporta arquivos PDF, JPEG, PNG
              </p>
            </>
          )}
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <Label className="mb-2 block">Arquivos selecionados</Label>
            <div className="space-y-3">
              {selectedFiles.map((selectedFile, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Select
                    value={selectedFile.tipo}
                    onValueChange={(value) => handleFileTypeChange(index, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apólice">Apólice</SelectItem>
                      <SelectItem value="Cartão da Assistência 24Hs">Cartão da Assistência 24Hs</SelectItem>
                      <SelectItem value="Carta Verde">Carta Verde</SelectItem>
                      <SelectItem value="Boletos">Boletos</SelectItem>
                      <SelectItem value="CRLV-E">CRLV-E</SelectItem>
                      <SelectItem value="Nota Fiscal">Nota Fiscal</SelectItem>
                      <SelectItem value="Documentos Pessoais">Documentos Pessoais</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              className="w-full mt-4" 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar Arquivos
                </>
              )}
            </Button>
          </div>
        )}

        {driveLink && (
          <div className="mt-6">
            <Label className="mb-2 block">Link de acesso compartilhado</Label>
            <div className="flex gap-2">
              <Input 
                value={driveLink} 
                readOnly 
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => window.open(driveLink, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {isLoadingHistorico ? (
          <div className="mt-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando histórico...</p>
          </div>
        ) : documentosHistorico.length > 0 ? (
          <div className="mt-6">
            <Label className="mb-2 block">Histórico de documentos</Label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {documentosHistorico.map(documento => (
                <div key={documento.id} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{documento.tipo_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {documento.nome_arquivo} • {new Date(documento.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => window.open(documento.drive_link, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Os arquivos serão armazenados no Google Drive e compartilhados automaticamente
        </p>
      </CardFooter>
    </Card>
  );
} 