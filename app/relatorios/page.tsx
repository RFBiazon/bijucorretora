"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, BarChart2, PieChart, TrendingUp, Users, Car, Building2, ArrowDown, ArrowUp, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import PageTransition from "@/components/PageTransition"
import * as Recharts from "recharts"
import { formatarValorMonetario, normalizarProposta } from "@/lib/utils/normalize"
import { capitalize, capitalizeWords, formatarNomeSeguradora, formatarNomeCorretor } from "@/utils/formatters"
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { ProtectedRoute } from "@/components/ProtectedRoute"

interface Proposta {
  id: string
  status: string
  criado_em: string
  resultado: any
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Função para converter string de valor brasileiro para número
function parseValor(valor: any): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    // Remove 'R$', espaços, pontos de milhar e troca vírgula por ponto
    const normalizado = valor.replace(/[^0-9,.-]+/g, "").replace(/\./g, "").replace(",", ".");
    const num = Number(normalizado);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

export default function RelatoriosPage() {
  const [propostas, setPropostas] = useState<any[]>([])
  const [periodo, setPeriodo] = useState("todos")
  const [seguradora, setSeguradora] = useState("todos")
  const [isLoading, setIsLoading] = useState(true)

  // Paginação da tabela de propostas
  const [pagina, setPagina] = useState(1)
  const porPagina = 10
  const totalPaginas = Math.ceil(propostas.length / porPagina)
  const propostasPaginadas = propostas.slice((pagina - 1) * porPagina, pagina * porPagina)

  // Estado para ordenação da tabela
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'criado_em', direction: 'desc' })

  // Estado para ordenação do ranking de prêmio
  const [rankingPremioOrder, setRankingPremioOrder] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    fetchPropostas()
  }, [])

  const fetchPropostas = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })

      if (error) throw error

      // Normaliza todas as propostas
      const propostasNormalizadas = data.map(proposta => normalizarProposta(proposta))
      setPropostas(propostasNormalizadas)
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const propostasFiltradas = propostas.filter((proposta) => {
    if (periodo === "todos" && seguradora === "todos") return true

    const dataProposta = new Date(proposta.criado_em)
    const hoje = new Date()
    const trintaDiasAtras = new Date(hoje.setDate(hoje.getDate() - 30))
    const sessentaDiasAtras = new Date(hoje.setDate(hoje.getDate() - 60))

    const filtroPeriodo =
      periodo === "todos" ||
      (periodo === "30dias" && dataProposta >= trintaDiasAtras) ||
      (periodo === "60dias" && dataProposta >= sessentaDiasAtras)

    const filtroSeguradora =
      seguradora === "todos" || proposta.proposta.cia_seguradora === seguradora

    return filtroPeriodo && filtroSeguradora
  })

  const seguradoras = Array.from(new Set(propostas.map((p) => p.proposta.cia_seguradora)))

  const totalPropostas = propostasFiltradas.length
  const totalValor = propostasFiltradas.reduce(
    (acc, proposta) => acc + formatarValorMonetario(proposta.valores.preco_total),
    0
  )
  const mediaValor = totalPropostas > 0 ? totalValor / totalPropostas : 0

  const dadosPorSeguradora = seguradoras.map((seg) => ({
    name: seg,
    value: propostasFiltradas.filter((p) => p.proposta.cia_seguradora === seg).length,
  }))

  const dadosPorVeiculo = propostasFiltradas.reduce((acc: any[], proposta) => {
    const marca = proposta.veiculo.marca_modelo.split(" ")[0]
    const existing = acc.find((item) => item.name === marca)
    if (existing) {
      existing.value++
    } else {
      acc.push({ name: marca, value: 1 })
    }
    return acc
  }, [])

  const dadosPorMes = propostasFiltradas.reduce((acc: any[], proposta) => {
    const data = new Date(proposta.criado_em)
    const mes = data.toLocaleString("pt-BR", { month: "short" })
    const existing = acc.find((item) => item.name === mes)
    if (existing) {
      existing.value++
    } else {
      acc.push({ name: mes, value: 1 })
    }
    return acc
  }, [])

  // Gráfico de barras: Propostas por mês
  const barChartConfig = {
    propostas: { label: "Propostas", color: "#fff" },
  }

  // Gráfico de pizza: Distribuição por seguradora
  const pieChartConfig = Object.fromEntries(
    dadosPorSeguradora.map((item, i) => [item.name, { label: item.name, color: "#fff" }])
  )

  // Gerar dados para o RadarChart de seguradoras
  const radarChartData = dadosPorSeguradora.map((item) => ({ seguradora: capitalizeWords(item.name), propostas: item.value }))

  // Resumo de status
  const statusCount = propostasFiltradas.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Valores para resumo
  const valoresPropostas = propostasFiltradas.map(p => formatarValorMonetario(p.valores.preco_total)).filter(v => v > 0)
  const maiorPremio = valoresPropostas.length ? Math.max(...valoresPropostas) : 0
  const menorPremio = valoresPropostas.length ? Math.min(...valoresPropostas) : 0

  // Últimas propostas
  const ultimasPropostas = propostasFiltradas.slice(0, 10)

  // Função para ordenar propostas
  const sortedPropostas = [...propostasPaginadas].sort((a, b) => {
    const { key, direction } = sortConfig
    let aValue = a
    let bValue = b
    // Suporte para campos aninhados
    if (key.includes('.')) {
      const [main, sub] = key.split('.')
      aValue = a[main][sub]
      bValue = b[main][sub]
    } else {
      aValue = a[key]
      bValue = b[key]
    }
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    return 0
  })

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  // Lista completa de seguradoras com quantidade de propostas
  const rankingSeguradoras = dadosPorSeguradora
    .map(item => ({ name: formatarNomeSeguradora(item.name), value: item.value }))
    .sort((a, b) => b.value - a.value)

  // Novo agrupamento para ranking de prêmio por seguradora
  const premioPorSeguradora: Record<string, number> = {};
  propostasFiltradas.forEach((p) => {
    const nomeSeg = formatarNomeSeguradora(p.proposta.cia_seguradora);
    const valor = formatarValorMonetario(p.valores.preco_total);
    premioPorSeguradora[nomeSeg] = (premioPorSeguradora[nomeSeg] || 0) + valor;
  });
  const rankingPremioSeguradora = Object.entries(premioPorSeguradora)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => rankingPremioOrder === 'desc' ? b.value - a.value : a.value - b.value);

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-muted-foreground">Análise de propostas e cotações</p>
            </div>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="60dias">Últimos 60 dias</SelectItem>
                </SelectContent>
              </Select>
              <Select value={seguradora} onValueChange={setSeguradora}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seguradora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {seguradoras.map((seg, idx) => (
                    <SelectItem key={seg + '-' + idx} value={seg}>
                      {formatarNomeSeguradora(seg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards de resumo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPropostas}</div>
                <p className="text-xs text-muted-foreground">
                  {periodo !== "todos" ? `Nos últimos ${periodo === "30dias" ? "30" : "60"} dias` : "Total geral"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalValor)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {periodo !== "todos" ? `Nos últimos ${periodo === "30dias" ? "30" : "60"} dias` : "Total geral"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(mediaValor)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {periodo !== "todos" ? `Nos últimos ${periodo === "30dias" ? "30" : "60"} dias` : "Total geral"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Seguradoras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seguradoras.length}</div>
                <p className="text-xs text-muted-foreground">Total de seguradoras</p>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Seguradoras e Veículos */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-black dark:bg-black border border-gray-800 col-span-2">
              <CardHeader>
                <CardTitle>Seguradoras</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rankingSeguradoras.map((item, idx) => (
                    <li key={item.name + '-' + idx} className="flex justify-between items-center">
                      <span>{item.name}</span>
                      <span className="font-bold">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800 col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ranking de Prêmio por Seguradora</CardTitle>
                <button onClick={() => setRankingPremioOrder(o => o === 'desc' ? 'asc' : 'desc')} className="ml-2 text-muted-foreground hover:text-primary transition-colors">
                  {rankingPremioOrder === 'desc' ? <ArrowDown className="inline w-4 h-4" /> : <ArrowUp className="inline w-4 h-4" />}
                </button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rankingPremioSeguradora.map((item, idx) => (
                    <li key={item.name + '-' + idx} className="flex justify-between items-center border-b border-gray-800 pb-1 last:border-b-0">
                      <span className="truncate max-w-[60%]">{item.name}</span>
                      <span className="font-bold text-right min-w-[120px]">{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Resumo de status e valores */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Status das Propostas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  <li><span className="text-green-400">Concluídas:</span> {statusCount["concluido"] || 0}</li>
                  <li><span className="text-blue-400">Processando:</span> {statusCount["processando"] || 0}</li>
                  <li><span className="text-red-400">Erro:</span> {statusCount["erro"] || 0}</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Resumo de Valores</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  <li><span className="text-muted-foreground">Maior prêmio:</span> {maiorPremio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</li>
                  <li><span className="text-muted-foreground">Menor prêmio:</span> {menorPremio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</li>
                  <li><span className="text-muted-foreground">Média:</span> {mediaValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</li>
                  <li><span className="text-muted-foreground">Total:</span> {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Tabela paginada de propostas */}
          <Card className="bg-black dark:bg-black border border-gray-800 mb-8">
            <CardHeader>
              <CardTitle>Propostas</CardTitle>
              <CardDescription>Lista completa de propostas processadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => handleSort('proposta.numero')} className="cursor-pointer select-none">Número {sortConfig.key === 'proposta.numero' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                      <TableHead onClick={() => handleSort('proposta.cia_seguradora')} className="cursor-pointer select-none">Seguradora {sortConfig.key === 'proposta.cia_seguradora' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                      <TableHead onClick={() => handleSort('segurado.nome')} className="cursor-pointer select-none">Segurado {sortConfig.key === 'segurado.nome' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                      <TableHead onClick={() => handleSort('valores.preco_total')} className="cursor-pointer select-none">Prêmio {sortConfig.key === 'valores.preco_total' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                      <TableHead onClick={() => handleSort('proposta.vigencia_inicio')} className="cursor-pointer select-none">Vigência {sortConfig.key === 'proposta.vigencia_inicio' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                      <TableHead onClick={() => handleSort('corretor.nome')} className="cursor-pointer select-none">Corretor {sortConfig.key === 'corretor.nome' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPropostas.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.proposta.numero || p.id.slice(0, 8)}</TableCell>
                        <TableCell>{formatarNomeSeguradora(p.proposta.cia_seguradora)}</TableCell>
                        <TableCell>{p.segurado.nome.toUpperCase()}</TableCell>
                        <TableCell>{formatarValorMonetario(p.valores.preco_total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                        <TableCell>{p.proposta.vigencia_fim || '-'}</TableCell>
                        <TableCell>{formatarNomeCorretor(p.corretor?.nome)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação */}
              <div className="flex justify-between items-center mt-4">
                <span className="text-xs text-muted-foreground">
                  Página {pagina} de {totalPaginas}
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                  >
                    Anterior
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-50"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </ProtectedRoute>
  )
}
