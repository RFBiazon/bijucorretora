"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileText } from "lucide-react"
import { RelatorioCotacoes } from "./components/relatorio-cotacoes"
import { GraficoCotacoes } from "./components/grafico-cotacoes"
import { GraficoSeguradora } from "./components/grafico-seguradora"
import { extrairNomeSegurado, extrairSeguradora, extrairValorPremio } from "@/utils/extrator-dados"

interface Cotacao {
  id: string
  nome: string
  nomeArquivo?: string
  data: string
  texto: string
  seguradora?: string
  valor?: number
}

// Função para formatar valores monetários no padrão brasileiro
const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function RelatoriosPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [periodoFiltro, setPeriodoFiltro] = useState("todos")
  const [cotacoesFiltradas, setCotacoesFiltradas] = useState<Cotacao[]>([])

  // Carregar cotações do localStorage ao montar o componente
  useEffect(() => {
    const storedCotacoes = localStorage.getItem("cotacoes")
    if (storedCotacoes) {
      const parsedCotacoes = JSON.parse(storedCotacoes)

      // Extrair informações adicionais do texto da cotação
      const cotacoesProcessadas = parsedCotacoes.map((cotacao: Cotacao) => {
        // Se o nome não for um nome de arquivo (não contém extensão), provavelmente já é o nome do segurado
        const ehNomeSegurado = !cotacao.nome.includes(".pdf") && !cotacao.nome.includes(".PDF")

        // Se já temos o nome do segurado, usamos ele
        if (ehNomeSegurado) {
          return {
            ...cotacao,
            seguradora: extrairSeguradora(cotacao.texto),
            valor: extrairValorPremio(cotacao.texto),
          }
        }

        // Caso contrário, tentamos extrair o nome do segurado
        const nomeSegurado = extrairNomeSegurado(cotacao.texto)

        return {
          ...cotacao,
          nome: nomeSegurado || cotacao.nome, // Usa o nome extraído ou mantém o nome do arquivo
          seguradora: extrairSeguradora(cotacao.texto),
          valor: extrairValorPremio(cotacao.texto),
        }
      })

      setCotacoes(cotacoesProcessadas)
      setCotacoesFiltradas(cotacoesProcessadas)
    }
  }, [])

  // Filtrar cotações por período
  useEffect(() => {
    if (cotacoes.length === 0) return

    const hoje = new Date()
    const umaSemanaAtras = new Date()
    umaSemanaAtras.setDate(hoje.getDate() - 7)

    const umMesAtras = new Date()
    umMesAtras.setMonth(hoje.getMonth() - 1)

    let filtradas = [...cotacoes]

    if (periodoFiltro === "semana") {
      filtradas = cotacoes.filter((cotacao) => {
        const dataCotacao = new Date(cotacao.data.split("/").reverse().join("-"))
        return dataCotacao >= umaSemanaAtras
      })
    } else if (periodoFiltro === "mes") {
      filtradas = cotacoes.filter((cotacao) => {
        const dataCotacao = new Date(cotacao.data.split("/").reverse().join("-"))
        return dataCotacao >= umMesAtras
      })
    }

    setCotacoesFiltradas(filtradas)
  }, [periodoFiltro, cotacoes])

  // Função para exportar relatório em CSV
  const exportarCSV = () => {
    if (cotacoesFiltradas.length === 0) return

    const headers = ["ID", "Nome do Segurado", "Data", "Seguradora", "Valor"]
    const csvContent = [
      headers.join(","),
      ...cotacoesFiltradas.map((c) => [c.id, c.nome, c.data, c.seguradora, c.valor].join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio_cotacoes_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Visualize e analise as cotações processadas</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="semana">Última semana</SelectItem>
              <SelectItem value="mes">Último mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportarCSV} disabled={cotacoesFiltradas.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {cotacoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum dado disponível</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Não há cotações processadas para gerar relatórios. Processe algumas cotações primeiro.
            </p>
            <Button className="mt-4" asChild>
              <a href="/cotacao">Ir para Cotações</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="resumo">
          <TabsList className="mb-6">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{cotacoesFiltradas.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {periodoFiltro === "todos"
                      ? "Todas as cotações"
                      : periodoFiltro === "semana"
                        ? "Na última semana"
                        : "No último mês"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prêmio Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {cotacoesFiltradas.length > 0
                      ? `R$ ${(
                          cotacoesFiltradas.reduce((acc, c) => acc + (c.valor || 0), 0) / cotacoesFiltradas.length
                        ).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "R$ 0,00"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média do prêmio/custo total das cotações</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Seguradora Mais Frequente</CardTitle>
                </CardHeader>
                <CardContent>
                  {cotacoesFiltradas.length > 0 ? (
                    <>
                      <div className="text-2xl font-bold">
                        {
                          Object.entries(
                            cotacoesFiltradas.reduce(
                              (acc, c) => {
                                acc[c.seguradora || "Desconhecida"] = (acc[c.seguradora || "Desconhecida"] || 0) + 1
                                return acc
                              },
                              {} as Record<string, number>,
                            ),
                          ).sort((a, b) => b[1] - a[1])[0][0]
                        }
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Seguradora com mais cotações</p>
                    </>
                  ) : (
                    <div className="text-2xl font-bold">-</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Cotações Recentes</CardTitle>
                <CardDescription>As últimas cotações processadas</CardDescription>
              </CardHeader>
              <CardContent>
                <RelatorioCotacoes cotacoes={cotacoesFiltradas.slice(0, 5)} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="graficos">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Seguradora</CardTitle>
                  <CardDescription>Quantidade de cotações por seguradora</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <GraficoSeguradora cotacoes={cotacoesFiltradas} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Valores por Cotação</CardTitle>
                  <CardDescription>Valores das cotações processadas</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-80">
                    <GraficoCotacoes cotacoes={cotacoesFiltradas} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detalhes">
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento de Cotações</CardTitle>
                <CardDescription>Lista completa de cotações processadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome do Segurado</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Seguradora</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cotacoesFiltradas.map((cotacao) => (
                        <TableRow key={cotacao.id}>
                          <TableCell className="font-medium">{cotacao.nome}</TableCell>
                          <TableCell>{cotacao.data}</TableCell>
                          <TableCell>{cotacao.seguradora}</TableCell>
                          <TableCell className="text-right">
                            R${" "}
                            {cotacao.valor?.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
