"use client"

import { useEffect, useRef } from "react"
import { BarChartIcon } from "lucide-react"

interface Cotacao {
  id: string
  nome: string
  data: string
  texto: string
  seguradora?: string
  valor?: number
}

interface GraficoCotacoesProps {
  cotacoes: Cotacao[]
}

export function GraficoCotacoes({ cotacoes }: GraficoCotacoesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || cotacoes.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Limpar o canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Configurações do gráfico
    const width = canvasRef.current.width
    const height = canvasRef.current.height
    const padding = 40
    const barWidth = (width - padding * 2) / cotacoes.length - 10
    const maxValue = Math.max(...cotacoes.map((c) => c.valor || 0)) * 1.1

    // Desenhar eixos
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.strokeStyle = "#ccc"
    ctx.stroke()

    // Desenhar barras
    cotacoes.forEach((cotacao, index) => {
      const x = padding + index * (barWidth + 10)
      const barHeight = ((cotacao.valor || 0) / maxValue) * (height - padding * 2)
      const y = height - padding - barHeight

      // Desenhar barra
      ctx.fillStyle = "#3b82f6"
      ctx.fillRect(x, y, barWidth, barHeight)

      // Adicionar valor
      ctx.fillStyle = "#000"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(
        `R$${(cotacao.valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
        x + barWidth / 2,
        y - 5,
      )

      // Adicionar nome abreviado
      const shortName = cotacao.nome.length > 10 ? cotacao.nome.substring(0, 7) + "..." : cotacao.nome
      ctx.fillText(shortName, x + barWidth / 2, height - padding + 15)
    })

    // Desenhar linhas de grade horizontais
    const gridLines = 5
    for (let i = 0; i <= gridLines; i++) {
      const y = height - padding - (i / gridLines) * (height - padding * 2)
      const value = (i / gridLines) * maxValue

      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.strokeStyle = "#eee"
      ctx.stroke()

      ctx.fillStyle = "#666"
      ctx.textAlign = "right"
      ctx.fillText(`R$${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, padding - 5, y + 3)
    }
  }, [cotacoes])

  if (cotacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <BarChartIcon className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Sem dados para exibir</p>
      </div>
    )
  }

  return <canvas ref={canvasRef} width={600} height={300} className="w-full h-full" />
}
