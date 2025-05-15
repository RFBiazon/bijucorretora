"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { formatarValorMonetario, normalizarProposta } from "@/lib/utils/normalize"
import { formatarNomeSeguradora } from "@/utils/formatters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { mascararCPF } from "@/utils/mascarar"

export function RecentSales() {
  const [vendas, setVendas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchVendas()
  }, [])

  const fetchVendas = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(5)

      if (error) throw error

      const vendasNormalizadas = data.map(proposta => normalizarProposta(proposta))
      setVendas(vendasNormalizadas)
    } catch (error) {
      console.error("Erro ao buscar vendas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {vendas.map((venda) => (
        <div key={venda.id} className="flex items-center justify-between border-b border-gray-800 pb-4 last:border-b-0">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{venda.segurado.nome}</p>
            <p className="text-xs text-muted-foreground">CPF: {mascararCPF(venda.segurado.cpf)}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(venda.criado_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="font-medium">
            {formatarValorMonetario(venda.valores.preco_total).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>
      ))}
    </div>
  )
} 