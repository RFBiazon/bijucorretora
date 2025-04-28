import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, FileText } from "lucide-react"
import { ClipboardDocumentCheckIcon } from "@/components/icons"

export default function Home() {
  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Bem-vindo à Biju Corretora</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sistema de processamento de cotações de seguro automático
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Car className="h-8 w-8 mb-2" />
            <CardTitle>Cotações</CardTitle>
            <CardDescription>Processe cotações de seguro a partir de PDFs</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Faça upload de arquivos PDF de cotações e extraia automaticamente as informações relevantes.</p>
          </CardContent>
          <CardFooter>
            <Link href="/cotacao" className="w-full">
              <Button className="w-full">Acessar Cotações</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <ClipboardDocumentCheckIcon className="h-8 w-8 mb-2" />
            <CardTitle>Propostas/Apólices</CardTitle>
            <CardDescription>Cadastre e gerencie propostas</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Envie PDFs de propostas e apólices para processamento automático e gerencie os dados extraídos.</p>
          </CardContent>
          <CardFooter>
            <Link href="/propostas" className="w-full">
              <Button className="w-full" variant="outline">
                Acessar Propostas
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 mb-2" />
            <CardTitle>Relatórios</CardTitle>
            <CardDescription>Visualize e exporte relatórios</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Acesse relatórios detalhados sobre as cotações processadas e exporte-os em diferentes formatos.</p>
          </CardContent>
          <CardFooter>
            <Link href="/relatorios" className="w-full">
              <Button className="w-full" variant="outline">
                Acessar Relatórios
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
