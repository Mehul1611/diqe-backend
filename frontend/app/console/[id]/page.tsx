'use client'

import { useState, use } from 'react'
import { Send, FileText, Search, Zap, LayoutDashboard, Database, Plus, Globe, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { SourcesView } from '@/components/SourcesView'
import { GraphView } from '@/components/GraphView'

export default function ConsolePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [query, setQuery] = useState('')
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: 'Ready to query. The knowledge graph has been successfully indexed.' }
    ])
    const [isSearching, setIsSearching] = useState(false)
    const [view, setView] = useState<'console' | 'sources' | 'graph'>('console')

    const [sources, setSources] = useState<any[]>([])
    const [graphData, setGraphData] = useState<any>(null)
    const [loadingData, setLoadingData] = useState(false)

    // New states for language, mode, and search type
    const [language, setLanguage] = useState('English')
    const [mode, setMode] = useState<'fast' | 'thinking'>('fast')
    const [searchType, setSearchType] = useState<'local' | 'global'>('local')
    const [showSearchMenu, setShowSearchMenu] = useState(false)

    const handleSearch = async () => {
        if (!query.trim()) return

        const tempQuery = query
        setMessages(prev => [...prev, { role: 'user', content: tempQuery }])
        setQuery('')
        setIsSearching(true)

        try {
            const res = await api.streamQueryDocument(id, tempQuery, searchType, language, mode)
            const reader = res.body?.getReader()
            const decoder = new TextDecoder("utf-8")

            // Add an empty assistant message to stream into
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
            setIsSearching(false) // Hide spinner once streaming starts

            if (reader) {
                let accumulatedText = ""
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    accumulatedText += chunk

                    setMessages(prev => {
                        const newMessages = [...prev]
                        newMessages[newMessages.length - 1].content = accumulatedText
                        return newMessages
                    })
                }
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error executing query." }])
            setIsSearching(false)
        }
    }

    const loadSources = async () => {
        if (sources.length > 0) {
            setView('sources')
            return
        }
        setLoadingData(true)
        try {
            const res = await api.getSources(id)
            setSources(res.data)
            setView('sources')
        } catch (e) {
            console.error("Failed to load sources", e)
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
            console.error("Failed to load graph", e)
        } finally {
            setLoadingData(false)
        }
    }

    return (
        <main className="flex h-screen bg-slate-950 text-slate-200">
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
                <div className="flex items-center space-x-2 mb-8 px-2">
                    <Database className="h-6 w-6 text-emerald-500" />
                    <span className="font-bold text-lg tracking-tight">
                        <span className="text-white">D</span>
                        <span className="text-emerald-500">I</span>
                        <span className="text-white">QE</span>
                        <span className="text-slate-300 font-medium ml-2">Core</span>
                    </span>
                </div>

                <nav className="space-y-2">
                    <Button
                        variant={view === 'console' ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", view === 'console' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "hover:bg-slate-800/50")}
                        onClick={() => setView('console')}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Console
                    </Button>
                    <Button
                        variant={view === 'sources' ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", view === 'sources' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "hover:bg-slate-800/50")}
                        onClick={loadSources}
                    >
                        <FileText className="mr-2 h-4 w-4" /> Source Docs
                    </Button>
                    <Button
                        variant={view === 'graph' ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", view === 'graph' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "hover:bg-slate-800/50")}
                        onClick={loadGraph}
                    >
                        <Zap className="mr-2 h-4 w-4" /> Graph View
                    </Button>
                </nav>

                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-slate-800 p-3 text-xs text-slate-400">
                    <p>Model ID:</p>
                    <p className="font-mono text-emerald-500 truncate">{id}</p>
                </div>
            </aside>

            <section className="flex flex-1 flex-col h-full overflow-hidden">
                <header className="flex h-16 items-center border-b border-slate-800 bg-slate-900/20 px-6 backdrop-blur-sm shrink-0">
                    <h1 className="text-lg font-medium text-white">
                        {view === 'console' && 'Query Interface'}
                        {view === 'sources' && 'Source Documents'}
                        {view === 'graph' && 'Knowledge Graph'}
                    </h1>
                    {loadingData && <span className="ml-4 text-xs text-slate-500 animate-pulse">Loading data...</span>}
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {view === 'console' && (
                        <div className="h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex w-full max-w-3xl",
                                            msg.role === 'user' ? "ml-auto justify-end" : "justify-start"
                                        )}
                                    >
                                        <Card className={cn(
                                            "max-w-[80%] p-4",
                                            msg.role === 'user' ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-50" : "bg-slate-800/50 border-slate-700"
                                        )}>
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        </Card>
                                    </div>
                                ))}
                                {isSearching && (
                                    <div className="flex w-full justify-start">
                                        <div className="flex items-center space-x-2 rounded-lg bg-slate-800/30 px-4 py-2 text-sm text-slate-400">
                                            <Search className="h-4 w-4 animate-spin" />
                                            <span>Generating precise answer...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-slate-800 bg-slate-900/50 pt-6 px-6 pb-10 backdrop-blur-md shrink-0">
                                <div className="mx-auto max-w-3xl">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <div className="flex items-center bg-slate-800/40 rounded-lg p-1 border border-slate-800/50 backdrop-blur-sm">
                                            <button
                                                onClick={() => setMode('fast')}
                                                className={cn(
                                                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                                                    mode === 'fast' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-slate-400 hover:text-slate-200"
                                                )}
                                            >
                                                Fast Mode
                                            </button>
                                            <button
                                                onClick={() => setMode('thinking')}
                                                className={cn(
                                                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                                                    mode === 'thinking' ? "bg-yellow-600 text-white shadow-lg shadow-yellow-900/20" : "text-slate-400 hover:text-slate-200"
                                                )}
                                            >
                                                Thinking Mode
                                            </button>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mr-1">Language</span>
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                className={cn(
                                                    "bg-slate-900/80 border border-slate-700/50 text-xs rounded-lg p-2 pr-8 transition-all hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat",
                                                    language === 'English' ? 'text-indigo-400' :
                                                    language === 'Spanish' ? 'text-amber-400' :
                                                    language === 'French' ? 'text-pink-400' :
                                                    language === 'German' ? 'text-yellow-400' :
                                                    language === 'Dutch' ? 'text-orange-400' :
                                                    language === 'Chinese' ? 'text-red-400' :
                                                    language === 'Japanese' ? 'text-rose-400' : 'text-slate-300'
                                                )}
                                            >
                                                <option value="English">English</option>
                                                <option value="Spanish">Spanish</option>
                                                <option value="French">French</option>
                                                <option value="German">German</option>
                                                <option value="Dutch">Dutch</option>
                                                <option value="Chinese">Chinese</option>
                                                <option value="Japanese">Japanese</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className={cn(
                                            "relative flex-1 flex items-center w-full rounded-xl border px-3 py-2 shadow-inner transition-all",
                                            searchType === 'local'
                                                ? "border-emerald-900/50 bg-emerald-950/10 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500"
                                                : "border-blue-900/50 bg-blue-950/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                                        )}>
                                            <div className="relative flex items-center space-x-2 mr-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSearchMenu(!showSearchMenu)}
                                                    className="flex items-center justify-center rounded-full bg-slate-800 p-1.5 hover:bg-slate-700 transition border border-slate-600"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-slate-300" />
                                                </button>
                                                {searchType === 'global' && (
                                                    <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-700/50 whitespace-nowrap">
                                                        Web Search
                                                    </span>
                                                )}
                                                {searchType === 'local' && (
                                                    <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-700/50 whitespace-nowrap">
                                                        Document Search
                                                    </span>
                                                )}
                                                
                                                {showSearchMenu && (
                                                    <div className="absolute left-0 bottom-full mb-4 w-36 rounded-lg border border-slate-700 bg-slate-800 shadow-xl z-50 overflow-hidden flex flex-col">
                                                        {searchType === 'local' ? (
                                                            <button
                                                                onClick={() => { setSearchType('global'); setShowSearchMenu(false); }}
                                                                className="w-full text-left px-3 py-2 text-xs transition-colors text-blue-400 hover:bg-blue-900/40 font-bold"
                                                            >
                                                                Web Search
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setSearchType('local'); setShowSearchMenu(false); }}
                                                                className="w-full text-left px-3 py-2 text-xs transition-colors text-emerald-400 hover:bg-emerald-900/40 font-bold"
                                                            >
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
                                                placeholder="Ask questions about your documents..."
                                                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none py-1 min-w-0"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSearch}
                                            disabled={!query.trim() || isSearching}
                                            size="icon"
                                            className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
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
