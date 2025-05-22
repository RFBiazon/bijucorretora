"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface HistoricoDocumentosProps {
  documentoId: string;
}

interface DocumentoHistorico {
  id: string;
  documento_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  drive_link: string;
  created_at: string;
}

export function HistoricoDocumentos({ documentoId }: HistoricoDocumentosProps) {
  const [documentosHistorico, setDocumentosHistorico] = useState<DocumentoHistorico[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);

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
      }
    } catch (error) {
      console.error("Erro ao carregar histórico de documentos:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setIsLoadingHistorico(false);
    }
  };

  if (isLoadingHistorico) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Histórico de Documentos
          </CardTitle>
          <CardDescription>
            Documentos enviados anteriormente para este seguro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando histórico de documentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documentosHistorico.length === 0) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Histórico de Documentos
          </CardTitle>
          <CardDescription>
            Documentos enviados anteriormente para este seguro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum documento foi enviado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Histórico de Documentos
        </CardTitle>
        <CardDescription>
          Documentos enviados anteriormente para este seguro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
          {documentosHistorico.map(documento => (
            <div 
              key={documento.id} 
              className="flex items-center gap-3 p-3 bg-muted rounded-md group hover:bg-muted/80 transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{documento.tipo_arquivo}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {documento.nome_arquivo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(documento.created_at).toLocaleDateString()} • {new Date(documento.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <a 
                href={documento.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 transition-opacity"
                title="Abrir no Google Drive"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Total: {documentosHistorico.length} documento{documentosHistorico.length !== 1 ? 's' : ''}
        </p>
      </CardFooter>
    </Card>
  );
} 