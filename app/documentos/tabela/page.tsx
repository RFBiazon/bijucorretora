"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizarProposta } from "@/lib/utils/normalize";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const COLS = [
  { key: "tipo_documento", label: "Tipo" },
  { key: "numero", label: "Número" },
  { key: "segurado", label: "Segurado" },
  { key: "cpf", label: "CPF" },
  { key: "placa", label: "Placa" },
  { key: "veiculo", label: "Veículo" },
  { key: "cia_seguradora", label: "Seguradora" },
  { key: "vigencia_fim", label: "Vigência Final" },
];

export default function TabelaDocumentosPage() {
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo_documento: "",
    numero: "",
    segurado: "",
    cpf: "",
    placa: "",
    veiculo: "",
    cia_seguradora: "",
    vigencia_fim: "",
  });
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: "", asc: true });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [showAllRows, setShowAllRows] = useState(false);

  useEffect(() => {
    async function fetchDocumentos() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(100);
      if (!error && data) {
        setDocumentos(data.map((d: any) => normalizarProposta(d)));
      }
      setIsLoading(false);
    }
    fetchDocumentos();
  }, []);

  // Função para converter dd/mm/aaaa ou outros formatos em Date
  function parseDataVigenciaToDate(data: string | undefined): Date | null {
    if (!data) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      return new Date(`${ano}-${mes}-${dia}T00:00:00`);
    }
    const d = new Date(data);
    return isNaN(d.getTime()) ? null : d;
  }

  function parseDataVigencia(data: string | undefined): string {
    if (!data) return "-";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(data);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // Exibe nome formatado da seguradora conforme regras
  function formatarNomeSeguradora(nome: string): string {
    if (!nome) return "";
    const lower = nome.toLowerCase();
    if (lower.includes("tokio marine")) {
      return "Tokio Marine";
    }
    if (lower.includes("hdi")) {
      return "HDI";
    }
    const primeira = nome.split(" ")[0];
    return primeira.charAt(0).toUpperCase() + primeira.slice(1).toLowerCase();
  }

  // Filtro e ordenação
  const filtered = documentos.filter((doc) => {
    return (
      (!filters.tipo_documento || doc.tipo_documento.toLowerCase().includes(filters.tipo_documento.toLowerCase())) &&
      (!filters.numero || (doc.tipo_documento === "apolice"
        ? (doc.proposta.apolice || doc.proposta.numero || doc.id.substring(0, 8)).toLowerCase().includes(filters.numero.toLowerCase())
        : doc.tipo_documento === "endosso"
          ? (doc.proposta.endosso || doc.proposta.numero || doc.id.substring(0, 8)).toLowerCase().includes(filters.numero.toLowerCase())
          : (doc.proposta.numero || doc.id.substring(0, 8)).toLowerCase().includes(filters.numero.toLowerCase())
      )) &&
      (!filters.segurado || doc.segurado.nome.toLowerCase().includes(filters.segurado.toLowerCase())) &&
      (!filters.cpf || doc.segurado.cpf.toLowerCase().includes(filters.cpf.toLowerCase())) &&
      (!filters.placa || doc.veiculo.placa.toLowerCase().includes(filters.placa.toLowerCase())) &&
      (!filters.veiculo || doc.veiculo.marca_modelo.toLowerCase().includes(filters.veiculo.toLowerCase())) &&
      (!filters.cia_seguradora || doc.proposta.cia_seguradora.toLowerCase().includes(filters.cia_seguradora.toLowerCase())) &&
      (!filters.vigencia_fim || parseDataVigencia(doc.proposta.vigencia_fim).includes(filters.vigencia_fim))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const { key, asc } = sort;
    if (!key) return 0;
    let aValue = "";
    let bValue = "";
    if (key === "tipo_documento") {
      aValue = a.tipo_documento;
      bValue = b.tipo_documento;
    } else if (key === "numero") {
      aValue = a.tipo_documento === "apolice" ? (a.proposta.apolice || a.proposta.numero || a.id) : a.tipo_documento === "endosso" ? (a.proposta.endosso || a.proposta.numero || a.id) : (a.proposta.numero || a.id);
      bValue = b.tipo_documento === "apolice" ? (b.proposta.apolice || b.proposta.numero || b.id) : b.tipo_documento === "endosso" ? (b.proposta.endosso || b.proposta.numero || b.id) : (b.proposta.numero || b.id);
    } else if (key === "segurado") {
      aValue = a.segurado.nome;
      bValue = b.segurado.nome;
    } else if (key === "cpf") {
      aValue = a.segurado.cpf;
      bValue = b.segurado.cpf;
    } else if (key === "placa") {
      aValue = a.veiculo.placa;
      bValue = b.veiculo.placa;
    } else if (key === "veiculo") {
      aValue = a.veiculo.marca_modelo;
      bValue = b.veiculo.marca_modelo;
    } else if (key === "cia_seguradora") {
      aValue = a.proposta.cia_seguradora;
      bValue = b.proposta.cia_seguradora;
    } else if (key === "vigencia_fim") {
      const dateA = parseDataVigenciaToDate(a.proposta.vigencia_fim);
      const dateB = parseDataVigenciaToDate(b.proposta.vigencia_fim);
      if (!dateA && !dateB) return 0;
      if (!dateA) return asc ? 1 : -1;
      if (!dateB) return asc ? -1 : 1;
      return asc ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    return asc ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
  });

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginatedRows = showAllRows ? sorted : sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function handleSort(key: string) {
    setSort((prev) => ({ key, asc: prev.key === key ? !prev.asc : true }));
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) return;
    setDeletingId(id);
    await supabase.from("ocr_processamento").delete().eq("id", id);
    setDocumentos((prev) => prev.filter((doc) => doc.id !== id));
    setDeletingId(null);
  }

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold mb-6">Tabela de Documentos</h1>
            <div className="mb-4 flex justify-end">
              <button
                className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm border border-neutral-700 transition-colors"
                onClick={() => setShowAllRows((v) => !v)}
              >
                {showAllRows ? "Mostrar paginado" : `Expandir tudo (${sorted.length})`}
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="overflow-x-auto rounded-lg border border-gray-800"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900">
                <tr>
                  {COLS.map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left cursor-pointer select-none" onClick={() => handleSort(col.key)}>
                      {col.label}
                      {sort.key === col.key ? (sort.asc ? " ▲" : " ▼") : ""}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left">Ações</th>
                </tr>
                <tr>
                  {/* Filtros */}
                  <td className="px-2 py-1">
                    <select
                      className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs"
                      value={filters.tipo_documento}
                      onChange={e => setFilters(f => ({ ...f, tipo_documento: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      <option value="proposta">Proposta</option>
                      <option value="apolice">Apólice</option>
                      <option value="endosso">Endosso</option>
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.numero} onChange={e => setFilters(f => ({ ...f, numero: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.segurado} onChange={e => setFilters(f => ({ ...f, segurado: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.cpf} onChange={e => setFilters(f => ({ ...f, cpf: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.placa} onChange={e => setFilters(f => ({ ...f, placa: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.veiculo} onChange={e => setFilters(f => ({ ...f, veiculo: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.cia_seguradora} onChange={e => setFilters(f => ({ ...f, cia_seguradora: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td className="px-2 py-1">
                    <input className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full" value={filters.vigencia_fim} onChange={e => setFilters(f => ({ ...f, vigencia_fim: e.target.value }))} placeholder="Buscar..." />
                  </td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Carregando...</span>
                        </div>
                      </td>
                    </motion.tr>
                  ) : sorted.length === 0 ? (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td colSpan={9} className="text-center py-8">Nenhum documento encontrado.</td>
                    </motion.tr>
                  ) : (
                    paginatedRows.map((doc, index) => (
                      <motion.tr
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-t border-gray-800 hover:bg-neutral-800 transition"
                      >
                        {COLS.map((col) => (
                          <td key={col.key} className="px-4 py-2">
                            {col.key === "tipo_documento"
                              ? doc.tipo_documento.charAt(0).toUpperCase() + doc.tipo_documento.slice(1)
                              : col.key === "numero"
                                ? (doc.tipo_documento === "apolice"
                                    ? doc.proposta.apolice || doc.proposta.numero || doc.id.substring(0, 8)
                                    : doc.tipo_documento === "endosso"
                                      ? doc.proposta.endosso || doc.proposta.numero || doc.id.substring(0, 8)
                                      : doc.proposta.numero || doc.id.substring(0, 8))
                                : col.key === "segurado"
                                  ? doc.segurado.nome
                                  : col.key === "cpf"
                                    ? doc.segurado.cpf
                                    : col.key === "placa"
                                      ? doc.veiculo.placa
                                      : col.key === "veiculo"
                                        ? doc.veiculo.marca_modelo
                                        : col.key === "cia_seguradora"
                                          ? formatarNomeSeguradora(doc.proposta.cia_seguradora)
                                          : col.key === "vigencia_fim"
                                            ? parseDataVigencia(doc.proposta.vigencia_fim)
                                            : ""
                            }
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <Link href={`/documentos/${doc.id}`}>
                              <Button size="sm" variant="outline">Ver</Button>
                            </Link>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
            {/* Paginação */}
            {!showAllRows && totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        setCurrentPage(p => Math.max(1, p - 1));
                      }}
                      aria-disabled={currentPage === 1}
                      tabIndex={currentPage === 1 ? -1 : 0}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i + 1}
                        onClick={e => {
                          e.preventDefault();
                          setCurrentPage(i + 1);
                        }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                      }}
                      aria-disabled={currentPage === totalPages}
                      tabIndex={currentPage === totalPages ? -1 : 0}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </motion.div>
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
} 