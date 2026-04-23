'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Database,
    Plus,
    Pencil,
    Trash2,
    ArrowRight,
    FileText,
    Loader2,
    Upload,
    X,
    LogOut,
    CheckCircle,
    Clock,
    Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api, ModelCard } from '@/lib/api'
import NetworkCanvas from '@/components/NetworkCanvas'
import Link from 'next/link'


function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
        ready: {
            label: 'Ready',
            classes: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
            icon: <CheckCircle className="h-3 w-3" />,
        },
        processing: {
            label: 'Processing',
            classes: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
            icon: <Loader2 className="h-3 w-3 animate-spin" />,
        },
        pending: {
            label: 'Pending',
            classes: 'border-slate-600/40 bg-slate-700/40 text-slate-400',
            icon: <Clock className="h-3 w-3" />,
        },
    }
    const cfg = map[status] ?? map.pending
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    )
}


interface NewModelModalProps {
    onClose: () => void
    onCreated: (card: ModelCard) => void
    token: string
}

function NewModelModal({ onClose, onCreated, token }: NewModelModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [isHovering, setIsHovering] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsHovering(false)
        if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files))
    }

    const handleCreate = async () => {
        if (!name.trim()) { setError('Name is required.'); return }
        if (files.length === 0) { setError('Upload at least one document.'); return }
        setError(null)
        setLoading(true)

        try {
            const card = await api.createModel(name.trim(), description.trim() || undefined, token)

            const uploadRes = await api.uploadFiles(card.id, files, token)
            const uploadedFiles = uploadRes.files

            const docIdFromFilename = (filename: string, idx: number) => {
                const base = filename.replace(/\.[a-z0-9]+$/i, '')
                const safe = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `doc-${idx + 1}`
                return `${safe}-${String(idx + 1).padStart(3, '0')}`
            }

            const fileDataList = uploadedFiles.map((f: any, idx: number) => ({
                doc_id: docIdFromFilename(f.filename, idx),
                file_path: f.file_path,
                domain: 'GENERAL',
                title: f.filename,
            }))
            await api.processDocument(card.id, fileDataList, token)

            const updated = await api.updateModel(card.id, { status: 'processing', doc_count: files.length }, token)

            onCreated(updated)
        } catch (exc: any) {
            setError(exc.message ?? 'Something went wrong.')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">New Model</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Model Name *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Medical Policy Docs"
                            className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Short description (optional)"
                            rows={2}
                            className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Drop zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsHovering(true) }}
                        onDragLeave={() => setIsHovering(false)}
                        className={`relative flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                            isHovering
                                ? 'border-emerald-500 bg-emerald-500/10'
                                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
                        }`}
                    >
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))}
                        />
                        {files.length > 0 ? (
                            <div className="flex flex-col items-center gap-2 text-emerald-400">
                                <FileText className="h-8 w-8" />
                                <p className="text-sm font-semibold">{files.length} file(s) selected</p>
                                <p className="max-w-xs truncate px-4 text-center text-xs text-emerald-400/70">
                                    {files.map((f) => f.name).join(', ')}
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Upload className="h-8 w-8" />
                                <p className="text-sm">Drag & drop or click to upload</p>
                                <p className="text-xs text-slate-500">PDF, DOCX, PPTX, TXT</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /> Create & Index</>}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}


interface DeleteModalProps {
    card: ModelCard
    onClose: () => void
    onDeleted: (id: string) => void
    token: string
}

function DeleteModal({ card, onClose, onDeleted, token }: DeleteModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        setLoading(true)
        try {
            await api.deleteModel(card.id, token)
            onDeleted(card.id)
        } catch (exc: any) {
            setError(exc.message ?? 'Failed to delete.')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
                    <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-white">Delete Model?</h2>
                <p className="mb-1 text-sm text-slate-400">
                    This will permanently delete <span className="font-semibold text-white">"{card.name}"</span> including all
                    uploaded documents, vector index, and cached data. This cannot be undone.
                </p>
                {error && (
                    <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
                )}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

interface EditModelModalProps {
    card: ModelCard
    onClose: () => void
    onUpdated: (card: ModelCard) => void
    token: string
}

function EditModelModal({ card, onClose, onUpdated, token }: EditModelModalProps) {
    const [name, setName] = useState(card.name)
    const [description, setDescription] = useState(card.description ?? '')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSave = async () => {
        if (!name.trim()) { setError('Name is required.'); return }
        setError(null)
        setLoading(true)
        try {
            const updated = await api.updateModel(
                card.id,
                { name: name.trim(), description: description.trim() || undefined },
                token,
            )
            onUpdated(updated)
            onClose()
        } catch (exc: any) {
            setError(exc.message ?? 'Failed to update model.')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Edit Model</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Model Name *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="w-full resize-none rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Pencil className="h-4 w-4" /> Save</>}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}


export default function DashboardPage() {
    const router = useRouter()
    const { user, session, loading: authLoading, signOut } = useAuth()

    const [cards, setCards] = useState<ModelCard[]>([])
    const [loadingCards, setLoadingCards] = useState(true)
    const [initialLoadDone, setInitialLoadDone] = useState(false)
    const [showNewModal, setShowNewModal] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<ModelCard | null>(null)
    const [editTarget, setEditTarget] = useState<ModelCard | null>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth?tab=signin')
        }
    }, [user, authLoading, router])

    const token = session?.access_token ?? ''

    const fetchCards = useCallback(() => {
        if (!token) {
            if (!authLoading) {
                setLoadingCards(false)
                setInitialLoadDone(true)
            }
            return
        }
        api.getModels(token)
            .then((data) => setCards(data))
            .catch(console.error)
            .finally(() => {
                setLoadingCards(false)
                setInitialLoadDone(true)
            })
    }, [token, authLoading])

    useEffect(() => {
        fetchCards()
    }, [fetchCards])

    useEffect(() => {
        if (!loadingCards) return
        const timer = setTimeout(() => {
            setLoadingCards(false)
            setInitialLoadDone(true)
        }, 6000)
        return () => clearTimeout(timer)
    }, [loadingCards])

    useEffect(() => {
        const onFocus = () => fetchCards()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [fetchCards])

    const handleCreated = (card: ModelCard) => {
        setCards((prev) => [card, ...prev])
        setShowNewModal(false)
        router.push(`/status/${card.id}`)
    }

    const handleDeleted = (id: string) => {
        setCards((prev) => prev.filter((c) => c.id !== id))
        setDeleteTarget(null)
    }

    const handleUpdated = (updated: ModelCard) => {
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setEditTarget(null)
    }

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-slate-950">
            <NetworkCanvas />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.07),_transparent_50%)]" />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
                <Link href="/get-started" className="flex items-center gap-2 hover:opacity-95">
                    <Database className="h-6 w-6 text-emerald-500" />
                    <span className="text-lg font-extrabold tracking-tight">
                        <span className="text-white">D</span>
                        <span className="text-emerald-500">I</span>
                        <span className="text-white">QE</span>
                    </span>
                    <span className="ml-2 rounded-full border border-slate-700/60 bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                        Dashboard
                    </span>
                </Link>
                <div className="flex items-center gap-3">
                    <span className="hidden text-sm text-slate-400 sm:block">{user?.email}</span>
                    <button
                        type="button"
                        onClick={async () => {
                            await signOut()
                            router.replace('/auth?tab=signin')
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-white"
                    >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                </div>
            </header>

            {/* Body */}
            <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                {/* Section title + create button */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Your Models</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            Each model maintains its own document set, vector index, and chat context.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="
                            group flex items-center gap-2 rounded-xl border border-emerald-400/40
                            bg-gradient-to-r from-emerald-500 to-emerald-600
                            px-5 py-2.5 text-sm font-bold text-white
                            shadow-[0_4px_15px_rgba(16,185,129,0.3)]
                            transition-all hover:from-emerald-400 hover:to-emerald-500 hover:scale-[1.02] active:scale-[0.97]
                        "
                    >
                        <Plus className="h-4 w-4" />
                        New Model
                    </button>
                </div>

                {/* Cards grid */}
                {loadingCards && !initialLoadDone ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    </div>
                ) : cards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 py-24 text-center"
                    >
                        <div className="rounded-full border border-slate-700 bg-slate-800/50 p-5">
                            <Database className="h-10 w-10 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-slate-300">No models yet</p>
                            <p className="mt-1 text-sm text-slate-500">Create your first model to start querying documents.</p>
                        </div>
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                        >
                            <Plus className="h-4 w-4" /> Create Model
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <AnimatePresence>
                            {cards.map((card) => (
                                <motion.div
                                    key={card.id}
                                    layout
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition hover:border-slate-600 hover:shadow-[0_0_30px_rgba(16,185,129,0.06)]"
                                >
                                    {/* Card header */}
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="truncate text-base font-bold text-white">{card.name}</h3>
                                            {card.description && (
                                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{card.description}</p>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                            <button
                                                onClick={() => setEditTarget(card)}
                                                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-800 hover:text-slate-200"
                                                title="Edit model"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(card)}
                                                className="rounded-lg p-1.5 text-slate-600 hover:bg-red-500/15 hover:text-red-400"
                                                title="Delete model"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" />
                                            {card.doc_count} doc{card.doc_count !== 1 ? 's' : ''}
                                        </span>
                                        <StatusBadge status={card.status} />
                                    </div>

                                    {/* Model ID */}
                                    <p className="mb-4 truncate font-mono text-[10px] text-slate-600">{card.id}</p>

                                    {/* Open button */}
                                    <button
                                        onClick={() => router.push(`/console/${card.id}`)}
                                        disabled={card.status === 'pending' || card.status === 'processing'}
                                        className="
                                            mt-auto flex w-full items-center justify-center gap-2 rounded-xl
                                            border border-emerald-500/30 bg-emerald-500/10
                                            py-2 text-sm font-semibold text-emerald-400
                                            transition hover:bg-emerald-500/20 hover:text-emerald-300
                                            disabled:cursor-not-allowed disabled:opacity-40
                                        "
                                    >
                                        Open Console <ArrowRight className="h-4 w-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showNewModal && (
                    <NewModelModal
                        onClose={() => setShowNewModal(false)}
                        onCreated={handleCreated}
                        token={token}
                    />
                )}
                {deleteTarget && (
                    <DeleteModal
                        card={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                        onDeleted={handleDeleted}
                        token={token}
                    />
                )}
                {editTarget && (
                    <EditModelModal
                        card={editTarget}
                        onClose={() => setEditTarget(null)}
                        onUpdated={handleUpdated}
                        token={token}
                    />
                )}
            </AnimatePresence>
        </main>
    )
}
