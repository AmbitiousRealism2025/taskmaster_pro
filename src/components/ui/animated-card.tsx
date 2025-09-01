"use client"

import { motion } from "framer-motion"
import { Card, CardProps } from "./card"
import { slideUp, cardHover } from "@/lib/animations"

interface AnimatedCardProps extends CardProps {
  index?: number
}

export function AnimatedCard({ index = 0, children, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        ...slideUp,
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.4,
            delay: index * 0.1
          }
        }
      }}
      whileHover={cardHover.hover}
    >
      <Card {...props}>
        {children}
      </Card>
    </motion.div>
  )
}