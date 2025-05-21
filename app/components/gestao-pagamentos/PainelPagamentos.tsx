"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronDown, ChevronRight, PlusCircle, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"

// Tipos para os dados financeiros
interface Parcela {
  id: string
  dados_financeiros_id: string
  numero_parcela: number
  valor: number
  data_vencimento: string | null
  data_pagamento: string | null
  status: "pendente" | "pago" | "atrasado" | "cancelado"
  detalhes?: any
}

interface DadosFinanceiros {
  id: string
  documento_id: string
  forma_pagamento: string
  quantidade_parcelas: number
  valor_total: number
  premio_liquido: number
  premio_bruto: number
  ultima_atualizacao: string
  usuario_editor?: string
  fonte: "documento" | "manual" | "misto"
  tipo_documento: string
  dados_confirmados: boolean
}

interface PainelPagamentosProps {
  documentoId: string
  tipoDocumento: string
  dadosOriginais: any
}

export function PainelPagamentos({ documentoId, tipoDocumento, dadosOriginais }: PainelPagamentosProps) {
  const [expanded, setExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [dadosFinanceiros, setDadosFinanceiros] = useState<DadosFinanceiros | null>(null)
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [novaQuantidadeParcelas, setNovaQuantidadeParcelas] = useState(0)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [salvando, setSalvando] = useState(false)

  // Verificar se precisa usar a gestão financeira
  const usarGestaoFinanceira = 
    tipoDocumento === "apolice" && 
    dadosOriginais?.proposta?.forma_pagto !== "cartão de crédito" &&
    dadosOriginais?.proposta?.forma_pagto !== "cartao de credito";

  useEffect(() => {
    if (usarGestaoFinanceira) {
      carregarDadosFinanceiros();
    }
  }, [documentoId, usarGestaoFinanceira]);

  async function carregarDadosFinanceiros() {
    try {
      setIsLoading(true);

      // Verificar se já existem dados financeiros
      const { data: dadosExistentes, error } = await supabase
        .from("dados_financeiros")
        .select("*")
        .eq("documento_id", documentoId)
        .single();

      if (error && error.code !== "PGRST116") {
        // Erro diferente de "não encontrado"
        throw error;
      }

      if (dadosExistentes) {
        // Dados encontrados, carregar parcelas
        setDadosFinanceiros(dadosExistentes);
        setFormaPagamento(dadosExistentes.forma_pagamento);
        setNovaQuantidadeParcelas(dadosExistentes.quantidade_parcelas);

        const { data: parcelasExistentes, error: erroParecelas } = await supabase
          .from("parcelas_pagamento")
          .select("*")
          .eq("dados_financeiros_id", dadosExistentes.id)
          .order("numero_parcela", { ascending: true });

        if (erroParecelas) throw erroParecelas;

        setParcelas(parcelasExistentes || []);
      } else {
        // Dados não encontrados, criar novos
        criarDadosFinanceiros();
      }
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      toast.error("Não foi possível carregar os dados financeiros");
    } finally {
      setIsLoading(false);
    }
  }

  async function criarDadosFinanceiros() {
    try {
      // Extrair dados do documento original
      const formaPagto = dadosOriginais?.proposta?.forma_pagto || "";
      const qtdParcelas = dadosOriginais?.proposta?.quantidade_parcelas || 1;
      const valorTotal = dadosOriginais?.proposta?.premio_total || 0;
      const premioLiquido = dadosOriginais?.proposta?.premio_liquido || 0;
      const premioBruto = dadosOriginais?.proposta?.premio_bruto || 0;

      setFormaPagamento(formaPagto);
      setNovaQuantidadeParcelas(qtdParcelas);

      // Inserir na tabela dados_financeiros
      const { data: novosDados, error } = await supabase
        .from("dados_financeiros")
        .insert({
          documento_id: documentoId,
          forma_pagamento: formaPagto,
          quantidade_parcelas: qtdParcelas,
          valor_total: valorTotal,
          premio_liquido: premioLiquido,
          premio_bruto: premioBruto,
          tipo_documento: tipoDocumento,
          fonte: "documento",
          dados_confirmados: false
        })
        .select("*")
        .single();

      if (error) throw error;

      setDadosFinanceiros(novosDados);

      // Criar parcelas
      const valorParcela = valorTotal / qtdParcelas;
      
      // Data base para vencimentos (hoje + 30 dias)
      const hoje = new Date();
      let dataVencimento = new Date();
      dataVencimento.setDate(hoje.getDate() + 30);
      
      const novasParcelas = [];
      for (let i = 0; i < qtdParcelas; i++) {
        // Ajustar data de vencimento para cada parcela
        if (i > 0) {
          const dataAnterior = new Date(dataVencimento);
          dataVencimento = new Date(dataAnterior);
          dataVencimento.setDate(dataAnterior.getDate() + 30);
        }
        
        novasParcelas.push({
          dados_financeiros_id: novosDados.id,
          numero_parcela: i + 1,
          valor: valorParcela,
          data_vencimento: dataVencimento.toISOString().split("T")[0],
          status: "pendente"
        });
      }
      
      // Inserir as parcelas
      const { data: parcelasInseridas, error: erroParcelas } = await supabase
        .from("parcelas_pagamento")
        .insert(novasParcelas)
        .select("*");
        
      if (erroParcelas) throw erroParcelas;
      
      setParcelas(parcelasInseridas || []);
      
    } catch (error) {
      console.error("Erro ao criar dados financeiros:", error);
      toast.error("Não foi possível criar os dados financeiros");
    }
  }

  async function salvarDadosFinanceiros() {
    try {
      setSalvando(true);
      
      if (!dadosFinanceiros) return;
      
      // Atualizar dados financeiros
      const { error } = await supabase
        .from("dados_financeiros")
        .update({
          forma_pagamento: formaPagamento,
          quantidade_parcelas: novaQuantidadeParcelas,
          dados_confirmados: true,
          fonte: "misto",
          ultima_atualizacao: new Date().toISOString()
        })
        .eq("id", dadosFinanceiros.id);
        
      if (error) throw error;
      
      // Atualizar parcelas
      for (const parcela of parcelas) {
        const { error: erroParcela } = await supabase
          .from("parcelas_pagamento")
          .update({
            valor: parcela.valor,
            data_vencimento: parcela.data_vencimento,
            data_pagamento: parcela.data_pagamento,
            status: parcela.status
          })
          .eq("id", parcela.id);
          
        if (erroParcela) throw erroParcela;
      }
      
      toast.success("Dados financeiros salvos com sucesso");
      
      // Recarregar dados
      carregarDadosFinanceiros();
      setEditando(false);
    } catch (error) {
      console.error("Erro ao salvar dados financeiros:", error);
      toast.error("Não foi possível salvar os dados financeiros");
    } finally {
      setSalvando(false);
    }
  }

  function atualizarParcela(id: string, campo: keyof Parcela, valor: any) {
    setParcelas(prev => prev.map(parcela => 
      parcela.id === id 
        ? { ...parcela, [campo]: valor } 
        : parcela
    ));
  }

  function adicionarParcela() {
    if (!dadosFinanceiros) return;
    
    // Encontrar a última parcela para calcular a próxima data de vencimento
    const ultimaParcela = [...parcelas].sort((a, b) => b.numero_parcela - a.numero_parcela)[0];
    
    let dataVencimento = null;
    if (ultimaParcela?.data_vencimento) {
      const dataUltima = new Date(ultimaParcela.data_vencimento);
      const dataProxima = new Date(dataUltima);
      dataProxima.setDate(dataUltima.getDate() + 30);
      dataVencimento = dataProxima.toISOString().split("T")[0];
    }
    
    const novaParcela: Partial<Parcela> = {
      dados_financeiros_id: dadosFinanceiros.id,
      numero_parcela: ultimaParcela ? ultimaParcela.numero_parcela + 1 : 1,
      valor: dadosFinanceiros.valor_total / (parcelas.length + 1),
      data_vencimento: dataVencimento,
      status: "pendente"
    };
    
    // Adicionar parcela no banco de dados
    supabase
      .from("parcelas_pagamento")
      .insert(novaParcela)
      .select("*")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao adicionar parcela:", error);
          toast.error("Não foi possível adicionar a parcela");
          return;
        }
        
        // Adicionar ao estado
        setParcelas(prev => [...prev, data]);
        
        // Atualizar quantidade de parcelas nos dados financeiros
        setNovaQuantidadeParcelas(parcelas.length + 1);
        supabase
          .from("dados_financeiros")
          .update({ quantidade_parcelas: parcelas.length + 1 })
          .eq("id", dadosFinanceiros.id);
      });
  }

  function removerParcela(id: string) {
    if (!dadosFinanceiros) return;
    
    // Remover parcela do banco de dados
    supabase
      .from("parcelas_pagamento")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.error("Erro ao remover parcela:", error);
          toast.error("Não foi possível remover a parcela");
          return;
        }
        
        // Remover do estado
        setParcelas(prev => prev.filter(p => p.id !== id));
        
        // Atualizar quantidade de parcelas nos dados financeiros
        setNovaQuantidadeParcelas(parcelas.length - 1);
        supabase
          .from("dados_financeiros")
          .update({ quantidade_parcelas: parcelas.length - 1 })
          .eq("id", dadosFinanceiros.id);
      });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "pendente":
        return <Badge className="bg-blue-500">Pendente</Badge>;
      case "atrasado":
        return <Badge className="bg-red-500">Atrasado</Badge>;
      case "cancelado":
        return <Badge className="bg-gray-500">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  }

  // Se não for para usar a gestão financeira, não exibir nada
  if (!usarGestaoFinanceira) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-md font-medium">
          Informações de Pagamento
          {dadosFinanceiros && (
            <Badge variant="outline" className="ml-2">
              {dadosFinanceiros.quantidade_parcelas}x de R$ {(dadosFinanceiros.valor_total / dadosFinanceiros.quantidade_parcelas).toFixed(2)}
            </Badge>
          )}
        </CardTitle>
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
                <>
                  <div className="space-y-4">
                    {/* Cabeçalho com dados gerais */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="forma-pagamento">Forma de Pagamento</Label>
                        {editando ? (
                          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                            <SelectTrigger id="forma-pagamento">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boleto">Boleto Bancário</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="transferencia">Transferência</SelectItem>
                              <SelectItem value="debito automatico">Débito Automático</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-2 border rounded-md text-sm">
                            {formaPagamento || "Não informado"}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="parcelas">Quantidade de Parcelas</Label>
                        <div className="p-2 border rounded-md text-sm">
                          {novaQuantidadeParcelas || 0}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="valor-total">Valor Total</Label>
                        <div className="p-2 border rounded-md text-sm">
                          R$ {dadosFinanceiros?.valor_total.toFixed(2) || "0.00"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Tabela de parcelas */}
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Parcela</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Valor (R$)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-20 text-center">Pago</TableHead>
                            {editando && <TableHead className="w-16">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelas.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={editando ? 6 : 5} className="text-center py-4 italic text-gray-500">
                                Nenhuma parcela cadastrada
                              </TableCell>
                            </TableRow>
                          ) : (
                            parcelas.map(parcela => (
                              <TableRow key={parcela.id}>
                                <TableCell>{parcela.numero_parcela}</TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                          {parcela.data_vencimento ? format(new Date(parcela.data_vencimento), "dd/MM/yyyy") : "Selecionar data"}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={parcela.data_vencimento ? new Date(parcela.data_vencimento) : undefined}
                                          onSelect={date => atualizarParcela(parcela.id, "data_vencimento", date ? format(date, "yyyy-MM-dd") : null)}
                                          locale={ptBR}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    parcela.data_vencimento ? format(new Date(parcela.data_vencimento), "dd/MM/yyyy") : "Não definido"
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Input 
                                      type="number" 
                                      value={parcela.valor} 
                                      onChange={e => atualizarParcela(parcela.id, "valor", parseFloat(e.target.value) || 0)}
                                      className="w-24" 
                                      step="0.01"
                                    />
                                  ) : (
                                    `R$ ${parcela.valor.toFixed(2)}`
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editando ? (
                                    <Select value={parcela.status} onValueChange={v => atualizarParcela(parcela.id, "status", v)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="pago">Pago</SelectItem>
                                        <SelectItem value="atrasado">Atrasado</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    getStatusBadge(parcela.status)
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="sr-only peer"
                                      checked={parcela.status === "pago"}
                                      onChange={async () => {
                                        const novoStatus = parcela.status === "pago" ? "pendente" : "pago";
                                        // Atualizar status localmente
                                        atualizarParcela(parcela.id, "status", novoStatus);
                                        // Atualizar no banco de dados
                                        const dataPagamento = novoStatus === "pago" ? new Date().toISOString().split("T")[0] : null;
                                        atualizarParcela(parcela.id, "data_pagamento", dataPagamento);
                                        
                                        try {
                                          const { error } = await supabase
                                            .from("parcelas_pagamento")
                                            .update({ 
                                              status: novoStatus,
                                              data_pagamento: dataPagamento
                                            })
                                            .eq("id", parcela.id);
                                            
                                          if (error) {
                                            console.error("Erro ao atualizar status da parcela:", error);
                                            toast.error("Não foi possível atualizar o status da parcela");
                                            // Reverter mudança local em caso de erro
                                            atualizarParcela(parcela.id, "status", parcela.status);
                                            atualizarParcela(parcela.id, "data_pagamento", parcela.data_pagamento);
                                          } else {
                                            toast.success(`Parcela ${novoStatus === "pago" ? "marcada como paga" : "marcada como pendente"}`);
                                          }
                                        } catch (error) {
                                          console.error("Erro na operação:", error);
                                          toast.error("Ocorreu um erro ao atualizar a parcela");
                                        }
                                      }}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                  </label>
                                </TableCell>
                                {editando && (
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => removerParcela(parcela.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Botões de ação */}
                    <div className="flex justify-between">
                      {editando ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={adicionarParcela}
                            disabled={salvando}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Parcela
                          </Button>
                          
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setEditando(false)}
                              disabled={salvando}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={salvarDadosFinanceiros}
                              disabled={salvando}
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
                        </>
                      ) : (
                        <Button
                          onClick={() => setEditando(true)}
                        >
                          Editar Pagamentos
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
} 