'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ArrowRight, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function Home() {
  const router = useRouter()
  const [isHovering, setIsHovering] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsHovering(false)
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsHovering(true)
  }

  const handleDragLeave = () => {
    setIsHovering(false)
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)

    // Simulate upload delay for effect
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In a real app, we would upload the file first.
    // For this MVP, we assume the file exists at a known path or we pass the metadata.
    // We'll use the mock data structure from the test harness.
    const mockModelId = "dbe3efdd-f567-4c28-a022-545236edc585"

    try {
      // 1. Upload Files
      const uploadRes = await api.uploadFiles(mockModelId, files)
      const uploadedFiles = uploadRes.files // expecting { filename, file_path }

      // 2. Trigger Processing with correct paths
      const fileDataList = uploadedFiles.map((f: any, index: number) => ({
        doc_id: `doc-00${index + 1}-uploaded`,
        file_path: f.file_path,
        domain: "POLICY",
        title: f.filename
      }))

      await api.processDocument(mockModelId, fileDataList)

      router.push(`/status/${mockModelId}`)
    } catch (e) {
      console.error(e)
      // Ensure we reset loading state if error, but here we might just push to status anyway for demo
      router.push(`/status/${mockModelId}`)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="z-10 w-full max-w-3xl space-y-8">
        <div className="space-y-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl"
          >
            <span className="text-emerald-500">DIQE</span> Engine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-400"
          >
            Document Intelligence Query Engine.
            <br />
            Precision answers from complex knowledge graphs.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Initialize New Analysis</CardTitle>
              <CardDescription>Upload documents to begin the extraction pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                                relative flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-300
                                ${isHovering ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"}
                            `}
              >
                <input
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
                />

                {files.length > 0 ? (
                  <div className="flex flex-col items-center space-y-2 text-emerald-400">
                    <FileText className="h-12 w-12" />
                    <p className="text-lg font-medium">{files.length} file(s) selected</p>
                    <div className="text-sm text-emerald-600/70 max-h-20 overflow-y-auto px-4 text-center">
                      {files.map(f => f.name).join(", ")}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-slate-400">
                    <Upload className="h-10 w-10 mb-2" />
                    <p className="font-medium">Drag & drop or click to upload</p>
                    <p className="text-xs text-slate-500">PDF, DOCX, PPTX supported</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2 text-slate-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Secure Graph Encryption</span>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                  className="w-40"
                >
                  {isUploading ? "Processing..." : (
                    <>
                      Start Engine <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}
