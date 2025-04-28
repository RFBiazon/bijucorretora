"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Car, Home, FileText, Menu, X, Sun, Moon } from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"

export function Navbar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Após a montagem do componente, podemos renderizar o botão de tema
  useEffect(() => {
    setMounted(true)
  }, [])

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
      href: "/propostas",
      label: "Propostas",
      icon: FileText,
      active: pathname === "/propostas" || pathname.startsWith("/propostas/"),
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: FileText,
      active: pathname === "/relatorios",
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="font-bold text-xl flex items-center">
            Biju Corretora
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
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

        <div className="flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}

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
          </nav>
        </div>
      )}
    </header>
  )
}
