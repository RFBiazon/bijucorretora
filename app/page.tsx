import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, FileText } from "lucide-react";
import { ClipboardDocumentCheckIcon } from "@/components/icons";
import PageTransition from "@/components/PageTransition";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import MotionDiv from "@/components/MotionDiv";

export default function Home() {
  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="container py-12">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold tracking-tight mb-4">Bem-vindo à Biju Corretora</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sistema de processamento de cotações de seguro automático
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {[0, 1, 2].map((idx) => (
              <MotionDiv
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 + idx * 0.12 }}
              >
                {idx === 0 && (
                  <Card className="bg-black dark:bg-black border border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader>
                      <Car className="h-8 w-8 mb-2 text-primary" />
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
                )}
                {idx === 1 && (
                  <Card className="bg-black dark:bg-black border border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader>
                      <ClipboardDocumentCheckIcon className="h-8 w-8 mb-2 text-primary" />
                      <CardTitle>Propostas/Apólices</CardTitle>
                      <CardDescription>Cadastre e gerencie propostas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Envie PDFs de propostas e apólices para processamento automático e gerencie os dados extraídos.</p>
                    </CardContent>
                    <CardFooter>
                      <Link href="/documentos" className="w-full">
                        <Button className="w-full" variant="outline">
                          Acessar Documentos
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                )}
                {idx === 2 && (
                  <Card className="bg-black dark:bg-black border border-gray-800 hover:border-gray-700 transition-colors">
                    <CardHeader>
                      <FileText className="h-8 w-8 mb-2 text-primary" />
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
                )}
              </MotionDiv>
            ))}
          </MotionDiv>
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
}
