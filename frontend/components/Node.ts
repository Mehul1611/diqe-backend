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

export default Node
