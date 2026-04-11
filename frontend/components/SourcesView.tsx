'use client'

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface SourceUnit {
    id: string
    text: string
    n_tokens: number
    document_ids: string[]
}

export function SourcesView({ sources }: { sources: SourceUnit[] }) {
    if (!sources || sources.length === 0) {
        return <div className="text-slate-400 p-4">No source documents found.</div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full overflow-y-auto custom-scrollbar">
            {sources.map((source) => (
                <Card key={source.id} className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-mono text-emerald-400 truncate" title={source.id}>
                            ID: {source.id.slice(0, 8)}...
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-300 line-clamp-6 whitespace-pre-wrap font-mono">
                            {source.text}
                        </p>
                        <div className="mt-2 flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                            <span>Tokens: {source.n_tokens}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
