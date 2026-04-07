'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

const steps = [
    { id: 1, title: "Document Upload", description: "Securely transferring file to processing core." },
    { id: 2, title: "Text Extraction", description: "Parsing PDF/Docx structure and metadata." },
    { id: 3, title: "Knowledge Construction", description: "Building GraphRAG nodes and relationships." },
    { id: 4, title: "Indexing", description: "Optimizing vectors for high-precision retrieval." },
]

export default function StatusPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [progress, setProgress] = useState(0)
    const [statusMessage, setStatusMessage] = useState('Checking pipeline status...')
    const [isComplete, setIsComplete] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let timer: NodeJS.Timeout

        const pollStatus = async () => {
            try {
                const data = await api.getStatus(id)
                console.log("Status update:", data)

                if (data.progress !== undefined) setProgress(data.progress)
                if (data.message) setStatusMessage(data.message)

                if (data.status === 'completed') {
                    setCurrentStep(4)
                    setIsComplete(true)
                } else if (data.status === 'indexing') {
                    // Map progress to steps 1-4 for visual representation
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
                console.error("Polling error:", err)
                setError("Failed to fetch status updates. Retrying...")
                timer = setTimeout(pollStatus, 5000)
            }
        }

        pollStatus()

        return () => clearTimeout(timer)
    }, [id])


    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            <Card className="z-10 w-full max-w-2xl border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-2xl">
                        <Loader2 className={`h-6 w-6 text-emerald-500 ${!isComplete && 'animate-spin'}`} />
                        <span>Processing Document</span>
                    </CardTitle>
                    <CardDescription>
                        Tracking pipeline status for Batch ID: <span className="font-mono text-emerald-400">{id.slice(0, 8)}...</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
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
