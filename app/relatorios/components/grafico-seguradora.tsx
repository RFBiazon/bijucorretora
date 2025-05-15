"use client"

import { useEffect, useRef } from "react"
import { PieChartIcon } from "lucide-react"

interface Cotacao {
  id: string
  nome: string
  data: string
  texto: string
  seguradora?: string
  valor?: number
}

interface GraficoSeguradoraProps {
  cotacoes: Cotacao[]
}

export function GraficoSeguradora({ cotacoes }: GraficoSeguradoraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || cotacoes.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Limpar o canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Agrupar cotações por seguradora
    const seguradoraCount: Record<string, number> = {}
    cotacoes.forEach((cotacao) => {
      const seguradora = cotacao.seguradora || "Desconhecida"
      seguradoraCount[seguradora] = (seguradoraCount[seguradora] || 0) + 1
    })

    // Preparar dados para o gráfico
    const data = Object.entries(seguradoraCount).map(([seguradora, count]) => ({
      seguradora,
      count,
      percentage: (count / cotacoes.length) * 100,
    }))

    // Cores para o gráfico
    const colors = [
      "#3b82f6", // blue
      "#ef4444", // red
      "#10b981", // green
      "#f59e0b", // amber
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#6366f1", // indigo
      "#14b8a6", // teal
    ]

    // Desenhar gráfico de pizza
    const centerX = canvasRef.current.width / 2
    const centerY = canvasRef.current.height / 2
    const radius = Math.min(centerX, centerY) - 60

    let startAngle = 0
    data.forEach((item, index) => {
      const sliceAngle = (item.count / cotacoes.length) * 2 * Math.PI

      // Desenhar fatia
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()

      // Calcular posição do texto
      const midAngle = startAngle + sliceAngle / 2
      const textRadius = radius * 0.7
      const textX = centerX + Math.cos(midAngle) * textRadius
      const textY = centerY + Math.sin(midAngle) * textRadius

      // Adicionar percentual
      if (item.percentage >= 5) {
        // Só mostrar texto se a fatia for grande o suficiente
        ctx.fillStyle = "#fff"
        ctx.font = "bold 12px Arial"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(`${Math.round(item.percentage)}%`, textX, textY)
      }

      startAngle += sliceAngle
    })

    // Desenhar legenda
    const legendX = canvasRef.current.width - 150
    const legendY = 30

    data.forEach((item, index) => {
      const y = legendY + index * 20

      // Desenhar quadrado colorido
      ctx.fillStyle = colors[index % colors.length]
      ctx.fillRect(legendX, y, 15, 15)

      // Adicionar texto
      ctx.fillStyle = "#000"
      ctx.font = "12px Arial"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(`${item.seguradora} (${item.count})`, legendX + 20, y + 7)
    })
  }, [cotacoes])

  if (cotacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <PieChartIcon className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Sem dados para exibir</p>
      </div>
    )
  }

  return <canvas ref={canvasRef} width={600} height={300} className="w-full h-full" />
}
