"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"

interface ProgressIndicatorProps {
  isLoading: boolean
  onComplete?: () => void
}

export function ProgressIndicator({ isLoading, onComplete }: ProgressIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setProgress(0)
      return
    }

    // Simular progresso durante o carregamento
    setProgress(10)

    const timer1 = setTimeout(() => setProgress(30), 500)
    const timer2 = setTimeout(() => setProgress(60), 1500)
    const timer3 = setTimeout(() => setProgress(80), 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isLoading])

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      onComplete()
    }
  }, [progress, onComplete])

  // Quando o carregamento terminar, complete o progresso
  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100)
    }
  }, [isLoading, progress])

  if (!isLoading && progress === 0) {
    return null
  }

  return (
    <div className="w-full space-y-2">
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-center text-gray-500">
        {progress < 100 ? "Processando PDF..." : "Processamento concluído!"}
      </p>
    </div>
  )
}
