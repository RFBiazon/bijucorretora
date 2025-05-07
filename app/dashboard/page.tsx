"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedElement } from "@/components/AnimatedElement"
import { supabase } from "@/lib/supabase"
import { formatarValorMonetario, normalizarProposta } from "@/lib/utils/normalize"
import { Overview } from "@/components/dashboard/overview"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import PageTransition from "@/components/PageTransition"

export default function DashboardPage() {
  const [totalPropostas, setTotalPropostas] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPropostas()
  }, [])

  const fetchPropostas = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("ocr_processamento")
        .select("*")
        .order("criado_em", { ascending: false })

      if (error) throw error

      setTotalPropostas(data?.length || 0)
    } catch (error) {
      console.error("Erro ao buscar propostas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container mx-auto p-4">
          <AnimatedElement index={0}>
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          </AnimatedElement>

          <AnimatedElement index={1}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-black dark:bg-black border border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Propostas
                  </CardTitle>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="h-4 w-4 text-muted-foreground"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPropostas}</div>
                  <p className="text-xs text-muted-foreground">
                    Total de propostas processadas
                  </p>
                </CardContent>
              </Card>
            </div>
          </AnimatedElement>

          <AnimatedElement index={2}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
              <Card className="col-span-4 bg-black dark:bg-black border border-gray-800">
                <CardHeader>
                  <CardTitle>Visão Geral</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  <Overview />
                </CardContent>
              </Card>
              <Card className="col-span-3 bg-black dark:bg-black border border-gray-800">
                <CardHeader>
                  <CardTitle>Propostas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
          </AnimatedElement>
        </div>
      </PageTransition>
    </ProtectedRoute>
  )
} 