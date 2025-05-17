"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizarProposta } from "@/lib/utils/normalize";
import { Button } from "@/components/ui/button";
import { Trash2, Eye } from "lucide-react";
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DayPickerRangeProps, DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { useDayPicker } from 'react-day-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const COLS = [
  { key: "tipo_documento", label: "Documento" },
  { key: "numero", label: "Número" },
  { key: "segurado", label: "Segurado" },
  { key: "cpf", label: "CPF/CNPJ" },
  { key: "placa", label: "Placa" },
  { key: "veiculo", label: "Veículo" },
  { key: "cia_seguradora", label: "Seguradora" },
  { key: "vigencia_fim", label: "Vigência" },
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function CustomCaption({ displayMonth, calendarMonth, setCalendarMonth }: any) {
  const [mode, setMode] = useState<'normal' | 'selectYear' | 'selectMonth'>('normal');
  const year = displayMonth.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => year - 5 + i);

  return (
    <AnimatePresence initial={false}>
      {mode === 'selectYear' && (
        <motion.div
          key="years"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col items-center justify-center w-full"
        >
          <div className="grid grid-cols-3 gap-2 mt-2">
            {years.map((y) => (
              <button
                key={y}
                className={`text-xs px-3 py-2 rounded bg-neutral-800 hover:bg-primary hover:text-primary-foreground transition-colors ${y === year ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setMode('selectMonth');
                  setCalendarMonth(new Date(y, displayMonth.getMonth()));
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <button className="mt-3 text-xs text-blue-400 hover:underline" onClick={() => setMode('normal')}>Cancelar</button>
        </motion.div>
      )}
      {mode === 'selectMonth' && (
        <motion.div
          key="months"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col items-center justify-center w-full"
        >
          <div className="grid grid-cols-3 gap-2 mt-2">
            {MONTHS.map((m, idx) => (
              <button
                key={m}
                className={`text-xs px-3 py-2 rounded bg-neutral-800 hover:bg-primary hover:text-primary-foreground transition-colors ${idx === displayMonth.getMonth() ? 'ring-2 ring-primary' : ''}`}
                onClick={() => {
                  setMode('normal');
                  setCalendarMonth(new Date(year, idx));
                }}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
          <button className="mt-3 text-xs text-blue-400 hover:underline" onClick={() => setMode('normal')}>Cancelar</button>
        </motion.div>
      )}
      {mode === 'normal' && (
        <motion.div
          key="normal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-center gap-2 w-full"
        >
          <button
            className="text-xs font-semibold hover:underline"
            onClick={() => setMode('selectYear')}
          >
            {year}
          </button>
          <span>/</span>
          <button
            className="text-xs font-semibold hover:underline"
            onClick={() => setMode('selectMonth')}
          >
            {MONTHS[displayMonth.getMonth()]}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
    vigencia_inicio: "",
    vigencia_fim_range: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: "", asc: true });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [showAllRows, setShowAllRows] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [vigenciaRange, setVigenciaRange] = useState<DateRange | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Nova função para buscar documentos com filtro
  async function fetchDocumentos(filtros: Partial<typeof filters> = {}) {
    setIsLoading(true);
    let query = supabase.from("ocr_processamento").select("*").order("criado_em", { ascending: false });
    // Desestruturar com valor padrão vazio
    const {
      tipo_documento: filtro_tipo_documento = "",
      numero: filtro_numero = "",
      segurado: filtro_segurado = "",
      cpf: filtro_cpf = "",
      placa: filtro_placa = "",
      veiculo: filtro_veiculo = "",
      cia_seguradora: filtro_cia_seguradora = ""
    } = filtros;
    if (filtro_tipo_documento) query = query.ilike("tipo_documento", `%${filtro_tipo_documento}%`);
    if (filtro_numero) query = query.or(`apolice.ilike.%${filtro_numero}%,numero.ilike.%${filtro_numero}%,endosso.ilike.%${filtro_numero}%`);
    if (filtro_segurado) query = query.ilike("segurado->>nome", `%${filtro_segurado}%`);
    if (filtro_cpf) query = query.ilike("segurado->>cpf", `%${filtro_cpf}%`);
    if (filtro_placa) query = query.ilike("veiculo->>placa", `%${filtro_placa}%`);
    if (filtro_veiculo) query = query.ilike("veiculo->>marca_modelo", `%${filtro_veiculo}%`);
    if (filtro_cia_seguradora) query = query.ilike("proposta->>cia_seguradora", `%${filtro_cia_seguradora}%`);
    // Se não houver busca, limitar para não sobrecarregar
    if (!filtro_tipo_documento && !filtro_numero && !filtro_segurado && !filtro_cpf && !filtro_placa && !filtro_veiculo && !filtro_cia_seguradora) {
      query = query.limit(100);
    }
    const { data, error } = await query;
    if (!error && data) {
      setDocumentos(data.map((d: any) => normalizarProposta(d)));
    }
    setIsLoading(false);
  }

  // Atualizar busca ao digitar
  useEffect(() => {
    fetchDocumentos(filters);
  }, [filters]);

  // Função para converter dd/mm/aaaa ou outros formatos em Date
  function parseDataVigenciaToDate(data: string | undefined): Date | null {
    if (!data || data === 'Não informado' || data.trim() === '') return null;
    // dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      return new Date(`${ano}-${mes}-${dia}T00:00:00`);
    }
    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return new Date(`${data}T00:00:00`);
    }
    // ISO ou outros formatos aceitos pelo Date
    const d = new Date(data);
    if (isNaN(d.getTime())) return null;
    return d;
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
    const vigenciaFim = parseDataVigenciaToDate(doc.proposta.vigencia_fim);
    const [filterInicio, filterFim] = filters.vigencia_fim_range.split(" - ").map(d => parseDataVigenciaToDate(d));
    // Zere o horário para comparar apenas datas
    const vigenciaFimDay = vigenciaFim ? new Date(vigenciaFim.setHours(0,0,0,0)) : null;
    const filterInicioDay = filterInicio ? new Date(filterInicio.setHours(0,0,0,0)) : null;
    const filterFimDay = filterFim ? new Date(filterFim.setHours(0,0,0,0)) : null;

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
      (!filters.vigencia_fim || parseDataVigencia(doc.proposta.vigencia_fim).includes(filters.vigencia_fim)) &&
      (
        !filters.vigencia_fim_range ||
        (vigenciaFimDay && filterInicioDay && filterFimDay && vigenciaFimDay >= filterInicioDay && vigenciaFimDay <= filterFimDay)
      )
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

  // Atualize o filtro de vigência ao selecionar intervalo
  useEffect(() => {
    const from = vigenciaRange?.from;
    const to = vigenciaRange?.to;
    if (from instanceof Date && to instanceof Date) {
      setFilters(f => ({
        ...f,
        vigencia_fim_range: `${format(from, 'yyyy-MM-dd')} - ${format(to, 'yyyy-MM-dd')}`
      }));
    }
  }, [vigenciaRange]);

  // Log para debug (remova depois de testar)
  documentos.forEach(doc => {
    if (doc?.proposta?.vigencia_fim) {
      const parsed = parseDataVigenciaToDate(doc.proposta.vigencia_fim);
      console.log('vigencia_fim:', doc.proposta.vigencia_fim, '->', parsed);
    }
  });

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
            <div className="mb-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm border border-blue-700 text-white transition-colors"
                onClick={() => {
                  setFilters({
                    tipo_documento: "",
                    numero: "",
                    segurado: "",
                    cpf: "",
                    placa: "",
                    veiculo: "",
                    cia_seguradora: "",
                    vigencia_fim: "",
                    vigencia_inicio: "",
                    vigencia_fim_range: "",
                  });
                  setVigenciaRange(undefined);
                }}
              >
                Limpar Filtros
              </button>
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
            <TooltipProvider>
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-900">
                  <tr>
                    {COLS.map((col) => (
                      <th key={col.key} className="px-4 py-2 text-left select-none relative group">
                        <Popover open={openFilter === col.key} onOpenChange={open => setOpenFilter(open ? col.key : null)}>
                          <PopoverTrigger asChild>
                            <span className="cursor-pointer pr-5 font-medium" onClick={() => setOpenFilter(openFilter === col.key ? null : col.key)}>
                              {col.label}
                            </span>
                          </PopoverTrigger>
                          <PopoverContent align="center" className="w-auto min-w-[340px] p-0">
                            {col.key === "vigencia_fim" ? (
                              <>
                                <Calendar
                                  mode="range"
                                  selected={vigenciaRange}
                                  onSelect={setVigenciaRange}
                                  numberOfMonths={2}
                                  locale={ptBR}
                                />
                                <div className="flex justify-end p-2">
                                  <Button size="sm" variant="ghost" onClick={() => setVigenciaRange(undefined)}>
                                    Limpar datas
                                  </Button>
                                </div>
                              </>
                            ) : col.key === "tipo_documento" ? (
                              <select
                                className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full"
                                value={filters.tipo_documento}
                                onChange={e => setFilters(f => ({ ...f, tipo_documento: e.target.value }))}
                              >
                                <option value="">Todos</option>
                                <option value="proposta">Proposta</option>
                                <option value="apolice">Apólice</option>
                                <option value="endosso">Endosso</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                            ) : (
                              <input
                                className="bg-neutral-900 border border-gray-700 rounded px-2 py-1 text-xs w-full"
                                value={filters[col.key as keyof typeof filters]}
                                onChange={e => setFilters(f => ({ ...f, [col.key]: e.target.value }))}
                                placeholder="Buscar..."
                              />
                            )}
                          </PopoverContent>
                        </Popover>
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${sort.key === col.key ? 'text-primary' : 'text-gray-500'} group-hover:text-primary`}
                          onClick={e => { e.stopPropagation(); handleSort(col.key); }}
                        >
                          {sort.key === col.key ? (
                            sort.asc ? <ChevronUp className="inline w-4 h-4" /> : <ChevronDown className="inline w-4 h-4" />
                          ) : <ChevronUp className="inline w-4 h-4 opacity-40" />}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
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
                            <td key={col.key} className={`px-4 py-2 text-xs truncate cursor-pointer${col.key === 'segurado' ? ' max-w-[420px]' : ' max-w-[160px]'}`}>
                              {(() => {
                                let value = '';
                                if (col.key === "tipo_documento") {
                                  const tipo = doc.tipo_documento;
                                  let color = "bg-blue-600 text-white";
                                  if (tipo === "apolice") color = "bg-green-600 text-white";
                                  else if (tipo === "endosso") color = "bg-yellow-500 text-black";
                                  else if (tipo === "cancelado") color = "bg-red-600 text-white";
                                  const label = tipo.charAt(0).toUpperCase() + tipo.slice(1);
                                  return (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
                                      {label}
                                    </span>
                                  );
                                } else if (col.key === "numero") {
                                  let numero = doc.tipo_documento === "apolice"
                                    ? doc.proposta.apolice || doc.proposta.numero || doc.id.substring(0, 8)
                                    : doc.tipo_documento === "endosso"
                                      ? doc.proposta.endosso || doc.proposta.numero || doc.id.substring(0, 8)
                                      : doc.proposta.numero || doc.id.substring(0, 8);
                                  const seguradora = (doc.proposta.cia_seguradora || '').toLowerCase();
                                  if (seguradora.includes('hdi')) {
                                    if (numero && numero.includes('.')) {
                                      numero = numero.split('.').pop();
                                    }
                                  } else if (seguradora.includes('allianz') && doc.tipo_documento === 'apolice') {
                                    if (numero && numero.length > 7) {
                                      numero = numero.slice(-7);
                                    }
                                  }
                                  value = numero;
                                } else if (col.key === "segurado") {
                                  value = doc.segurado.nome;
                                } else if (col.key === "cpf") {
                                  value = doc.segurado.cpf;
                                } else if (col.key === "placa") {
                                  value = doc.veiculo.placa;
                                } else if (col.key === "veiculo") {
                                  const modelo = doc.veiculo.marca_modelo;
                                  const ano_modelo = doc.veiculo.ano_modelo && doc.veiculo.ano_modelo !== 'Não informado' ? doc.veiculo.ano_modelo : '';
                                  const ano_fabricacao = doc.veiculo.ano_fabricacao && doc.veiculo.ano_fabricacao !== 'Não informado' ? doc.veiculo.ano_fabricacao : '';
                                  let veiculoStr = modelo;
                                  if (ano_fabricacao || ano_modelo) {
                                    veiculoStr += ` - ${ano_fabricacao}${ano_modelo ? `/${ano_modelo}` : ''}`;
                                  }
                                  value = veiculoStr;
                                } else if (col.key === "cia_seguradora") {
                                  value = formatarNomeSeguradora(doc.proposta.cia_seguradora);
                                } else if (col.key === "vigencia_fim") {
                                  value = parseDataVigencia(doc.proposta.vigencia_fim);
                                }
                                if (col.key === "segurado") {
                                  return <span className="block whitespace-normal break-words max-w-[420px]">{value}</span>;
                                }
                                if (col.key === "veiculo") {
                                  let maxLen = 18;
                                  const isLong = typeof value === 'string' && value.length > maxLen;
                                  if (!isLong) {
                                    return <span className="truncate block">{value}</span>;
                                  }
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="truncate block hover:underline text-blue-400" tabIndex={0}>{value.slice(0, maxLen)}...</span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm break-words whitespace-pre-line text-xs bg-neutral-900 border border-gray-700">
                                        {value}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }
                                return <span className="truncate block">{value}</span>;
                              })()}
                            </td>
                          ))}
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-primary hover:bg-primary/10"
                                      asChild
                                    >
                                      <Link href={`/documentos/${doc.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Visualizar documento</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                      onClick={() => handleDelete(doc.id)}
                                      disabled={deletingId === doc.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir documento</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </TooltipProvider>
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