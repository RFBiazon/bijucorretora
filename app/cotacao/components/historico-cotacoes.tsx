"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Trash2 } from "lucide-react"

interface Cotacao {
  id: string
  nome: string
  nomeArquivo?: string
  data: string
  texto: string
}

interface HistoricoCotacoesProps {
  onSelect: (cotacao: Cotacao) => void
}

export function HistoricoCotacoes({ onSelect }: HistoricoCotacoesProps) {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])

  // Carregar cotações do localStorage ao montar o componente
  useEffect(() => {
    const storedCotacoes = localStorage.getItem("cotacoes")
    if (storedCotacoes) {
      setCotacoes(JSON.parse(storedCotacoes))
    }
  }, [])

  // Salvar cotações no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("cotacoes", JSON.stringify(cotacoes))
  }, [cotacoes])

  const handleDelete = (id: string) => {
    setCotacoes(cotacoes.filter((cotacao) => cotacao.id !== id))
  }

  if (cotacoes.length === 0) {
    return <div className="text-center py-8 text-gray-500">Nenhuma cotação no histórico</div>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Segurado</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cotacoes.map((cotacao) => (
            <TableRow key={cotacao.id}>
              <TableCell className="font-medium">{cotacao.nome}</TableCell>
              <TableCell>{cotacao.data}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onSelect(cotacao)}>
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(cotacao.id)}>
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
