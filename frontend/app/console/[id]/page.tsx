'use client'

import { useState, use } from 'react'
import { Send, FileText, Search, Zap, LayoutDashboard, Database } from 'lucide-react'
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

    // Data states
    const [sources, setSources] = useState<any[]>([])
    const [graphData, setGraphData] = useState<any>(null)
    const [loadingData, setLoadingData] = useState(false)

    const handleSearch = async () => {
        if (!query.trim()) return

        // Add User Message
        const tempQuery = query
        setMessages(prev => [...prev, { role: 'user', content: tempQuery }])
        setQuery('')
        setIsSearching(true)

        try {
            const res = await api.queryDocument(id, tempQuery, 'local')

            setMessages(prev => [...prev, { role: 'assistant', content: res.answer }])
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error executing query." }])
        } finally {
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
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
                <div className="flex items-center space-x-2 text-emerald-500 mb-8 px-2">
                    <Database className="h-6 w-6" />
                    <span className="font-bold text-lg">DIQE Core</span>
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

            {/* Main Content */}
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
                    {/* Console View */}
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

                            <div className="border-t border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md shrink-0">
                                <div className="mx-auto flex max-w-3xl items-center space-x-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            placeholder="Ask complex questions about your documents..."
                                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <div className="absolute right-3 top-3 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                                            Global Search
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSearch}
                                        disabled={!query.trim() || isSearching}
                                        size="icon"
                                        className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-500"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sources View */}
                    {view === 'sources' && (
                        <div className="h-full overflow-hidden">
                            <SourcesView sources={sources} />
                        </div>
                    )}

                    {/* Graph View */}
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
