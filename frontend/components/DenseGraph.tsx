'use client'
import React from 'react'
import { motion } from 'framer-motion'

export default function DenseGraph() {
  const nodes = [
    { id: 0, x: 50, y: 50, r: 5 },
    { id: 1, x: 50, y: 15, r: 4 },
    { id: 2, x: 80, y: 32, r: 4 },
    { id: 3, x: 80, y: 68, r: 4 },
    { id: 4, x: 50, y: 85, r: 4 },
    { id: 5, x: 20, y: 68, r: 4 },
    { id: 6, x: 20, y: 32, r: 4 },
    { id: 7, x: 38, y: 32, r: 3 },
    { id: 8, x: 62, y: 32, r: 3 },
    { id: 9, x: 70, y: 50, r: 3 },
    { id: 10, x: 62, y: 68, r: 3 },
    { id: 11, x: 38, y: 68, r: 3 },
    { id: 12, x: 30, y: 50, r: 3 },
  ]

  const edges = [
    { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 0, target: 3 },
    { source: 0, target: 4 }, { source: 0, target: 5 }, { source: 0, target: 6 },
    { source: 1, target: 2 }, { source: 2, target: 3 }, { source: 3, target: 4 },
    { source: 4, target: 5 }, { source: 5, target: 6 }, { source: 6, target: 1 },
    { source: 1, target: 7 }, { source: 1, target: 8 }, { source: 2, target: 8 },
    { source: 2, target: 9 }, { source: 3, target: 9 }, { source: 3, target: 10 },
    { source: 4, target: 10 }, { source: 4, target: 11 }, { source: 5, target: 11 },
    { source: 5, target: 12 }, { source: 6, target: 12 }, { source: 6, target: 7 },
    { source: 0, target: 7 }, { source: 0, target: 8 }, { source: 0, target: 9 },
    { source: 0, target: 10 }, { source: 0, target: 11 }, { source: 0, target: 12 },
    { source: 7, target: 8 }, { source: 8, target: 9 }, { source: 9, target: 10 },
    { source: 10, target: 11 }, { source: 11, target: 12 }, { source: 12, target: 7 }
  ]

  const PACKET_COUNT = 6
  const colors = ["#00ffcc", "#4ade80", "#60a5fa", "#facc15"]

  return (
    <div className="w-full h-full flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">
      
      <div className="absolute inset-0 bg-emerald-500/20 blur-[80px]" />
      
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible z-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
        
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((edge, i) => {
          const source = nodes[edge.source]
          const target = nodes[edge.target]
          return (
            <motion.line
              key={`edge-${i}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#10b981"
              strokeWidth="0.5"
              strokeOpacity="0.35"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: i * 0.02 }}
            />
          )
        })}

        <motion.circle
          cx={nodes[0].x}
          cy={nodes[0].y}
          r={nodes[0].r}
          fill="none"
          stroke="#10b981"
          strokeWidth="0.8"
          animate={{ scale: [1, 3.5], opacity: [0.8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
        />

        {nodes.map((node, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={i === 0 ? "#10b981" : "#34d399"}
            filter="url(#nodeGlow)"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            whileHover={{ scale: 1.3, fill: "#4ade80" }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
          />
        ))}

        {Array.from({ length: PACKET_COUNT }).map((_, i) => {
          const edge = edges[Math.floor(Math.random() * edges.length)]
          const source = nodes[edge.source]
          const target = nodes[edge.target]

          return (
            <motion.g
              key={`packet-${i}`}
              animate={{
                x: [source.x, target.x],
                y: [source.y, target.y],
                rotate: [0, 180],
                scale: [0.8, 1, 0.8],
                opacity: [0, 0.7, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 3,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 5,
                repeatDelay: Math.random() * 3
              }}
            >
              <rect
                x={-2.5}
                y={-3}
                width="5"
                height="6"
                rx="1"
                fill={colors[i % colors.length]}
              />

              <polygon
                points="0,-3 2,-3 2,-1"
                fill="#ffffff"
                opacity="0.8"
              />
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}