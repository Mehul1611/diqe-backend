'use client'

import { useState, use, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, FileText, Search, Zap, LayoutDashboard, Database, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { SourcesView } from '@/components/SourcesView'
import { GraphView } from '@/components/GraphView'
import { OnboardingMessage } from '@/components/console/OnboardingMessage'
import { ModeToggle } from '@/components/console/ModeToggle'
import { PulsePlusButton } from '@/components/console/PulsePlusButton'
import { FormattedResponse } from '@/components/console/FormattedResponse'
import { getOnboardingCopy, getQueryPlaceholder } from '@/lib/onboarding-i18n'

const LANGUAGE_OPTIONS = [
    'English',
    'Spanish',
    'French',
    'German',
    'Dutch',
    'Chinese',
    'Japanese',
] as const

function languageAccentClass(lang: string) {
    switch (lang) {
        case 'English':
            return 'text-indigo-400'
        case 'Spanish':
            return 'text-amber-400'
        case 'French':
            return 'text-pink-400'
        case 'German':
            return 'text-yellow-400'
        case 'Dutch':
            return 'text-orange-400'
        case 'Chinese':
            return 'text-red-400'
        case 'Japanese':
            return 'text-rose-400'
        default:
            return 'text-slate-300'
    }
}

export default function ConsolePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isStreaming, setIsStreaming] = useState(false)
    const [view, setView] = useState<'console' | 'sources' | 'graph'>('console')

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

    const hasUserMessage = messages.some((m) => m.role === 'user')

    const searchChipAria = useMemo(() => {
        const c = getOnboardingCopy(language)
        return {
            web: c.searchModes.webLine.term,
            doc: c.searchModes.docLine.term,
        }
    }, [language])

    useEffect(() => {
        if (!langMenuOpen) return
        const onDown = (e: MouseEvent) => {
            if (!langPickerRef.current?.contains(e.target as Node)) setLangMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLangMenuOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [langMenuOpen])

    const handleSearch = async () => {
        if (!query.trim()) return

        const tempQuery = query
        const chatHistoryPayload = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }))
        setMessages((prev) => [...prev, { role: 'user', content: tempQuery }])
        setQuery('')
        setIsSearching(true)

        try {
            const res = await api.streamQueryDocument(
                id,
                tempQuery,
                searchType,
                language,
                mode,
                chatHistoryPayload
            )
            const reader = res.body?.getReader()
            const decoder = new TextDecoder('utf-8')

            setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
            setIsSearching(false)
            setIsStreaming(true)

            if (reader) {
                let accumulatedText = ''
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    accumulatedText += chunk

                    setMessages((prev) => {
                        const newMessages = [...prev]
                        newMessages[newMessages.length - 1].content = accumulatedText
                        return newMessages
                    })
                }
            }
            setIsStreaming(false)
        } catch (e) {
            setMessages((prev) => [...prev, { role: 'assistant', content: '**Error**\n\nCould not complete the request.' }])
            setIsSearching(false)
            setIsStreaming(false)
        }
    }

    const loadSources = async () => {
        setView('sources')
        setLoadingData(true)
        try {
            const res = await api.getSources(id)
            setSources(res.data ?? [])
        } catch (e) {
            console.error('Failed to load sources', e)
        } finally {
            setLoadingData(false)
        }
    }

    const loadGraph = async () => {
        if (graphData) {
            setView('graph')
            return
        }
        setLoadingData(true)
        try {
            const res = await api.getGraph(id)
            setGraphData(res.data)
            setView('graph')
        } catch (e) {
            console.error('Failed to load entity graph', e)
        } finally {
            setLoadingData(false)
        }
    }

    const openSearchMenu = () => {
        setPlusHintDone(true)
        setShowSearchMenu((v) => !v)
    }

    return (
        <main className="relative flex h-screen overflow-hidden bg-slate-950 text-slate-200">
            <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/25"
                aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.08),_transparent_50%)]" aria-hidden />

            <aside className="relative z-20 w-64 border-r border-slate-800/80 bg-slate-900/55 p-4 backdrop-blur-xl">
                <div className="mb-8 flex items-center space-x-2 px-2">
                    <Database className="h-6 w-6 text-emerald-500" />
                    <span className="text-lg font-bold tracking-tight">
                        <span className="text-white">D</span>
                        <span className="text-emerald-500">I</span>
                        <span className="text-white">QE</span>
                        <span className="ml-2 font-medium text-slate-300">Core</span>
                    </span>
                </div>

                <nav className="space-y-2">
                    <Button
                        variant={view === 'console' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start transition-transform duration-200 hover:scale-[1.02]',
                            view === 'console'
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                : 'hover:bg-slate-800/50',
                        )}
                        onClick={() => setView('console')}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Console
                    </Button>
                    <Button
                        variant={view === 'sources' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start transition-transform duration-200 hover:scale-[1.02]',
                            view === 'sources'
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                : 'hover:bg-slate-800/50',
                        )}
                        onClick={loadSources}
                    >
                        <FileText className="mr-2 h-4 w-4" /> Source Docs
                    </Button>
                    <Button
                        variant={view === 'graph' ? 'secondary' : 'ghost'}
                        className={cn(
                            'w-full justify-start transition-transform duration-200 hover:scale-[1.02]',
                            view === 'graph'
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                : 'hover:bg-slate-800/50',
                        )}
                        onClick={loadGraph}
                    >
                        <Zap className="mr-2 h-4 w-4" /> Entity graph
                    </Button>
                </nav>

                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-slate-800/90 p-3 text-xs text-slate-400 backdrop-blur-sm">
                    <p>Model ID:</p>
                    <p className="truncate font-mono text-emerald-500">{id}</p>
                </div>
            </aside>

            <section className="relative z-10 flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 shrink-0 items-center border-b border-slate-800/80 bg-slate-900/30 px-6 backdrop-blur-md">
                    <h1 className="text-lg font-medium text-white">
                        {view === 'console' && 'Query Interface'}
                        {view === 'sources' && 'Source Documents'}
                        {view === 'graph' && 'Entity Graph'}
                    </h1>
                    {loadingData && (
                        <span className="ml-4 animate-pulse text-xs text-slate-500">Loading data...</span>
                    )}
                </header>

                <div className="relative flex-1 overflow-hidden">
                    {view === 'console' && (
                        <div className="flex h-full flex-col">
                            <div className="scrollbar-thin scrollbar-thumb-slate-800 flex-1 space-y-6 overflow-y-auto p-6">
                                {!hasUserMessage && (
                                    <div className="flex justify-start">
                                        <OnboardingMessage language={language} />
                                    </div>
                                )}
                                {messages.map((msg, i) => {
                                    const streamingThis =
                                        msg.role === 'assistant' &&
                                        i === messages.length - 1 &&
                                        isStreaming
                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                'flex w-full max-w-3xl',
                                                msg.role === 'user' ? 'ml-auto justify-end' : 'justify-start',
                                            )}
                                        >
                                            <Card
                                                className={cn(
                                                    'max-w-[80%] p-5 transition-shadow duration-300',
                                                    msg.role === 'user'
                                                        ? 'border border-emerald-500/30 bg-emerald-600/20 text-emerald-50 shadow-md'
                                                        : 'border border-slate-600/50 bg-slate-900/55 text-slate-100 shadow-[0_0_30px_rgba(16,185,129,0.06)] backdrop-blur-md',
                                                )}
                                            >
                                                {msg.role === 'user' ? (
                                                    <p className="whitespace-pre-wrap leading-relaxed tracking-wide">
                                                        {msg.content}
                                                    </p>
                                                ) : (
                                                    <FormattedResponse
                                                        content={msg.content}
                                                        preprocess={!streamingThis}
                                                    />
                                                )}
                                            </Card>
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

                            <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/60 px-6 pb-10 pt-6 backdrop-blur-md">
                                <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/15 bg-slate-900/50 p-5 shadow-[0_0_40px_rgba(16,185,129,0.07)]">
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
                                                    'rounded-lg border border-slate-700/50 bg-slate-900/80 p-2 transition-colors hover:border-slate-600 hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
                                                    langMenuOpen && 'border-emerald-500/40 ring-1 ring-emerald-500/30',
                                                )}
                                            >
                                                <motion.span
                                                    className="block origin-center will-change-transform"
                                                    animate={{ rotate: langMenuOpen ? 360 : 0 }}
                                                    transition={{
                                                        duration: 0.28,
                                                        ease: [0.25, 0.46, 0.45, 0.94] as const,
                                                    }}
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
                                                                    onClick={() => {
                                                                        setLanguage(opt)
                                                                        setLangMenuOpen(false)
                                                                    }}
                                                                    className={cn(
                                                                        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-700/60',
                                                                        language === opt
                                                                            ? cn(
                                                                                  'bg-slate-700/50',
                                                                                  languageAccentClass(opt),
                                                                              )
                                                                            : 'text-slate-300',
                                                                    )}
                                                                >
                                                                    <span>{opt}</span>
                                                                    {language === opt && (
                                                                        <Check
                                                                            className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                                                            strokeWidth={2.5}
                                                                            aria-hidden
                                                                        />
                                                                    )}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </motion.ul>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div
                                            className={cn(
                                                'relative flex w-full flex-1 items-center rounded-xl border px-3 py-2 shadow-inner transition-all duration-200',
                                                searchType === 'local'
                                                    ? 'border-emerald-900/50 bg-emerald-950/10 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500'
                                                    : 'border-blue-900/50 bg-blue-950/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500',
                                            )}
                                        >
                                            <div className="relative mr-2 flex shrink-0 items-center space-x-2">
                                                <PulsePlusButton
                                                    onClick={openSearchMenu}
                                                    interactionDone={
                                                        plusHintDone || showSearchMenu || searchType === 'global'
                                                    }
                                                />
                                                {searchType === 'global' && (
                                                    <span
                                                        className="flex shrink-0 items-center justify-center rounded-md border border-blue-700/50 bg-blue-900/30 p-1.5"
                                                        title={searchChipAria.web}
                                                        aria-label={searchChipAria.web}
                                                    >
                                                        <img
                                                            src="/icons/internet-10453141.png"
                                                            alt=""
                                                            width={20}
                                                            height={20}
                                                            className="h-5 w-5 object-contain opacity-95"
                                                            aria-hidden
                                                        />
                                                    </span>
                                                )}
                                                {searchType === 'local' && (
                                                    <span
                                                        className="flex shrink-0 items-center justify-center rounded-md border border-emerald-700/50 bg-emerald-900/30 p-1.5"
                                                        title={searchChipAria.doc}
                                                        aria-label={searchChipAria.doc}
                                                    >
                                                        <img
                                                            src="/icons/documentation-9746449.png"
                                                            alt=""
                                                            width={20}
                                                            height={20}
                                                            className="h-5 w-5 object-contain opacity-95"
                                                            aria-hidden
                                                        />
                                                    </span>
                                                )}

                                                {showSearchMenu && (
                                                    <div className="absolute bottom-full left-0 z-50 mb-4 flex w-48 flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                                                        {searchType === 'local' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchType('global')
                                                                    setShowSearchMenu(false)
                                                                }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-blue-400 transition-colors hover:bg-blue-900/40"
                                                            >
                                                                <img
                                                                    src="/icons/internet-10453141.png"
                                                                    alt=""
                                                                    width={18}
                                                                    height={18}
                                                                    className="h-[18px] w-[18px] shrink-0 object-contain opacity-95"
                                                                    aria-hidden
                                                                />
                                                                Web Search
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchType('local')
                                                                    setShowSearchMenu(false)
                                                                }}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-emerald-400 transition-colors hover:bg-emerald-900/40"
                                                            >
                                                                <img
                                                                    src="/icons/documentation-9746449.png"
                                                                    alt=""
                                                                    width={18}
                                                                    height={18}
                                                                    className="h-[18px] w-[18px] shrink-0 object-contain opacity-95"
                                                                    aria-hidden
                                                                />
                                                                Document Search
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
                                        <Button
                                            onClick={handleSearch}
                                            disabled={!query.trim() || isSearching}
                                            size="icon"
                                            className="h-12 w-12 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-900/20 transition-all duration-200 hover:scale-105 hover:bg-emerald-500 active:scale-95"
                                        >
                                            <Send className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'sources' && (
                        <div className="h-full overflow-hidden">
                            <SourcesView sources={sources} />
                        </div>
                    )}

                    {view === 'graph' && (
                        <div className="h-full overflow-hidden">
                            <GraphView data={graphData} />
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}
