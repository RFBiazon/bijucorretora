"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface AnimatedElementProps {
  children: ReactNode
  index?: number
  className?: string
}

export function AnimatedElement({ children, index = 0, className = "" }: AnimatedElementProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15, // Aumentado para 0.15s para dar mais espaço entre elementos
        ease: [0.4, 0, 0.2, 1], // Curva de easing mais suave
        scale: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
} 