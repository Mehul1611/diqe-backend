// Author: Mehul Sharma
// This code is for evaluation purposes only. Unauthorized use is prohibited.

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, ArrowRight, CheckCircle, ArrowLeft, X, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import NetworkCanvas from '@/components/NetworkCanvas'
import DenseGraph from '@/components/DenseGraph'

export default function Home() {
  const router = useRouter()
  const [isStarted, setIsStarted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  const closeInstructions = useCallback(() => setInstructionsOpen(false), [])

  useEffect(() => {
    if (!instructionsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeInstructions()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [instructionsOpen, closeInstructions])

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

  const isUploading = uploadStage !== 'idle'

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploadStage('uploading')

    const modelId = crypto.randomUUID()

    try {
      const uploadRes = await api.uploadFiles(modelId, files)
      const uploadedFiles = uploadRes.files

      setUploadStage('processing')

      const fileDataList = uploadedFiles.map((f: any, index: number) => ({
        doc_id: `doc-00${index + 1}-uploaded`,
        file_path: f.file_path,
        domain: "POLICY",
        title: f.filename
      }))

      await api.processDocument(modelId, fileDataList)

      router.push(`/status/${modelId}`)
    } catch (e) {
      console.error(e)
      router.push(`/status/${modelId}`)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 selection:bg-emerald-500/30 font-sans overflow-hidden">
      <style>{`
        @keyframes diqeGlow {
          0%, 100% { 
            text-shadow: 0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2); 
            filter: brightness(1) hue-rotate(0deg);
          }
          50% { 
            text-shadow: 0 0 35px rgba(16, 185, 129, 0.8), 0 0 70px rgba(16, 185, 129, 0.5); 
            filter: brightness(1.15) hue-rotate(8deg);
          }
        }
        .text-glow-fx {
          animation: diqeGlow 4s ease-in-out infinite;
        }
      `}</style>
      
      <NetworkCanvas />

      <AnimatePresence mode="wait">
        {!isStarted ? (
            <motion.div 
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-12 px-6 lg:px-12 max-w-[90rem] w-full mx-auto"
            >
              <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative w-full aspect-square lg:aspect-auto lg:h-[500px] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] bg-slate-900/40 backdrop-blur-md flex items-center justify-center group"
            >
              <DenseGraph />
              
              <div className="absolute bottom-6 left-6 flex items-center space-x-2 z-20">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-black/50 px-2 py-1 rounded backdrop-blur-md">RAG Document Intelligence</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-start text-left lg:pl-10"
            >
              <div className="mb-6">
                <h1 className="text-6xl lg:text-7xl xl:text-[90px] font-extrabold tracking-tighter text-white leading-none flex items-end">
                  <span className="relative inline-block whitespace-nowrap">
                    <span className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full"></span>
                    <span className="relative text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pr-[2px]">D</span>
                    <span className="relative text-emerald-500 text-glow-fx px-[2px]">I</span>
                    <span className="relative text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pl-[2px]">QE</span>
                  </span>
                  <span className="text-4xl lg:text-5xl xl:text-6xl text-slate-100 opacity-90 ml-6 pb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">Engine</span>
                </h1>
              </div>

              <p className="text-lg lg:text-xl xl:text-2xl text-slate-400 mb-10 font-light leading-relaxed max-w-lg">
                Document Intelligence Query Engine.
                <br />
                <span className="text-emerald-500/80 font-medium tracking-wide">Turn your documents into a searchable AI brain.</span>
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsStarted(true)}
                  className="
                    group relative inline-flex items-center justify-center gap-2.5 px-7 py-2.5 
                    font-bold text-white uppercase tracking-wider text-sm lg:text-base
                    transition-all duration-300 ease-out 
                    bg-gradient-to-br from-emerald-500 to-emerald-600 
                    rounded-full 
                    border border-emerald-300/40
                    shadow-[0_10px_20px_-4px_rgba(16,185,129,0.35),inset_0_2px_0_rgba(255,255,255,0.35)] 
                    hover:scale-[1.03] hover:shadow-[0_16px_32px_-5px_rgba(16,185,129,0.55),inset_0_2px_0_rgba(255,255,255,0.55)]
                    hover:from-emerald-400 hover:to-emerald-500
                    active:scale-[0.97] active:shadow-[0_5px_10px_-2px_rgba(16,185,129,0.5),inset_0_4px_4px_rgba(0,0,0,0.3)]
                    active:from-emerald-600 active:to-emerald-700
                    overflow-hidden
                  "
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  
                  <span className="relative z-10 drop-shadow-md">Get Started</span>
                  <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5 drop-shadow-md" />
                  
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)] transition-transform ease-out pointer-events-none">
                    <div className="relative h-full w-8 bg-white/30" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInstructionsOpen(true)}
                  className="
                    inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-sm lg:text-base
                    bg-black text-emerald-400 border border-emerald-500/50
                    shadow-[0_6px_18px_-4px_rgba(0,0,0,0.45)]
                    hover:bg-zinc-950 hover:text-emerald-300 hover:border-emerald-400/70
                    active:scale-[0.98] transition-all duration-300
                  "
                >
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden />
                  View Instructions
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            className="relative z-10 w-full max-w-3xl px-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center">
                  <span className="inline-flex">
                    <span className="text-white">D</span>
                    <span className="text-emerald-500 text-glow-fx px-[1px]">I</span>
                    <span className="text-white">QE</span>
                  </span>
                  <span className="ml-3">Workspace</span>
                </h2>
                <p className="text-slate-400">Upload documents to begin the extraction pipeline.</p>
              </div>
              <button 
                onClick={() => setIsStarted(false)}
                className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </div>

            <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl border-t-slate-700/50">
              <CardContent className="p-8">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    relative flex h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300
                    ${isHovering 
                      ? "border-emerald-500 bg-emerald-500/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]" 
                      : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"}
                  `}
                >
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
                  />

                  {files.length > 0 ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center space-y-4 text-emerald-400"
                    >
                      <div className="p-4 bg-emerald-500/20 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <FileText className="h-12 w-12" />
                      </div>
                      <p className="text-xl font-bold text-emerald-300 drop-shadow-sm">{files.length} file(s) selected</p>
                      <div className="text-sm text-emerald-400/80 max-h-24 overflow-y-auto px-6 text-center font-medium leading-relaxed">
                        {files.map(f => f.name).join(", ")}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center space-y-4 text-slate-400">
                      <div className="p-4 bg-slate-800 rounded-full transition-transform group-hover:scale-110 shadow-inner">
                        <Upload className="h-10 w-10 text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium text-slate-200">Drag & drop or click to upload</p>
                        <p className="text-sm text-slate-500 mt-1 font-medium">PDF, DOCX, PPTX supported</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-8 pt-8 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2 text-emerald-600/90 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20 shadow-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold tracking-wide">Secure document processing</span>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || isUploading}
                    className="
                      relative overflow-hidden w-48 h-12 text-md font-bold tracking-widest uppercase
                      bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 
                      active:from-emerald-600 active:to-emerald-700 text-white shadow-[0_4px_15px_rgba(16,185,129,0.3)] 
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                      border border-emerald-400/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300
                    "
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <span className="relative z-10 flex items-center justify-center">
                      {isUploading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {uploadStage === 'uploading' ? 'Uploading...' : 'Starting...'}
                        </>
                      ) : (
                        <>
                          Start Engine <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {instructionsOpen && (
          <motion.div
            key="instructions-modal"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              type="button"
              aria-label="Close instructions"
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeInstructions}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="instructions-title"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="
                relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden
                rounded-2xl border border-emerald-500/35 bg-slate-950 shadow-[0_0_60px_rgba(16,185,129,0.12)]
                text-left
              "
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-emerald-500/20 bg-slate-950/95 px-6 sm:px-8 py-3.5 backdrop-blur-md">
                <h2 id="instructions-title" className="text-base sm:text-lg font-bold text-emerald-400 flex items-center gap-2 pr-2">
                  <BookOpen className="w-5 h-5 shrink-0" aria-hidden />
                  How to Use This Model
                </h2>
                <button
                  type="button"
                  onClick={closeInstructions}
                  className="rounded-lg p-2 text-emerald-400/90 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 sm:px-8 py-6 space-y-6 text-slate-300 text-[15px] sm:text-base leading-relaxed">
                <p className="text-slate-400">
                  Model is designed to help you work with large documents easily.
                </p>

                <ul className="space-y-3 list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0" aria-hidden>•</span>
                    <span>Upload your documents and the system will process them for you.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0" aria-hidden>•</span>
                    <span>Instead of reading full documents, you can ask questions directly.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 shrink-0" aria-hidden>•</span>
                    <span>Get quick, relevant answers from your uploaded content.</span>
                  </li>
                </ul>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">🌐 Language support</h3>
                  <p>You can ask questions in any language; the assistant can respond in the language you use.</p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">🔍 Search modes</h3>
                  <p>
                    <span className="text-slate-200 font-medium">Document mode</span> uses your uploaded files.
                    For general internet queries, switch to <span className="text-slate-200 font-medium">Web Search</span> in the console when available.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">🧠 Model cards</h3>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>You can create multiple models (model cards).</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>Each model stores its own documents.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>Documents are processed once and can be reused anytime.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500 shrink-0">•</span>
                      <span>Easily switch between models and continue your work.</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-emerald-500/90 font-medium">
                    👉 This helps you manage and query different document sets efficiently.
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">📎 File types</h3>
                  <p>PDF, Word (DOCX), and PowerPoint (PPTX) are supported. Larger batches may take longer to index.</p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">🔐 Account &amp; your data</h3>
                  <p>
                    There is no separate sign-up or login in this flow yet. Each run gets a unique model ID in the URL—bookmark your status or console link if you want to return to the same workspace before server cleanup policies remove old data.
                  </p>
                </section>

                <section className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-4 py-3 text-sm text-slate-400">
                  <p className="font-semibold text-emerald-500/95 mb-1">© 2026 Mehul Sharma — Proprietary Software</p>
                  <p>
                    This application and its code are protected by copyright. Public access does not grant a license to copy, modify, redistribute, or reuse the software. See the footer link <span className="text-slate-300">License terms</span> for the full notice.
                  </p>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
