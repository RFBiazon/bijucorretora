"use client"

import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import React from "react"

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 1 }}
        className="flex-1"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  )
} 