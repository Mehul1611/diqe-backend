'use client'

import { useState, use, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Send,
    FileText,
    Search,
    Zap,
    LayoutDashboard,
    Database,
    Check,
    Paperclip,
    X,
    ArrowLeft,
    MessageSquare,
    Plus,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Pencil,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api, ModelCard } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { KnowledgeView } from '@/components/KnowledgeView'
import { OnboardingMessage } from '@/components/console/OnboardingMessage'
import { ModeToggle } from '@/components/console/ModeToggle'
import { PulsePlusButton } from '@/components/console/PulsePlusButton'
import { FormattedResponse } from '@/components/console/FormattedResponse'
import { getOnboardingCopy, getQueryPlaceholder } from '@/lib/onboarding-i18n'
import { getSupabase } from '@/lib/supabase'

const LANGUAGE_OPTIONS = [
    'English',
    'Hindi',
    'Spanish',
    'French',
    'German',
    'Dutch',
    'Chinese',
    'Japanese',
] as const

function languageAccentClass(lang: string) {
    switch (lang) {
        case 'English': return 'text-indigo-400'
        case 'Hindi':   return 'text-[#FF9933]'
        case 'Spanish': return 'text-amber-400'
        case 'French':  return 'text-pink-400'
        case 'German':  return 'text-yellow-400'
        case 'Dutch':   return 'text-orange-400'
        case 'Chinese': return 'text-red-400'
        case 'Japanese': return 'text-rose-400'
        default:        return 'text-slate-300'
    }
}

export default function ConsolePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { session, user, loading: authLoading } = useAuth()
    const token = session?.access_token ?? ''

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth?tab=signin')
        }
    }, [user, authLoading, router])

    const [query, setQuery] = useState('')
    type ChatMessage = {
        role: 'user' | 'assistant'
        content: string
        id?: string
        createdAt?: string
    }
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)
    const [view, setView] = useState<'console' | 'knowledge'>('console')

    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editDraft, setEditDraft] = useState('')
    const editTextareaRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    const [modelCard, setModelCard] = useState<ModelCard | null>(null)

    type ChatSessionRow = { id: string; title: string; last_message_at: string; created_at: string }
    const [tempChat, setTempChat] = useState(false)
    const [sessions, setSessions] = useState<ChatSessionRow[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [loadingSessions, setLoadingSessions] = useState(false)
    const [tempIconOk, setTempIconOk] = useState(true)

    const accent = tempChat ? 'amber' : 'emerald'
    const accentBorder = tempChat ? 'border-amber-500/25' : 'border-emerald-500/25'
    const accentBgSoft = tempChat ? 'bg-amber-500/8' : 'bg-emerald-500/8'
    const accentText = tempChat ? 'text-amber-400' : 'text-emerald-400'
    const accentBtn = tempChat ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
    const accentRing = tempChat ? 'focus-visible:ring-amber-500/60' : 'focus-visible:ring-emerald-500/60'
    const accentInputBorder = tempChat ? 'border-amber-900/50 bg-amber-950/10 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500' : 'border-emerald-900/50 bg-emerald-950/10 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'

    function buildChatContext(prior: { role: 'user' | 'assistant'; content: string }[], limitPairs = 6) {
        if (!prior.length) return ''
        const trimmed = prior
            .filter((m) => m.content?.trim())
            .slice(-limitPairs * 2)
            .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`)
            .join('\n')
        if (!trimmed) return ''
        return `Conversation so far:\n${trimmed}\n\n`
    }

    const [sources, setSources] = useState<any[]>([])
    const [graphData, setGraphData] = useState<any>(null)
    const [loadingData, setLoadingData] = useState(false)

    const [language, setLanguage] = useState('English')
    const [mode, setMode] = useState<'fast' | 'thinking'>('fast')
    const [searchType, setSearchType] = useState<'local' | 'global'>('local')
    const [showSearchMenu, setShowSearchMenu] = useState(false)
    const [plusHintDone, setPlusHintDone] = useState(false)
    const [langMenuOpen, setLangMenuOpen] = useState(false)
    const langPickerRef = useRef<HTMLDivElement>(null)

    const [pendingFiles, setPendingFiles] = useState<File[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const uploadInputRef = useRef<HTMLInputElement>(null)

    const hasUserMessage = messages.some((m) => m.role === 'user')

    const searchChipAria = useMemo(() => {
        const c = getOnboardingCopy(language)
        return { web: c.searchModes.webLine.term, doc: c.searchModes.docLine.term }
    }, [language])

    useEffect(() => {
        if (!langMenuOpen) return
        const onDown = (e: MouseEvent) => {
            if (!langPickerRef.current?.contains(e.target as Node)) setLangMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLangMenuOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [langMenuOpen])

    const sendMessage = async (text: string, priorOverride?: ChatMessage[]) => {
        const prior = priorOverride ?? messages
        const userMarker = `__pending_${Date.now()}_${Math.random().toString(36).slice(2)}__`

        setMessages((prev) => [
            ...prev,
            { role: 'user', content: text, id: userMarker },
        ])
        setIsSearching(true)

        const controller = new AbortController()
        abortRef.current = controller

        try {
            let sessionId = activeSessionId
            if (!tempChat && !sessionId) {
                sessionId = await createNewSession({ clearMessages: false })
            }

            if (!tempChat && sessionId && user) {
                try {
                    const sb = getSupabase()
                    const { data: insertedUser } = await sb
                        .from('chat_messages')
                        .insert({ session_id: sessionId, user_id: user.id, role: 'user', content: text })
                        .select('id,created_at')
                        .single()
                    if (insertedUser) {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === userMarker
                                    ? { ...m, id: insertedUser.id, createdAt: insertedUser.created_at }
                                    : m,
                            ),
                        )
                    } else {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === userMarker ? { ...m, id: undefined } : m)),
                        )
                    }
                    await sb.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', sessionId)

                    const title = text.trim().slice(0, 48)
                    await sb.from('chat_sessions').update({ title }).eq('id', sessionId).eq('title', 'New chat')
                    refreshSessions()
                } catch (e) {
                    console.warn('[chat] failed to persist user message:', e)
                    setMessages((prev) =>
                        prev.map((m) => (m.id === userMarker ? { ...m, id: undefined } : m)),
                    )
                }
            } else {
                setMessages((prev) =>
                    prev.map((m) => (m.id === userMarker ? { ...m, id: undefined } : m)),
                )
            }

            const queryWithContext = buildChatContext(prior) + text
            const res = await api.streamQueryDocument(
                id, queryWithContext, searchType, language, mode, token, [], controller.signal,
            )
            const reader = res.body?.getReader()
            const decoder = new TextDecoder('utf-8')

            setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
            setIsSearching(false)
            setIsStreaming(true)

            let accumulatedText = ''
            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        if (controller.signal.aborted) break
                        const chunk = decoder.decode(value, { stream: true })
                        accumulatedText += chunk
                        setMessages((prev) => {
                            const next = [...prev]
                            const lastIdx = next.length - 1
                            if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                                next[lastIdx] = { ...next[lastIdx], content: accumulatedText }
                            }
                            return next
                        })
                    }
                } catch (readErr: any) {
                    if (readErr?.name !== 'AbortError') throw readErr
                }
            }
            setIsStreaming(false)

            if (controller.signal.aborted) return

            if (!tempChat && sessionId && user) {
                try {
                    const sb = getSupabase()
                    const { data: insertedAsst } = await sb
                        .from('chat_messages')
                        .insert({ session_id: sessionId, user_id: user.id, role: 'assistant', content: accumulatedText || '' })
                        .select('id,created_at')
                        .single()
                    if (insertedAsst) {
                        setMessages((prev) => {
                            const next = [...prev]
                            const lastIdx = next.length - 1
                            if (lastIdx >= 0 && next[lastIdx].role === 'assistant') {
                                next[lastIdx] = {
                                    ...next[lastIdx],
                                    id: insertedAsst.id,
                                    createdAt: insertedAsst.created_at,
                                }
                            }
                            return next
                        })
                    }
                    await sb.from('chat_sessions').update({ last_message_at: new Date().toISOString() }).eq('id', sessionId)
                    refreshSessions()
                } catch (e) {
                    console.warn('[chat] failed to persist assistant message:', e)
                }
            }
        } catch (err: any) {
            if (controller.signal.aborted || err?.name === 'AbortError') {
                setIsSearching(false)
                setIsStreaming(false)
                return
            }
            setMessages((prev) => [...prev, { role: 'assistant', content: '**Error**\n\nCould not complete the request.' }])
            setIsSearching(false)
            setIsStreaming(false)
        } finally {
            if (abortRef.current === controller) abortRef.current = null
        }
    }

    const handleSearch = async () => {
        if (!query.trim()) return
        const text = query
        setQuery('')
        await sendMessage(text)
    }

    // ---- edit handlers ----
    const startEdit = (index: number) => {
        const m = messages[index]
        if (!m || m.role !== 'user') return
        setEditingIndex(index)
        setEditDraft(m.content)
        requestAnimationFrame(() => {
            const ta = editTextareaRef.current
            if (ta) {
                ta.focus()
                const len = ta.value.length
                ta.setSelectionRange(len, len)
            }
        })
    }

    const cancelEdit = () => {
        setEditingIndex(null)
        setEditDraft('')
    }

    const saveEdit = async () => {
        if (editingIndex === null) return
        const newText = editDraft.trim()
        if (!newText) return

        const idx = editingIndex
        const editedMsg = messages[idx]
        if (!editedMsg || editedMsg.role !== 'user') {
            cancelEdit()
            return
        }

        if (abortRef.current) {
            abortRef.current.abort()
            abortRef.current = null
        }
        setIsSearching(false)
        setIsStreaming(false)

        const prior = messages.slice(0, idx)
        setMessages(prior)

        if (!tempChat && activeSessionId && editedMsg.createdAt) {
            try {
                const sb = getSupabase()
                await sb
                    .from('chat_messages')
                    .delete()
                    .eq('session_id', activeSessionId)
                    .gte('created_at', editedMsg.createdAt)
            } catch (e) {
                console.warn('[chat] failed to prune messages on edit:', e)
            }
        } else if (!tempChat && activeSessionId && editedMsg.id && !editedMsg.id.startsWith('__pending_')) {
            try {
                const sb = getSupabase()
                await sb.from('chat_messages').delete().eq('id', editedMsg.id)
            } catch (e) {
                console.warn('[chat] failed to delete edited message:', e)
            }
        }

        setEditingIndex(null)
        setEditDraft('')

        await sendMessage(newText, prior)
    }

    const loadKnowledge = async () => {
        if (sources.length > 0 && graphData) { setView('knowledge'); return }
        setLoadingData(true)
        try {
            const [sRes, gRes] = await Promise.all([
                api.getSources(id, token),
                api.getGraph(id, token),
            ])
            setSources(sRes.data)
            setGraphData(gRes.data)
            setView('knowledge')
        } catch {
            console.error('Failed to load knowledge')
        } finally {
            setLoadingData(false)
        }
    }

    const handleUploadDocs = async () => {
        if (pendingFiles.length === 0 || isUploading) return
        setIsUploading(true)

        try {
            const uploadRes = await api.uploadFiles(id, pendingFiles, token)
            const docIdFromFilename = (filename: string, idx: number) => {
                const base = filename.replace(/\.[a-z0-9]+$/i, '')
                const safe = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `doc-${idx + 1}`
                return `${safe}-added-${String(idx + 1).padStart(3, '0')}`
            }
            const fileDataList = uploadRes.files.map((f: any, idx: number) => ({
                doc_id: docIdFromFilename(f.filename, idx),
                file_path: f.file_path,
                domain: 'GENERAL',
                title: f.filename,
            }))
            await api.processDocument(id, fileDataList, token)
            setPendingFiles([])
        } catch (e: any) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `**Upload failed:** ${e.message ?? 'Unknown error'}` },
            ])
        } finally {
            setIsUploading(false)
        }
    }

    const openSearchMenu = () => {
        setPlusHintDone(true)
        setShowSearchMenu((v) => !v)
    }

    useEffect(() => {
        if (!token) return
        api.getModels(token)
            .then((all) => setModelCard(all.find((m) => m.id === id) ?? null))
            .catch(() => setModelCard(null))
    }, [token, id])

    const refreshSessions = useCallback(async () => {
        if (!user) return
        setLoadingSessions(true)
        try {
            const sb = getSupabase()
            const { data, error } = await sb
                .from('chat_sessions')
                .select('id,title,last_message_at,created_at')
                .eq('model_id', id)
                .order('last_message_at', { ascending: false })
            if (error) throw error
            setSessions((data ?? []) as any)
        } catch (e) {
            console.warn('[chat] failed to load sessions:', e)
            setSessions([])
        } finally {
            setLoadingSessions(false)
        }
    }, [id, user])

    const loadSessionMessages = useCallback(async (sessionId: string) => {
        try {
            const sb = getSupabase()
            const { data, error } = await sb
                .from('chat_messages')
                .select('id,role,content,created_at')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
            if (error) throw error
            const next: ChatMessage[] = (data ?? []).map((r: any) => ({
                id: r.id as string,
                role: r.role as 'user' | 'assistant',
                content: r.content as string,
                createdAt: r.created_at as string,
            }))
            setMessages(next)
        } catch (e) {
            console.warn('[chat] failed to load messages:', e)
            setMessages([])
        }
    }, [])

    const createNewSession = useCallback(async (opts?: { clearMessages?: boolean }) => {
        if (!user) return null
        const clearMessages = opts?.clearMessages ?? true
        try {
            const sb = getSupabase()
            const { data, error } = await sb
                .from('chat_sessions')
                .insert({ user_id: user.id, model_id: id, title: 'New chat' })
                .select('id,title,last_message_at,created_at')
                .single()
            if (error) throw error
            const row = data as any as ChatSessionRow
            setSessions((prev) => [row, ...prev.filter((s) => s.id !== row.id)])
            setActiveSessionId(row.id)
            if (clearMessages) setMessages([])
            return row.id
        } catch (e) {
            console.warn('[chat] failed to create session:', e)
            return null
        }
    }, [id, user])

    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            const sb = getSupabase()
            const { error } = await sb.from('chat_sessions').delete().eq('id', sessionId)
            if (error) throw error
            setSessions((prev) => prev.filter((s) => s.id !== sessionId))
            if (activeSessionId === sessionId) {
                setActiveSessionId(null)
                setMessages([])
            }
        } catch (e) {
            console.warn('[chat] failed to delete session:', e)
        }
    }, [activeSessionId])

    const deleteAllSessions = useCallback(async () => {
        try {
            const sb = getSupabase()
            const { error } = await sb.from('chat_sessions').delete().eq('model_id', id)
            if (error) throw error
            setSessions([])
            setActiveSessionId(null)
            setMessages([])
        } catch (e) {
            console.warn('[chat] failed to delete all sessions:', e)
        }
    }, [id])

    useEffect(() => {
        if (!user) return
        refreshSessions()
    }, [user, refreshSessions])

    useEffect(() => {
        if (tempChat) {
            setActiveSessionId(null)
            return
        }
        if (!activeSessionId && sessions.length > 0) {
            setActiveSessionId(sessions[0].id)
            loadSessionMessages(sessions[0].id)
        }
    }, [tempChat, sessions, activeSessionId, loadSessionMessages])

    return (
        <main className="relative flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-200 md:flex-row">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/25" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08),_transparent_50%)]" aria-hidden />

            <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-slate-900/55 p-4 backdrop-blur-xl md:flex">
                <Link href="/get-started" className="mb-8 flex items-center space-x-2 px-2 hover:opacity-95">
                    <Database className="h-6 w-6 text-emerald-500" />
                    <span className="text-lg font-bold tracking-tight">
                        <span className="text-white">D</span>
                        <span className="text-emerald-500">I</span>
                        <span className="text-white">QE</span>
                        <span className="ml-2 font-medium text-slate-300">Core</span>
                    </span>
                </Link>

                <button
                    onClick={() => router.push('/dashboard')}
                    className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/60"
                >
                    <span className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4 text-emerald-400" />
                        All models
                    </span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        Dashboard
                    </span>
                </button>

                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Chats</span>
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                setView('console')
                                setMessages([])
                                if (!tempChat) void createNewSession()
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
                            title="New chat"
                            aria-label="New chat"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden text-[10px] font-bold uppercase tracking-wider sm:inline">New</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => deleteAllSessions()}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                            title="Delete all chats"
                            aria-label="Delete all chats"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800/70 bg-slate-950/20 p-2">
                    {loadingSessions ? (
                        <div className="px-2 py-3 text-xs text-slate-500">Loading chats…</div>
                    ) : sessions.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-slate-500">No chats yet. Use <span className="font-semibold text-slate-400">New</span> above.</div>
                    ) : (
                        <div className="space-y-1">
                            {sessions.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => { setView('console'); setActiveSessionId(s.id); loadSessionMessages(s.id) }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            setView('console'); setActiveSessionId(s.id); loadSessionMessages(s.id)
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    className={cn(
                                        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition',
                                        activeSessionId === s.id
                                            ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/20'
                                            : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200',
                                    )}
                                >
                                    <MessageSquare className="h-4 w-4 shrink-0 opacity-80" />
                                    <span className="flex-1 truncate font-semibold">{s.title || 'Chat'}</span>
                                    <span className="shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                                            className="rounded-md p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-300"
                                            title="Delete chat"
                                            aria-label="Delete chat"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tools (requested: above model info) */}
                <div className="mt-3 space-y-2">
                    <Button
                        variant={view === 'console' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start',
                            view === 'console'
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                                : 'hover:bg-slate-800/50',
                        )}
                        onClick={() => setView('console')}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Console
                    </Button>
                    <Button
                        variant={view === 'knowledge' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start',
                            view === 'knowledge'
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                                : 'hover:bg-slate-800/50',
                        )}
                        onClick={loadKnowledge}
                    >
                        <Zap className="mr-2 h-4 w-4" /> Knowledge
                    </Button>
                </div>

                <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/70 p-3 text-xs text-slate-400 backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Model</p>
                            <p className="truncate text-sm font-bold text-white">
                                {modelCard?.name ?? 'Loading…'}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                            {modelCard?.doc_count ?? 0} docs
                        </span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[10px] text-slate-500">id: {id}</p>
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/70 px-4 py-2 backdrop-blur-md md:hidden">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span className="font-medium">Models</span>
                </button>
                <div className="flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/60 p-1">
                    <button
                        onClick={() => setView('console')}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            view === 'console' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300',
                        )}
                    >
                        <LayoutDashboard className="h-3.5 w-3.5" /> Console
                    </button>
                    <button
                        onClick={loadKnowledge}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            view === 'knowledge' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300',
                        )}
                    >
                        <Zap className="h-3.5 w-3.5" /> Knowledge
                    </button>
                </div>
                <div className="w-16" />
            </div>

            {/* Main content */}
            <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
                <header className="hidden h-14 shrink-0 items-center border-b border-slate-800/80 bg-slate-900/30 px-6 backdrop-blur-md md:flex">
                    <h1 className="text-lg font-medium text-white">
                        {view === 'console' && 'Query Interface'}
                        {view === 'knowledge' && 'Knowledge'}
                    </h1>
                    <div className="ml-auto flex items-center gap-2">
                        {view === 'console' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setTempChat((v) => !v); setView('console'); setMessages([]) }}
                                    className={cn(
                                        'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent transition',
                                        tempChat ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200',
                                    )}
                                    title="Temporary chat (not saved)"
                                    aria-label="Temporary chat toggle"
                                >
                                    {tempIconOk ? (
                                        <img
                                            src="/icons/deadline_2612924.png"
                                            alt=""
                                            width={22}
                                            height={22}
                                            onError={() => setTempIconOk(false)}
                                            className={cn('h-[22px] w-[22px] object-contain invert', tempChat ? 'opacity-100' : 'opacity-70')}
                                            aria-hidden
                                        />
                                    ) : (
                                        tempChat ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setView('console'); setMessages([]); tempChat ? null : createNewSession() }}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-slate-300 transition hover:text-emerald-300"
                                    title="New chat"
                                    aria-label="New chat"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </>
                        )}
                    </div>
                    {loadingData && (
                        <span className="ml-4 animate-pulse text-xs text-slate-500">Loading data...</span>
                    )}
                </header>

                <div className="relative flex-1 overflow-hidden">
                    {view === 'console' && (
                        <div className="flex h-full flex-col">
                            {/* Messages */}
                            <div className="scrollbar-thin scrollbar-thumb-slate-800 flex-1 space-y-6 overflow-y-auto p-3 sm:p-6">
                                {tempChat && (
                                    <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6">
                                        <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 backdrop-blur">
                                            <span className="font-semibold">Temporary chat is enabled.</span> Nothing will be stored.
                                        </div>
                                    </div>
                                )}
                                {!hasUserMessage && (
                                    <div className="flex justify-start">
                                        <OnboardingMessage language={language} />
                                    </div>
                                )}
                                {messages.map((msg, i) => {
                                    const streamingThis =
                                        msg.role === 'assistant' && i === messages.length - 1 && isStreaming
                                    if (msg.role === 'user') {
                                        const isEditing = editingIndex === i
                                        if (isEditing) {
                                            return (
                                                <div
                                                    key={i}
                                                    className="mx-auto flex w-full max-w-3xl justify-end"
                                                >
                                                    <div className="w-full max-w-[80%] rounded-xl border border-emerald-500/40 bg-emerald-600/15 p-4 shadow-md">
                                                        <textarea
                                                            ref={editTextareaRef}
                                                            value={editDraft}
                                                            onChange={(e) => setEditDraft(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                                    e.preventDefault()
                                                                    saveEdit()
                                                                } else if (e.key === 'Escape') {
                                                                    e.preventDefault()
                                                                    cancelEdit()
                                                                }
                                                            }}
                                                            rows={Math.min(10, Math.max(2, editDraft.split('\n').length))}
                                                            className="w-full resize-none rounded-md border border-emerald-500/30 bg-slate-950/40 p-3 text-emerald-50 placeholder:text-emerald-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                                            placeholder="Edit your message…"
                                                        />
                                                        <div className="mt-2 flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700/40 hover:text-white"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={saveEdit}
                                                                disabled={!editDraft.trim() || editDraft.trim() === msg.content.trim()}
                                                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Save &amp; Resend
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div
                                                key={i}
                                                className="group/msg mx-auto flex w-full max-w-3xl items-end justify-end gap-2"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(i)}
                                                    aria-label="Edit message"
                                                    title="Edit message"
                                                    className="mb-1 rounded-md border border-slate-700/60 bg-slate-800/60 p-1.5 text-slate-300 opacity-0 shadow-sm transition hover:border-emerald-500/50 hover:bg-slate-800 hover:text-emerald-300 focus:opacity-100 group-hover/msg:opacity-100"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <Card
                                                    className="max-w-[80%] border border-emerald-500/30 bg-emerald-600/20 p-5 text-emerald-50 shadow-md transition-shadow duration-300"
                                                >
                                                    <p className="whitespace-pre-wrap leading-relaxed tracking-wide">
                                                        {msg.content}
                                                    </p>
                                                </Card>
                                            </div>
                                        )
                                    }
                                    return (
                                        <div
                                            key={i}
                                            className="mx-auto w-full max-w-3xl px-1 sm:px-2 text-slate-100"
                                        >
                                            <FormattedResponse content={msg.content} preprocess={!streamingThis} />
                                        </div>
                                    )
                                })}
                                {isSearching && (
                                    <div className="flex w-full justify-start">
                                        <div className="flex items-center space-x-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-4 py-2 text-sm text-slate-400 backdrop-blur-sm">
                                            <Search className="h-4 w-4 animate-spin" />
                                            <span>Generating answer…</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input area */}
                            <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/60 px-3 pb-6 pt-3 backdrop-blur-md sm:px-6 sm:pb-10 sm:pt-4">

                                {/* Pending files strip */}
                                <AnimatePresence>
                                    {pendingFiles.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mx-auto mb-3 max-w-3xl"
                                        >
                                        <div className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 border', accentBorder, accentBgSoft)}>
                                            <FileText className={cn('h-4 w-4 shrink-0', accentText)} />
                                            <span className={cn('flex-1 truncate text-sm', tempChat ? 'text-amber-300' : 'text-emerald-300')}>
                                                    {pendingFiles.length} file(s) ready — {pendingFiles.map((f) => f.name).join(', ')}
                                                </span>
                                                <button
                                                    onClick={() => { api.uploadFiles(id, pendingFiles, token); handleUploadDocs() }}
                                                    disabled={isUploading}
                                                className={cn('shrink-0 rounded-lg px-3 py-1 text-xs font-bold text-white transition disabled:opacity-50', accentBtn)}
                                                >
                                                    {isUploading ? 'Indexing…' : 'Add to Model'}
                                                </button>
                                                <button
                                                    onClick={() => setPendingFiles([])}
                                                    className="shrink-0 text-slate-400 hover:text-slate-200"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className={cn(
                                    'mx-auto max-w-3xl rounded-2xl border bg-slate-900/50 p-5 shadow-[0_0_40px_rgba(16,185,129,0.07)]',
                                    tempChat ? 'border-amber-500/15 shadow-[0_0_40px_rgba(245,158,11,0.08)]' : 'border-emerald-500/15',
                                )}>
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
                                        <ModeToggle value={mode} onChange={setMode} language={language} />
                                        <div ref={langPickerRef} className="relative flex items-center">
                                            <motion.button
                                                type="button"
                                                onClick={() => setLangMenuOpen((o) => !o)}
                                                aria-expanded={langMenuOpen}
                                                aria-haspopup="listbox"
                                                aria-label="Response language"
                                                className={cn(
                                                    'rounded-lg border border-slate-700/50 bg-slate-900/80 p-2 transition-colors hover:border-slate-600 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2',
                                                    accentRing,
                                                    langMenuOpen && (tempChat ? 'border-amber-500/40 ring-1 ring-amber-500/30' : 'border-emerald-500/40 ring-1 ring-emerald-500/30'),
                                                )}
                                            >
                                                <motion.span
                                                    className="block origin-center will-change-transform"
                                                    animate={{ rotate: langMenuOpen ? 360 : 0 }}
                                                    transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                                                >
                                                    <img
                                                        src="/icons/languages-3898082.png"
                                                        alt=""
                                                        width={22}
                                                        height={22}
                                                        className="pointer-events-none h-[22px] w-[22px] object-contain opacity-90"
                                                        aria-hidden
                                                    />
                                                </motion.span>
                                            </motion.button>

                                            <AnimatePresence>
                                                {langMenuOpen && (
                                                    <motion.ul
                                                        role="listbox"
                                                        aria-label="Response language"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 8 }}
                                                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                                                        className="absolute bottom-full right-0 z-50 mb-2 min-w-[10.5rem] overflow-hidden rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl shadow-black/40"
                                                    >
                                                        {LANGUAGE_OPTIONS.map((opt) => (
                                                            <li key={opt} role="presentation">
                                                                <button
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={language === opt}
                                                                    onClick={() => { setLanguage(opt); setLangMenuOpen(false) }}
                                                                    className={cn(
                                                                        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-700/60',
                                                                        language === opt
                                                                            ? cn('bg-slate-700/50', languageAccentClass(opt))
                                                                            : 'text-slate-300',
                                                                    )}
                                                                >
                                                                    <span>{opt}</span>
                                                                    {language === opt && (
                                                                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
                                                                    )}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={cn(
                                                'relative flex w-full flex-1 items-center rounded-xl border px-3 py-2 shadow-inner transition-all duration-200',
                                                searchType === 'local'
                                                    ? accentInputBorder
                                                    : 'border-blue-900/50 bg-blue-950/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
                                            )}
                                        >
                                            <div className="relative mr-2 flex shrink-0 items-center space-x-2">
                                                <PulsePlusButton
                                                    onClick={openSearchMenu}
                                                    interactionDone={plusHintDone || showSearchMenu || searchType === 'global'}
                                                />
                                                {searchType === 'global' && (
                                                    <span className="flex shrink-0 items-center justify-center rounded-md border border-blue-700/50 bg-blue-900/30 p-1.5" title={searchChipAria.web} aria-label={searchChipAria.web}>
                                                        <img src="/icons/internet-10453141.png" alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-95" aria-hidden />
                                                    </span>
                                                )}
                                                {searchType === 'local' && (
                                                    <span className="flex shrink-0 items-center justify-center rounded-md border border-emerald-700/50 bg-emerald-900/30 p-1.5" title={searchChipAria.doc} aria-label={searchChipAria.doc}>
                                                        <img src="/icons/documentation-9746449.png" alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-95" aria-hidden />
                                                    </span>
                                                )}

                                                {showSearchMenu && (
                                                    <div className="absolute bottom-full left-0 z-50 mb-4 flex w-48 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                                                        {searchType === 'local' ? (
                                                            <button type="button" onClick={() => { setSearchType('global'); setShowSearchMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-blue-400 transition-colors hover:bg-blue-900/40">
                                                                <img src="/icons/internet-10453141.png" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" aria-hidden /> Web Search
                                                            </button>
                                                        ) : (
                                                            <button type="button" onClick={() => { setSearchType('local'); setShowSearchMenu(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-900/40">
                                                                <img src="/icons/documentation-9746449.png" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" aria-hidden /> Document Search
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                placeholder={getQueryPlaceholder(language)}
                                                className="min-w-0 flex-1 bg-transparent py-1 text-white placeholder-slate-500 focus:outline-none"
                                            />
                                        </div>

                                        {/* Attach docs button */}
                                        <input
                                            ref={uploadInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                                            className="hidden"
                                            onChange={(e) => e.target.files && setPendingFiles(Array.from(e.target.files))}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => uploadInputRef.current?.click()}
                                            size="icon"
                                            title="Add documents to this model"
                                            className={cn(
                                                'h-12 w-12 shrink-0 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95',
                                                pendingFiles.length > 0
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
                                            )}
                                        >
                                            <Paperclip className="h-5 w-5" />
                                        </Button>

                                        {/* Send button */}
                                        <Button
                                            onClick={handleSearch}
                                            disabled={!query.trim() || isSearching}
                                            size="icon"
                                            className={cn(
                                                'h-12 w-12 shrink-0 rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-white',
                                                tempChat ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20',
                                            )}
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'knowledge' && (
                        <div className="h-full overflow-hidden">
                            <KnowledgeView sources={sources} graphData={graphData} />
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}
