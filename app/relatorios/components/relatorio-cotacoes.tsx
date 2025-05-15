"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Cotacao {
  id: string
  nome: string
  data: string
  texto: string
  seguradora?: string
  valor?: number
}

interface RelatorioCotacoesProps {
  cotacoes: Cotacao[]
}

export function RelatorioCotacoes({ cotacoes }: RelatorioCotacoesProps) {
  if (cotacoes.length === 0) {
    return <div className="text-center py-4 text-muted-foreground">Nenhuma cotação encontrada</div>
  }

  const formatTimeAgo = (dateStr: string) => {
    const parts = dateStr.split("/")
    if (parts.length !== 3) return dateStr

    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Segurado</TableHead>
            <TableHead>Quando</TableHead>
            <TableHead>Seguradora</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cotacoes.map((cotacao) => (
            <TableRow key={cotacao.id}>
              <TableCell className="font-medium">{cotacao.nome}</TableCell>
              <TableCell>{formatTimeAgo(cotacao.data)}</TableCell>
              <TableCell>{cotacao.seguradora}</TableCell>
              <TableCell className="text-right">
                R$ {cotacao.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
