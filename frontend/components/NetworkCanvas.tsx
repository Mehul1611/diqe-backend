import React, { useEffect, useRef } from 'react'

const NUM_NODES = 40
const MAX_DISTANCE = 250

class Node {
  originX: number
  originY: number
  x: number
  y: number
  timeOffset: number
  radius: number
  jitterRadius: number
  speed: number

  constructor(w: number, h: number) {
    this.originX = Math.random() * w
    this.originY = Math.random() * h
    this.x = this.originX
    this.y = this.originY
    this.timeOffset = Math.random() * 10000
    this.radius = Math.random() * 2 + 1.5
    this.jitterRadius = Math.random() * 40 + 20
    this.speed = Math.random() * 0.001 + 0.0005
  }

  update(time: number) {
    const t = time * this.speed + this.timeOffset
    this.x = this.originX + Math.sin(t) * Math.cos(t * 0.5) * this.jitterRadius
    this.y = this.originY + Math.cos(t * 0.8) * Math.sin(t * 0.3) * this.jitterRadius
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(16, 185, 129, 1)'
    ctx.shadowBlur = 20
    ctx.shadowColor = 'rgba(16, 185, 129, 0.9)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(167, 243, 208, 0.95)'
    ctx.fill()

    ctx.shadowBlur = 0
  }
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    const nodes: Node[] = []
    for (let i = 0; i < NUM_NODES; i++) {
      nodes.push(new Node(canvas.width, canvas.height))
    }

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 1.5
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < MAX_DISTANCE) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            const alpha = 1 - Math.pow(dist / MAX_DISTANCE, 2)
            ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 0.55})`
            ctx.stroke()
          }
        }
      }

      nodes.forEach((node) => {
        node.update(time)
        node.draw(ctx)
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-950">
      <div className="absolute left-1/2 top-1/2 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-700/10 blur-[120px]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
