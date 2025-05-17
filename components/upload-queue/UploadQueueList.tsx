import React, { useRef, useState } from 'react';
import { useUploadQueue } from './UploadQueueContext';
import { CheckCircle, Loader2, X, FileUp, AlertCircle, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useRouter, usePathname } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

const statusLabel: Record<string, string> = {
  aguardando: 'Aguardando',
  enviando: 'Enviando...',
  processando: 'Processando...',
  concluido: 'Concluído',
  erro: 'Erro',
};

const tipoDocumentoLabel: Record<string, string> = {
  proposta: 'Proposta',
  apolice: 'Apólice',
  endosso: 'Endosso',
  cancelado: 'Cancelamento',
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

export default function UploadQueueList() {
  const { queue, removeFile, clearQueue, addFiles } = useUploadQueue();
  const [minimized, setMinimized] = useState(false);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Detecta quando uma proposta é concluída e faz refresh na página de propostas
  React.useEffect(() => {
    if (pathname === "/documentos") {
      const concluido = queue.find(f => f.status === "concluido");
      if (concluido) {
        router.refresh();
      }
    }
  }, [queue, pathname, router]);

  if (queue.length === 0) return null;

  // Ajuste para ficar acima do footer (footer ~58px + margem)
  const bottomOffset = 58;

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files), "proposta");
      e.target.value = '';
    }
  };

  // Animação de limpar fila
  const handleClearQueueAnimated = () => {
    if (queue.length === 0) return;
    let delay = 0;
    queue.forEach((file, idx) => {
      setTimeout(() => {
        setRemovingIds((prev) => [...prev, file.id]);
      }, delay);
      delay += 120; // 120ms entre cada item
    });
    setTimeout(() => {
      clearQueue();
      setRemovingIds([]);
    }, delay + 300); // Espera todos sumirem
  };

  return (
    <div
      style={{ position: 'fixed', right: 16, bottom: bottomOffset, zIndex: 50, minWidth: 320, maxWidth: 380 }}
      className="bg-neutral-900/90 rounded-lg shadow-lg border border-neutral-800 transition-all"
    >
      <div className="flex items-center justify-between px-3 pt-2 pb-1 select-none">
        <span className="font-semibold text-sm text-neutral-200">Upload de Documentos</span>
        <div className="flex items-center gap-1">
          <button
            title="Adicionar arquivos"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded hover:bg-neutral-800 transition"
          >
            <Plus className="w-4 h-4 text-neutral-400" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleAddFiles}
            className="hidden"
          />
          <button
            title="Limpar fila"
            onClick={handleClearQueueAnimated}
            className="p-1 rounded hover:bg-neutral-800 transition"
            disabled={queue.length === 0}
          >
            <Trash2 className="w-4 h-4 text-neutral-400" />
          </button>
          <button
            title={minimized ? 'Expandir' : 'Minimizar'}
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded hover:bg-neutral-800 transition"
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {!minimized && (
        <ul className="space-y-1 max-h-60 overflow-y-auto px-3 pb-3">
          <AnimatePresence>
            {queue.map((file, idx) =>
              !removingIds.includes(file.id) && (
                <motion.li
                  key={file.id}
                  initial={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 120 }}
                  transition={{ duration: 0.28, delay: idx * 0.12 }}
                  className={`flex items-center justify-between gap-2 text-xs rounded px-2 py-1 transition group ${
                    file.status === 'concluido'
                      ? 'bg-green-950/40'
                      : file.status === 'erro'
                      ? 'bg-red-950/30'
                      : file.status === 'enviando'
                      ? 'bg-blue-950/30'
                      : 'bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon[file.status]}
                    <div className="flex flex-col">
                      <span className="truncate max-w-[120px]" title={file.name}>{file.name}</span>
                      <span className="text-[10px] text-neutral-500">{tipoDocumentoLabel[file.tipoDocumento]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={statusColor[file.status] + ' font-medium'}>{statusLabel[file.status]}</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="ml-1 text-neutral-500 hover:text-red-400 transition"
                      title="Remover ou cancelar envio"
                      disabled={file.status === 'enviando' || file.status === 'processando'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.li>
              )
            )}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}