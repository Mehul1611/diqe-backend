'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import NetworkCanvas from '@/components/NetworkCanvas'

const steps = [
    { id: 1, title: "Document upload", description: "Receiving files in the processing workspace." },
    { id: 2, title: "Text extraction", description: "Parsing PDF, DOCX, and PPTX content." },
    { id: 3, title: "RAG indexing", description: "Chunking, embeddings, and vector store for retrieval." },
    { id: 4, title: "Index ready", description: "Corpus indexed; opening the query console." },
]

function useElapsedTime(running: boolean) {
    const [elapsed, setElapsed] = useState(0)
    const startRef = useRef(Date.now())
    useEffect(() => {
        if (!running) return
        startRef.current = Date.now()
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
        return () => clearInterval(id)
    }, [running])
    return elapsed
}

function formatElapsed(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [progress, setProgress] = useState(0)
    const [statusMessage, setStatusMessage] = useState('Checking pipeline status...')
    const [isComplete, setIsComplete] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastStatusChangeAt, setLastStatusChangeAt] = useState(Date.now())
    const lastStatusRef = useRef<string>('')
    const elapsed = useElapsedTime(!isComplete)
    const isStuck = !isComplete && elapsed > 90 && (Date.now() - lastStatusChangeAt) > 90_000

    useEffect(() => {
        let timer: NodeJS.Timeout

        const pollStatus = async () => {
            try {
                const data = await api.getStatus(id)
                console.log("[RAG pipeline] status:", data)

                if (data.progress !== undefined) setProgress(data.progress)
                if (data.message) setStatusMessage(data.message)

                if (data.status !== lastStatusRef.current) {
                    lastStatusRef.current = data.status
                    setLastStatusChangeAt(Date.now())
                }

                if (data.status === 'completed') {
                    setCurrentStep(4)
                    setIsComplete(true)
                    router.replace(`/console/${id}`)
                } else if (data.status === 'indexing') {
                    if (data.progress < 75) setCurrentStep(2)
                    else if (data.progress < 95) setCurrentStep(3)
                    else setCurrentStep(4)
                    setIsComplete(false)
                } else if (data.status === 'construction') {
                    setCurrentStep(2)
                    setIsComplete(false)
                } else if (data.status === 'pending') {
                    setCurrentStep(1)
                    setIsComplete(false)
                }

                if (data.status !== 'completed' && data.status !== 'error') {
                    timer = setTimeout(pollStatus, 3000)
                }
            } catch (err) {
                console.error("[RAG pipeline] poll error:", err)
                setError("Failed to fetch status updates. Retrying...")
                timer = setTimeout(pollStatus, 5000)
            }
        }

        pollStatus()

        return () => clearTimeout(timer)
    }, [id])


    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
            <NetworkCanvas />
            <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/80 via-transparent to-emerald-950/15"
                aria-hidden
            />

            <Card className="relative z-10 w-full max-w-2xl border-slate-800 bg-slate-900/85 shadow-[0_0_60px_rgba(16,185,129,0.06)] backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-2xl">
                        <div className="flex items-center space-x-2">
                            <Loader2 className={`h-6 w-6 text-emerald-500 ${!isComplete && 'animate-spin'}`} />
                            <span>Indexing</span>
                        </div>
                        {!isComplete && (
                            <div className="flex items-center gap-1.5 text-sm font-normal text-slate-400">
                                <Clock className="h-4 w-4" />
                                <span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
                            </div>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Indexing for model <span className="font-mono text-emerald-400">{id.slice(0, 8)}…</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {!isComplete && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300/80">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>
                                Initial setup can take <span className="font-semibold text-emerald-300">4–5 minutes</span> — please keep this tab open until the process is complete.
                            </span>
                        </div>
                    )}

                    {isStuck && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300/80">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                            <span>
                                Pipeline is still running — this is normal for larger documents.
                            </span>
                        </div>
                    )}

                    <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 font-mono text-xs text-slate-400">
                        <span className="text-slate-500">Log: </span>
                        {statusMessage}
                    </p>
                    <div className="space-y-6">
                        {steps.map((step) => {
                            const isCompleted = currentStep > step.id || (currentStep === step.id && isComplete)
                            const isCurrent = currentStep === step.id && !isComplete

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "flex items-start space-x-4 transition-colors",
                                        isCurrent ? "text-white" : isCompleted ? "text-emerald-400" : "text-slate-600"
                                    )}
                                >
                                    <div className="mt-1">
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-6 w-6" />
                                        ) : isCurrent ? (
                                            <div className="relative">
                                                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20"></div>
                                                <Circle className="relative h-6 w-6 animate-pulse text-emerald-500" />
                                            </div>
                                        ) : (
                                            <Circle className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">{step.title}</p>
                                        <p className="text-sm text-slate-500">{step.description}</p>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            disabled={!isComplete}
                            onClick={() => router.push(`/console/${id}`)}
                            className={cn("bg-emerald-600 hover:bg-emerald-700", !isComplete && "opacity-50")}
                        >
                            Open Query Console <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    )
}
