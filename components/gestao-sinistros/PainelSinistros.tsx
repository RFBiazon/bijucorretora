"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronDown, PlusCircle, Save, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"

// Tipos
interface Sinistro {
  id: string
  numero: string
  data: string
  terceiro_envolvido: boolean
}

interface PainelSinistrosProps {
  documentoId: string
  tipoDocumento: string
  vigenciaInicio?: string
  vigenciaFim?: string
}

// Função para formatar data para armazenamento
function formatDateForStorage(date: Date | null): string | null {
  if (!date) return null
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// Função para interpretar data do banco para componente
function parseConsistentDate(dateString: string | null | undefined): Date | undefined {
  if (!dateString) return undefined
  
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return undefined
  
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date
}

// Função para verificar se a data do sinistro está dentro do período de vigência
function isSinistroInVigencia(
  dataSinistro: string | null | undefined,
  vigenciaInicio: string | null | undefined,
  vigenciaFim: string | null | undefined
): boolean {
  if (!dataSinistro) return false
  
  const sinistroDate = parseConsistentDate(dataSinistro)
  const inicioDate = vigenciaInicio ? parseConsistentDate(vigenciaInicio) : undefined
  const fimDate = vigenciaFim ? parseConsistentDate(vigenciaFim) : undefined
  
  if (!sinistroDate) return false
  
  // Se não houver datas de vigência definidas, consideramos válido (comportamento anterior)
  if (!inicioDate && !fimDate) return true
  
  // Verificar se a data do sinistro está entre o início e fim da vigência
  if (inicioDate && fimDate) {
    return sinistroDate >= inicioDate && sinistroDate <= fimDate
  }
  
  // Se só tiver uma das datas de vigência
  if (inicioDate && !fimDate) {
    return sinistroDate >= inicioDate
  }
  
  if (!inicioDate && fimDate) {
    return sinistroDate <= fimDate
  }
  
  return false
}

export function PainelSinistros({ documentoId, tipoDocumento, vigenciaInicio, vigenciaFim }: PainelSinistrosProps) {
  const [expanded, setExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [sinistros, setSinistros] = useState<Sinistro[]>([])
  const [sinistrosValidos, setSinistrosValidos] = useState<Sinistro[]>([])
  const [mostraCadastro, setMostraCadastro] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  
  // Campos para novo sinistro
  const [numeroSinistro, setNumeroSinistro] = useState("")
  const [dataSinistro, setDataSinistro] = useState<Date | undefined>(undefined)
  const [terceiroEnvolvido, setTerceiroEnvolvido] = useState(false)

  // Verificar se é apolice ou endosso para habilitar a funcionalidade
  const usarGestaoSinistros = tipoDocumento === "apolice" || tipoDocumento === "endosso"

  // Atualizar sinistros válidos quando sinistros ou datas de vigência mudarem
  useEffect(() => {
    const validos = sinistros.filter(sinistro => 
      isSinistroInVigencia(sinistro.data, vigenciaInicio, vigenciaFim)
    );
    setSinistrosValidos(validos);
  }, [sinistros, vigenciaInicio, vigenciaFim]);

  // Carregar sinistros do documento
  useEffect(() => {
    if (usarGestaoSinistros) {
      carregarSinistros()
    }
  }, [documentoId, usarGestaoSinistros])

  async function carregarSinistros() {
    try {
      setIsLoading(true)
      setErro(null)
      
      // Consultar a tabela ocr_processamento para obter os sinistros do documento
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("sinistros")
        .eq("id", documentoId)
        .single()
      
      if (error) {
        throw new Error(`Erro ao carregar sinistros: ${error.message}`)
      }
      
      // Verificar se temos sinistros registrados
      if (data && data.sinistros && Array.isArray(data.sinistros)) {
        setSinistros(data.sinistros)
      } else {
        setSinistros([])
      }
    } catch (error) {
      console.error("Erro ao carregar sinistros:", error)
      setErro(error instanceof Error ? error.message : "Erro desconhecido")
      toast.error("Não foi possível carregar os sinistros")
    } finally {
      setIsLoading(false)
    }
  }

  async function salvarSinistro() {
    if (!numeroSinistro || !dataSinistro) {
      toast.error("Número e data do sinistro são obrigatórios")
      return
    }
    
    try {
      setSalvando(true)
      
      // Criar novo objeto de sinistro
      const novoSinistro: Sinistro = {
        id: crypto.randomUUID(),
        numero: numeroSinistro,
        data: formatDateForStorage(dataSinistro) || "",
        terceiro_envolvido: terceiroEnvolvido
      }
      
      // Adicionar ao array de sinistros
      const novosSinistros = [...sinistros, novoSinistro]
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ sinistros: novosSinistros })
        .eq("id", documentoId)
      
      if (error) {
        throw new Error(`Erro ao salvar sinistro: ${error.message}`)
      }
      
      // Atualizar estado local
      setSinistros(novosSinistros)
      
      // Limpar formulário
      setNumeroSinistro("")
      setDataSinistro(undefined)
      setTerceiroEnvolvido(false)
      setMostraCadastro(false)
      
      toast.success("Sinistro cadastrado com sucesso")
    } catch (error) {
      console.error("Erro ao salvar sinistro:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao salvar sinistro")
    } finally {
      setSalvando(false)
    }
  }

  async function removerSinistro(id: string) {
    try {
      // Filtrar o sinistro a ser removido
      const sinistrosAtualizados = sinistros.filter(s => s.id !== id)
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from("ocr_processamento")
        .update({ sinistros: sinistrosAtualizados })
        .eq("id", documentoId)
      
      if (error) {
        throw new Error(`Erro ao remover sinistro: ${error.message}`)
      }
      
      // Atualizar estado local
      setSinistros(sinistrosAtualizados)
      
      toast.success("Sinistro removido com sucesso")
    } catch (error) {
      console.error("Erro ao remover sinistro:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao remover sinistro")
    }
  }

  // Se não for permitido usar o componente, não exibe nada
  if (!usarGestaoSinistros) {
    return null
  }

  return (
    <Card className="bg-card border border-gray-800 transition-all duration-300 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-6 bg-card border-b border-gray-800">
        <div className="flex items-center gap-2 min-h-[32px]">
          <CardTitle className="text-md font-medium">
            Informações de Sinistros
          </CardTitle>
          {sinistrosValidos.length > 0 && (
            <Badge variant="outline" className="ml-2 text-sm">
              {sinistrosValidos.length} sinistro{sinistrosValidos.length > 1 ? "s" : ""} na vigência
            </Badge>
          )}
          {sinistros.length > sinistrosValidos.length && (
            <Badge variant="outline" className="ml-2 text-sm text-muted-foreground">
              {sinistros.length - sinistrosValidos.length} fora da vigência
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ml-2 p-1 rounded flex items-center justify-center h-full self-center hover:bg-muted/30 transition"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </button>
      </CardHeader>
      
      <AnimatePresence mode="sync" initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, transform: "translateY(-8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-8px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <CardContent className="pt-4 pb-6 px-6 bg-card">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : erro ? (
                <div className="p-3 border border-red-300 bg-red-50 rounded text-red-800 flex flex-col space-y-2">
                  <h3 className="font-semibold text-md">Erro ao carregar sinistros</h3>
                  <p className="text-sm">{erro}</p>
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" variant="outline" onClick={() => carregarSinistros()} className="h-7 text-sm">
                      Tentar novamente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Listagem de sinistros válidos (dentro da vigência) */}
                  {sinistrosValidos.length > 0 ? (
                    <div className="border border-gray-800 rounded-md bg-card overflow-hidden">
                      <div className="bg-muted/20 py-2 px-4 border-b border-gray-800">
                        <h3 className="text-sm font-medium">Sinistros na Vigência</h3>
                      </div>
                      <Table className="w-full">
                        <TableHeader className="bg-muted/50">
                          <TableRow className="h-12">
                            <TableHead className="w-[30%] py-3 px-4 text-sm">Número do Sinistro</TableHead>
                            <TableHead className="w-[30%] py-3 px-4 text-sm">Data</TableHead>
                            <TableHead className="w-[30%] py-3 px-4 text-sm">Terceiro Envolvido</TableHead>
                            <TableHead className="w-[10%] py-3 px-4 text-center text-sm">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sinistrosValidos.map(sinistro => (
                            <TableRow key={sinistro.id} className="transition-colors h-12">
                              <TableCell className="py-3 px-4 text-sm">{sinistro.numero}</TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                {sinistro.data ? format(parseConsistentDate(sinistro.data) || new Date(), "dd/MM/yyyy") : "Não informado"}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                {sinistro.terceiro_envolvido ? (
                                  <Badge className="bg-blue-500 text-sm py-0.5 h-6">Sim</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-sm py-0.5 h-6">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removerSinistro(sinistro.id)}
                                  className="text-red-500 hover:text-red-700 h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : sinistros.length > 0 ? (
                    <div className="text-center p-6 text-muted-foreground text-sm">
                      Não há sinistros dentro do período de vigência.
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground text-sm">
                      Nenhum sinistro registrado para este seguro.
                    </div>
                  )}
                  
                  {/* Listagem de sinistros fora da vigência */}
                  {sinistros.length > sinistrosValidos.length && (
                    <div className="border border-gray-800 rounded-md bg-card/60 overflow-hidden">
                      <div className="bg-muted/10 py-2 px-4 border-b border-gray-800">
                        <h3 className="text-sm font-medium text-muted-foreground">Sinistros Fora da Vigência</h3>
                      </div>
                      <Table className="w-full">
                        <TableHeader className="bg-muted/30">
                          <TableRow className="h-12">
                            <TableHead className="w-[30%] py-3 px-4 text-sm text-muted-foreground">Número do Sinistro</TableHead>
                            <TableHead className="w-[30%] py-3 px-4 text-sm text-muted-foreground">Data</TableHead>
                            <TableHead className="w-[30%] py-3 px-4 text-sm text-muted-foreground">Terceiro Envolvido</TableHead>
                            <TableHead className="w-[10%] py-3 px-4 text-center text-sm text-muted-foreground">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sinistros.filter(sinistro => !isSinistroInVigencia(sinistro.data, vigenciaInicio, vigenciaFim)).map(sinistro => (
                            <TableRow key={sinistro.id} className="transition-colors h-12 text-muted-foreground">
                              <TableCell className="py-3 px-4 text-sm">{sinistro.numero}</TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                {sinistro.data ? format(parseConsistentDate(sinistro.data) || new Date(), "dd/MM/yyyy") : "Não informado"}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-sm">
                                {sinistro.terceiro_envolvido ? (
                                  <Badge className="bg-blue-500/50 text-blue-500/70 text-sm py-0.5 h-6">Sim</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground text-sm py-0.5 h-6">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removerSinistro(sinistro.id)}
                                  className="text-red-500/70 hover:text-red-700 h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Formulário de cadastro */}
                  <AnimatePresence>
                    {mostraCadastro && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border border-gray-800 rounded-md p-6 bg-card mt-5"
                      >
                        <h3 className="text-md font-medium mb-5">Cadastrar Novo Sinistro</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <Label htmlFor="numero-sinistro" className="text-sm">Número do Sinistro</Label>
                            <Input
                              id="numero-sinistro"
                              value={numeroSinistro}
                              onChange={e => setNumeroSinistro(e.target.value)}
                              className="bg-background border border-gray-800 h-10 text-sm"
                              placeholder="Digite o número do sinistro"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label htmlFor="data-sinistro" className="text-sm">Data do Sinistro</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="relative">
                                  <Input
                                    id="data-sinistro"
                                    type="text"
                                    placeholder="dd/mm/aaaa"
                                    value={dataSinistro ? format(dataSinistro, "dd/MM/yyyy") : ""}
                                    onChange={(e) => {
                                      const inputDate = e.target.value;
                                      if (inputDate) {
                                        const parts = inputDate.split('/');
                                        if (parts.length === 3 && parts[2].length === 4) {
                                          try {
                                            const day = parseInt(parts[0]);
                                            const month = parseInt(parts[1]) - 1;
                                            const year = parseInt(parts[2]);
                                            
                                            const date = new Date(year, month, day);
                                            if (!isNaN(date.getTime())) {
                                              setDataSinistro(date);
                                            }
                                          } catch (error) {
                                            console.error("Data inválida:", error);
                                          }
                                        }
                                      }
                                    }}
                                    className="w-full pr-10 bg-background border border-gray-800 h-10 text-sm"
                                  />
                                  <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50" />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dataSinistro}
                                  onSelect={setDataSinistro}
                                  locale={ptBR}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          
                          <div className="flex items-center space-x-2 md:col-span-2 pt-3">
                            <Switch
                              id="terceiro-envolvido"
                              checked={terceiroEnvolvido}
                              onCheckedChange={setTerceiroEnvolvido}
                              className="h-5 w-10"
                            />
                            <Label htmlFor="terceiro-envolvido" className="text-sm">Houve Terceiro Envolvido?</Label>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-6 gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setMostraCadastro(false)}
                            disabled={salvando}
                            className="h-9 text-sm px-4"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={salvarSinistro}
                            disabled={salvando || !numeroSinistro || !dataSinistro}
                            className="h-9 text-sm px-4"
                          >
                            {salvando ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Salvando...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Botões de ação */}
                  {!mostraCadastro && (
                    <div className="flex justify-center mt-4">
                      <Button
                        onClick={() => setMostraCadastro(true)}
                        className="h-10 text-sm px-5"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Cadastrar Sinistro
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
  );
} 