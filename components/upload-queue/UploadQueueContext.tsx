'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export type UploadStatus = 'aguardando' | 'enviando' | 'processando' | 'concluido' | 'erro';

export interface UploadFile {
  id: string;
  name: string;
  file: File;
  status: UploadStatus;
  error?: string;
  _toastShown: boolean;
  tipoDocumento: "proposta" | "apolice" | "endosso";
}

interface UploadQueueContextProps {
  queue: UploadFile[];
  addFiles: (files: File[], tipoDocumento: "proposta" | "apolice" | "endosso") => void;
  removeFile: (id: string) => void;
  updateFileStatus: (id: string, status: UploadStatus, error?: string) => void;
  clearQueue: () => void;
}

const UploadQueueContext = createContext<UploadQueueContextProps | undefined>(undefined);

const UPLOAD_QUEUE_KEY = 'uploadQueue';

const WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_PROPOSTA_URL || "";

async function uploadFileAndNotifyN8n(file: File, updateFileStatus: (id: string, status: UploadStatus, error?: string) => void, fileId: string, tipoDocumento: "proposta" | "apolice" | "endosso"): Promise<void> {
  // 1. Enviar PDF para o webhook do N8n
  const formData = new FormData();
  formData.append("data", file);
  formData.append("tipo_documento", tipoDocumento);

  // Status: enviando
  // (já foi setado antes de chamar esta função)

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const propostaId = data.id;
  if (!propostaId) throw new Error("ID não retornado pelo N8n");
  console.log(`[Fila de Propostas] ID recebido do webhook:`, propostaId);

  // Status: processando
  updateFileStatus(fileId, 'processando');

  // 2. Monitorar a tabela no Supabase
  let tentativas = 0;
  const maxTentativas = 36; // 3 minutos (36 x 5s)
  while (tentativas < maxTentativas) {
    console.count(`[Fila de Propostas] Tentativas para o ID: ${propostaId}`);
    const { data: registros, error } = await supabase
      .from("ocr_processamento")
      .select("id, status")
      .eq("id", propostaId);
    if (error && error.code !== 'PGRST116') {
      throw new Error("Erro ao consultar Supabase: " + error.message);
    }
    if (registros && Array.isArray(registros) && registros.length > 0) {
      console.log(`[Fila de Propostas] Registro encontrado no Supabase para o ID:`, propostaId);
      return; // Encontrou o registro, sucesso!
    }
    await new Promise((res) => setTimeout(res, 5000)); // Espera 5s
    tentativas++;
  }
  console.error(`[Fila de Propostas] Timeout: registro não encontrado no Supabase para o ID:`, propostaId);
  throw new Error("Timeout ao aguardar processamento no Supabase");
}

function useUploadQueueProcessor(queue: UploadFile[], updateFileStatus: (id: string, status: UploadStatus, error?: string) => void) {
  const processingIds = React.useRef(new Set());

  React.useEffect(() => {
    const isProcessing = queue.some(f => f.status === 'enviando' || f.status === 'processando');
    if (isProcessing) return;
    const next = queue.find(f => f.status === 'aguardando');
    if (!next) return;
    if (processingIds.current.has(next.id)) return;
    processingIds.current.add(next.id);
    updateFileStatus(next.id, 'enviando');
    (async () => {
      try {
        await uploadFileAndNotifyN8n(next.file, updateFileStatus, next.id, next.tipoDocumento);
        updateFileStatus(next.id, 'concluido');
      } catch (err: any) {
        updateFileStatus(next.id, 'erro', err?.message || 'Erro desconhecido');
      } finally {
        processingIds.current.delete(next.id);
      }
    })();
  }, [queue, updateFileStatus]);
}

export const UploadQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<UploadFile[]>([]);
  const toast = useToast();

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    const stored = localStorage.getItem(UPLOAD_QUEUE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueue(parsed.map((item: any) => ({ ...item, file: undefined, _toastShown: false })));
      } catch {}
    }
  }, []);

  // Salvar no localStorage sempre que a fila mudar
  useEffect(() => {
    localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue.map(({ file, ...rest }) => rest)));
  }, [queue]);

  // Toast de sucesso ao concluir uma proposta
  React.useEffect(() => {
    const lastConcluida = queue.find(f => f.status === 'concluido' && !f._toastShown);
    if (lastConcluida) {
      toast.success({
        title: 'Proposta concluída',
        description: `O arquivo "${lastConcluida.name}" foi processado com sucesso!`,
      });
      // Marca que o toast já foi mostrado para esse arquivo
      setQueue(prev => prev.map(f => f.id === lastConcluida.id ? { ...f, _toastShown: true } : f));
    }
  }, [queue, toast]);

  const addFiles = useCallback((files: File[], tipoDocumento: "proposta" | "apolice" | "endosso") => {
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        file,
        status: 'aguardando' as UploadStatus,
        _toastShown: false,
        tipoDocumento,
      })),
    ]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFileStatus = useCallback((id: string, status: UploadStatus, error?: string) => {
    setQueue((prev) => prev.map((f) => f.id === id ? { ...f, status, error } : f));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  useUploadQueueProcessor(queue, updateFileStatus);

  return (
    <UploadQueueContext.Provider value={{ queue, addFiles, removeFile, updateFileStatus, clearQueue }}>
      {children}
    </UploadQueueContext.Provider>
  );
};

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider');
  return ctx;
} 