'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type RagIndexStats = {
    uploaded_file_count: number
    indexed_document_count: number
    total_chunks: number
    index_complete: boolean
}

type GraphData = {
    rag_stats?: RagIndexStats
}

type SourceUnit = {
    id: string
    text: string
    n_tokens: number
    document_ids: string[]
    source?: string | null
}

function StatCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: string }) {
    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-slate-400">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${tone}`}>{value}</div>
                <p className="mt-1 text-[10px] text-slate-500">{hint}</p>
            </CardContent>
        </Card>
    )
}

function prettyDocName(name: string) {
    const base = name.replace(/\.[a-z0-9]+$/i, '')
    const spaced = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    return spaced
        .split(' ')
        .filter(Boolean)
        .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
        .join(' ')
}

function firstWords(text: string, words = 18) {
    const cleaned = (text || '').replace(/\s+/g, ' ').trim()
    if (!cleaned) return ''
    const parts = cleaned.split(' ')
    const out = parts.slice(0, words).join(' ')
    return parts.length > words ? `${out}…` : out
}

export function KnowledgeView({
    sources,
    graphData,
}: {
    sources: SourceUnit[]
    graphData: GraphData | null
}) {
    const stats = graphData?.rag_stats

    const byDoc = new Map<string, { doc_id: string; chunks: number; sample: string; source?: string | null }>()
    for (const s of sources ?? []) {
        const docId = s.document_ids?.[0] ?? 'unknown'
        const cur = byDoc.get(docId) ?? { doc_id: docId, chunks: 0, sample: '', source: s.source }
        cur.chunks += 1
        if (!cur.sample && s.text) cur.sample = s.text
        if (!cur.source && s.source) cur.source = s.source
        byDoc.set(docId, cur)
    }
    const docs = Array.from(byDoc.values()).sort((a, b) => b.chunks - a.chunks)

    return (
        <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-3">
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Knowledge</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard
                        label="Total docs"
                        value={stats?.indexed_document_count ?? docs.length ?? 0}
                        hint="Unique document ids in corpus"
                        tone="text-cyan-400"
                    />
                    <StatCard
                        label="Total chunks"
                        value={stats?.total_chunks ?? sources?.length ?? 0}
                        hint="Chunks available for retrieval"
                        tone="text-amber-400"
                    />
                    <StatCard
                        label="Uploaded files"
                        value={stats?.uploaded_file_count ?? '—'}
                        hint="Files present in input workspace"
                        tone="text-emerald-400"
                    />
                    <StatCard
                        label="Index"
                        value={stats ? (stats.index_complete ? 'Ready' : 'Building') : '—'}
                        hint="Vector index marker"
                        tone={stats?.index_complete ? 'text-emerald-400' : 'text-slate-500'}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200">Documents</p>
                        <p className="text-xs text-slate-500">Doc id, chunk count, and a sample preview</p>
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {docs.length} docs
                    </span>
                </div>

                {docs.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-slate-500">No documents found yet.</div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {docs.map((d) => (
                            <div key={d.doc_id} className="px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-200">
                                            {prettyDocName(d.source || d.doc_id)}
                                        </p>
                                        <p className="truncate font-mono text-[11px] text-emerald-300">doc_id: {d.doc_id}</p>
                                    </div>
                                    <span className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-bold text-slate-300">
                                        {d.chunks} chunks
                                    </span>
                                </div>
                                {d.sample ? (
                                    <p className="mt-2 text-xs text-slate-300/90">{firstWords(d.sample, 18)}</p>
                                ) : (
                                    <p className="mt-2 text-xs text-slate-500">No preview available.</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

