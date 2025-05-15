import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import LayoutClient from "@/components/LayoutClient"
import { UploadQueueProvider } from "@/components/upload-queue/UploadQueueContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Biju Corretora",
  description: "Sistema de processamento de cotações de seguro",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false} disableTransitionOnChange>
          <UploadQueueProvider>
            <LayoutClient>{children}</LayoutClient>
          </UploadQueueProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
