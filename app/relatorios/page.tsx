"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText, TrendingUp, Users, Car, Building2, ArrowDown, ArrowUp, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import PageTransition from "@/components/PageTransition"
import { formatarValorMonetario, normalizarProposta } from "@/lib/utils/normalize"
import { capitalize, capitalizeWords, formatarNomeSeguradora, formatarNomeCorretor } from "@/utils/formatters"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { motion } from "framer-motion"

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

// Função para normalizar nomes de seguradoras
function normalizarNomeSeguradora(nome: string): string {
  if (!nome) return "";
  // Remove acentos
  nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Remove pontuação e espaços extras
  nome = nome.replace(/[\.,\-\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ").trim();
  // Converte para minúsculas
  nome = nome.toLowerCase();
  // Mapeamento manual para casos comuns
  if (nome.includes("allianz")) return "allianz seguros";
  if (nome.includes("yellum")) return "yellum seguros";
  if (nome.includes("tokio marine")) return "tokio marine seguradora";
  if (nome.includes("hdi")) return "hdi seguros";
  if (nome.includes("azul companhia")) return "azul companhia de seguros gerais";
  if (nome.includes("bradesco")) return "bradesco auto/re companhia de seguros";
  if (nome.includes("mapfre")) return "mapfre";
  if (nome.includes("itau")) return "itau";
  return nome;
}

// Função para exibir o nome curto da seguradora
function formatarNomeSeguradoraCurto(nome: string): string {
  const mapa: Record<string, string> = {
    "yellum seguros": "Yelum",
    "yellum": "Yelum",
    "yelum": "Yelum",
    "yelum seguros sa": "Yelum",
    "yellum seguros sa": "Yelum",
    "bradesco auto/re companhia de seguros": "Bradesco",
    "bradesco": "Bradesco",
    "allianz seguros": "Allianz",
    "allianz": "Allianz",
    "tokio marine seguradora": "Tokio",
    "tokio marine": "Tokio",
    "azul companhia de seguros gerais": "Azul",
    "azul": "Azul",
    "hdi seguros": "HDI",
    "hdi": "HDI",
    "itau": "Itaú",
    "mapfre": "Mapfre",
  };
  const normalizado = normalizarNomeSeguradora(nome);
  return mapa[normalizado] || nome;
}

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

  const seguradorasNormalizadas = Array.from(new Set(propostas.map((p) => normalizarNomeSeguradora(p.proposta.cia_seguradora))));

  const dadosPorSeguradora = seguradorasNormalizadas.map((seg) => ({
    name: seg,
    value: propostasFiltradas.filter((p) => normalizarNomeSeguradora(p.proposta.cia_seguradora) === seg).length,
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
    .map(item => ({ name: capitalizeWords(item.name), value: item.value }))
    .sort((a, b) => b.value - a.value)

  // Novo agrupamento para ranking de prêmio por seguradora
  const premioPorSeguradora: Record<string, number> = {};
  propostasFiltradas.forEach((p) => {
    const nomeSeg = normalizarNomeSeguradora(p.proposta.cia_seguradora);
    const valor = formatarValorMonetario(p.valores.preco_total);
    premioPorSeguradora[nomeSeg] = (premioPorSeguradora[nomeSeg] || 0) + valor;
  });
  const rankingPremioSeguradora = Object.entries(premioPorSeguradora)
    .map(([name, value]) => ({ name: capitalizeWords(name), value }))
    .sort((a, b) => rankingPremioOrder === 'desc' ? b.value - a.value : a.value - b.value);

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-muted-foreground">Visualize relatórios e estatísticas</p>
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
                  {seguradorasNormalizadas.map((seg, idx) => (
                    <SelectItem key={seg + '-' + idx} value={seg}>
                      {formatarNomeSeguradoraCurto(seg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Total de Propostas</CardTitle>
                <CardDescription>Número total de propostas processadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{propostasFiltradas.length}</div>
              </CardContent>
            </Card>

            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Prêmio Total</CardTitle>
                <CardDescription>Soma total dos prêmios das propostas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {propostasFiltradas.reduce((acc, p) => acc + parseValor(p.valores.preco_total), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 grid gap-4 md:grid-cols-3"
          >
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Propostas por Seguradora</CardTitle>
                <CardDescription>Distribuição de propostas por seguradora</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dadosPorSeguradora.map((item, idx) => (
                    <li key={item.name + '-' + idx} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-b-0">
                      <span>{formatarNomeSeguradoraCurto(item.name)}</span>
                      <span className="font-bold">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader>
                <CardTitle>Seguradoras</CardTitle>
                <CardDescription>Ranking de Propostas por Seguradora</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rankingSeguradoras.map((item, idx) => (
                    <li key={item.name + '-' + idx} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-b-0">
                      <span>{formatarNomeSeguradoraCurto(item.name)}</span>
                      <span className="font-bold">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-black dark:bg-black border border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ranking</CardTitle>                           
                <button onClick={() => setRankingPremioOrder(o => o === 'desc' ? 'asc' : 'desc')} className="ml-2 text-muted-foreground hover:text-primary transition-colors">
                  {rankingPremioOrder === 'desc' ? <ArrowDown className="inline w-4 h-4" /> : <ArrowUp className="inline w-4 h-4" />}
                </button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {rankingPremioSeguradora.map((item, idx) => (
                    <li key={item.name + '-' + idx} className="flex justify-between items-center border-b border-gray-800 pb-2 last:border-b-0">
                      <span className="truncate max-w-[60%]">{formatarNomeSeguradoraCurto(item.name)}</span>
                      <span className="font-bold text-right min-w-[120px]">{Number(item.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </PageTransition>
    </ProtectedRoute>
  )
}
