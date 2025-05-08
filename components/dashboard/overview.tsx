"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { formatarValorMonetario, normalizarProposta } from "@/lib/utils/normalize"
import { formatarNomeSeguradora } from "@/utils/formatters"
import { mascararCPF } from "@/utils/mascarar"

export function Overview() {
  const [dados, setDados] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDados()
  }, [])

  const fetchDados = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(5)

      if (error) throw error

      const dadosNormalizados = data.map(proposta => normalizarProposta(proposta))
      setDados(dadosNormalizados)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {dados.map((item) => (
        <div key={item.id} className="flex items-center justify-between border-b border-gray-800 pb-4 last:border-b-0">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{item.segurado.nome}</p>
            <p className="text-xs text-muted-foreground">CPF: {mascararCPF(item.segurado.cpf)}</p>
            <p className="text-sm text-muted-foreground">{formatarNomeSeguradora(item.proposta.cia_seguradora)}</p>
          </div>
          <div className="font-medium">
            {formatarValorMonetario(item.valores.preco_total).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>
      ))}
    </div>
  )
} 