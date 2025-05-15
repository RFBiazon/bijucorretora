"use client"
import dynamic from "next/dynamic"
import React from "react"
import type { HTMLMotionProps } from "framer-motion"

const MotionDiv = dynamic(
  () => import("framer-motion").then((mod) => mod.motion.div),
  { ssr: false }
) as React.ComponentType<HTMLMotionProps<"div">>

export default MotionDiv 