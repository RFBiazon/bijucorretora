"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Car, Home, FileText, Menu, X, LogOut, CreditCard } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export function Navbar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const routes = [
    {
      href: "/",
      label: "Início",
      icon: Home,
      active: pathname === "/",
    },
    {
      href: "/cotacao",
      label: "Cotações",
      icon: Car,
      active: pathname === "/cotacao",
    },
    {
      href: "/documentos",
      label: "Documentos",
      icon: FileText,
      active: pathname === "/documentos" || pathname.startsWith("/documentos/"),
    },
    {
      href: "/administracao/pagamentos",
      label: "Gestão de Pagamentos",
      icon: CreditCard,
      active: pathname === "/administracao/pagamentos",
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: FileText,
      active: pathname === "/relatorios",
    },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo à esquerda */}
        <div className="flex items-center gap-2">
          <Link href="/" className="font-bold text-xl flex items-center">
            Biju Corretora
          </Link>
        </div>

        {/* Menu centralizado */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-primary",
                route.active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <route.icon className="mr-2 h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>

        {/* Botão de logout no canto direito */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="h-5 w-5" />
            </Button>
          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container py-4 flex flex-col gap-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary p-2 rounded-md",
                  route.active ? "bg-muted text-primary" : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Link>
            ))}
            {/* Botão de logout no menu mobile */}
            <Button variant="ghost" className="mt-2 flex items-center gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
