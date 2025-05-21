"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ChevronDown, ChevronRight, FileClock, Eye } from "lucide-react"
import { format, addDays, isAfter, isBefore, addMonths, isEqual, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PainelVencimentosProps {
  diasFuturos?: number // Quantos dias para frente considerar como "vencendo em breve"
  limitarQuantidade?: number // Limitar quantidade de parcelas exibidas
}

export function PainelVencimentos({ diasFuturos = 30, limitarQuantidade = 5 }: PainelVencimentosProps) {
  const [expanded, setExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [parcelas, setParcelas] = useState<any[]>([])
  const [rangeDatas, setRangeDatas] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: new Date(),
    to: addDays(new Date(), diasFuturos),
  })
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState("")

  useEffect(() => {
    carregarParcelas()
  }, [rangeDatas])

  async function carregarParcelas() {
    try {
      setIsLoading(true)
      
      // Converter datas para o formato do banco
      const dataInicio = format(rangeDatas.from, 'yyyy-MM-dd')
      const dataFim = rangeDatas.to ? format(rangeDatas.to, 'yyyy-MM-dd') : format(addDays(rangeDatas.from, diasFuturos), 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('parcelas_pagamento')
        .select(`
          *,
          dados_financeiros:dados_financeiros_id (
            *,
            documento:documento_id (
              id,
              tipo_documento,
              proposta:proposta->>,
              segurado:segurado->>,
              veiculo:veiculo->>
            )
          )
        `)
        .eq('status', 'pendente')
        .gte('data_vencimento', dataInicio)
        .lte('data_vencimento', dataFim)
        .order('data_vencimento', { ascending: true })
      
      if (error) throw error
      
      setParcelas(data || [])
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtra parcelas pelo texto de busca
  const parcelasFiltradas = parcelas.filter(parcela => {
    if (!filtroTexto) return true
    
    const searchTerms = filtroTexto.toLowerCase()
    
    const documento = parcela?.dados_financeiros?.documento || {}
    const proposta = typeof documento.proposta === 'string' 
      ? JSON.parse(documento.proposta) 
      : documento.proposta
    const segurado = typeof documento.segurado === 'string'
      ? JSON.parse(documento.segurado)
      : documento.segurado
    
    return (
      (proposta?.numero?.toLowerCase() || '').includes(searchTerms) ||
      (proposta?.apolice?.toLowerCase() || '').includes(searchTerms) ||
      (proposta?.cia_seguradora?.toLowerCase() || '').includes(searchTerms) ||
      (segurado?.nome?.toLowerCase() || '').includes(searchTerms) ||
      (segurado?.cpf?.toLowerCase() || '').includes(searchTerms)
    )
  })
  
  // Limitar quantidade de parcelas exibidas
  const parcelasExibidas = mostrarTodas 
    ? parcelasFiltradas 
    : parcelasFiltradas.slice(0, limitarQuantidade)
  
  // Status baseado na data de vencimento
  function getStatusParcela(dataVencimento: string) {
    const data = new Date(dataVencimento)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    if (isEqual(data, hoje)) {
      return { text: "Vence hoje", variant: "warning" }
    } else if (isBefore(data, hoje)) {
      return { text: "Atrasada", variant: "destructive" }
    } else if (isBefore(data, addDays(hoje, 7))) {
      return { text: "Próxima semana", variant: "warning" }
    } else {
      return { text: "Pendente", variant: "outline" }
    }
  }
  
  function obterNumerosDocumento(parcela: any) {
    const documento = parcela?.dados_financeiros?.documento
    if (!documento) return { numero: '-', tipo: '-' }
    
    const proposta = typeof documento.proposta === 'string' 
      ? JSON.parse(documento.proposta) 
      : documento.proposta
    
    let numero = '-'
    let tipo = 'Documento'
    
    if (documento.tipo_documento === 'apolice') {
      numero = proposta?.apolice || proposta?.numero || '-' 
      tipo = 'Apólice'
    } else if (documento.tipo_documento === 'proposta') {
      numero = proposta?.numero || '-'
      tipo = 'Proposta'
    } else if (documento.tipo_documento === 'endosso') {
      numero = proposta?.endosso || proposta?.numero || '-'
      tipo = 'Endosso'
    }
    
    return { numero, tipo }
  }
  
  function obterNomeSegurado(parcela: any) {
    const documento = parcela?.dados_financeiros?.documento
    if (!documento) return '-'
    
    const segurado = typeof documento.segurado === 'string'
      ? JSON.parse(documento.segurado)
      : documento.segurado
    
    return segurado?.nome || '-'
  }
  
  function obterSeguradora(parcela: any) {
    const documento = parcela?.dados_financeiros?.documento
    if (!documento) return '-'
    
    const proposta = typeof documento.proposta === 'string' 
      ? JSON.parse(documento.proposta) 
      : documento.proposta
    
    return proposta?.cia_seguradora || '-'
  }

  // Função para formatar valores monetários no padrão brasileiro
  function formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <FileClock className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-md font-medium">
            Pagamentos à Vencer
            <Badge variant="outline" className="ml-2">
              {parcelas.length} parcelas
            </Badge>
          </CardTitle>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtros e período */}
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-1/2">
                      <div className="relative">
                        <Input
                          placeholder="Buscar por segurado, apólice ou seguradora..."
                          value={filtroTexto}
                          onChange={(e) => setFiltroTexto(e.target.value)}
                          className="pl-9"
                        />
                        <div className="absolute left-2.5 top-2.5 text-gray-400">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full md:w-1/2 flex justify-end">
                      <div className="grid gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="date"
                              variant={"outline"}
                              className="w-[300px] justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {rangeDatas?.from ? (
                                rangeDatas.to ? (
                                  <>
                                    {format(rangeDatas.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                    {format(rangeDatas.to, "dd/MM/yyyy", { locale: ptBR })}
                                  </>
                                ) : (
                                  format(rangeDatas.from, "dd/MM/yyyy", { locale: ptBR })
                                )
                              ) : (
                                <span>Selecione um período</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={rangeDatas?.from}
                              selected={rangeDatas}
                              onSelect={(date) => {
                                if (date?.from) {
                                  // Criar um objeto tipado corretamente
                                  const newRange = {
                                    from: date.from,
                                    to: date.to
                                  };
                                  setRangeDatas(newRange);
                                }
                              }}
                              numberOfMonths={2}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabela de parcelas */}
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Segurado</TableHead>
                          <TableHead>Seguradora</TableHead>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Valor (R$)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parcelasExibidas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-4 italic text-gray-500">
                              Nenhuma parcela pendente no período selecionado
                            </TableCell>
                          </TableRow>
                        ) : (
                          parcelasExibidas.map(parcela => {
                            const status = getStatusParcela(parcela.data_vencimento)
                            const docInfo = obterNumerosDocumento(parcela)
                            
                            return (
                              <TableRow key={parcela.id} className={
                                isToday(new Date(parcela.data_vencimento)) 
                                  ? "bg-yellow-50 dark:bg-yellow-950/10" 
                                  : ""
                              }>
                                <TableCell className="font-medium">
                                  {format(new Date(parcela.data_vencimento), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>{docInfo.numero}</span>
                                    <span className="text-xs text-gray-500">{docInfo.tipo}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{obterNomeSegurado(parcela)}</TableCell>
                                <TableCell>{obterSeguradora(parcela)}</TableCell>
                                <TableCell>{parcela.numero_parcela}/{parcela?.dados_financeiros?.quantidade_parcelas || 1}</TableCell>
                                <TableCell>{formatarMoeda(parcela.valor)}</TableCell>
                                <TableCell>
                                  <Badge variant={status.variant as any}>
                                    {status.text}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-primary hover:bg-primary/10"
                                          asChild
                                        >
                                          <Link href={`/documentos/${parcela?.dados_financeiros?.documento_id}`}>
                                            <Eye className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ver documento</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Paginação ou "ver mais" */}
                  {parcelasFiltradas.length > limitarQuantidade && (
                    <div className="flex justify-center">
                      <Button 
                        variant="link" 
                        onClick={() => setMostrarTodas(!mostrarTodas)}
                      >
                        {mostrarTodas 
                          ? "Mostrar menos" 
                          : `Ver mais ${parcelasFiltradas.length - limitarQuantidade} parcelas`}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
} 