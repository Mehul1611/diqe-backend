import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface Entity {
    id: string
    name?: string
    type?: string
    description?: string
    human_readable_id?: number
    title?: string
}

interface Relationship {
    id: string
    source?: string
    target?: string
    weight?: number
    description?: string
}

export interface RagIndexStats {
    uploaded_file_count: number
    indexed_document_count: number
    total_chunks: number
    index_complete: boolean
}

export interface GraphData {
    entities: Entity[]
    relationships: Relationship[]
    rag_stats?: RagIndexStats
}

function RagStatsSection({ stats }: { stats: RagIndexStats }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                RAG index overview
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">
                            Documents uploaded
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            {stats.uploaded_file_count}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Files in workspace input</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">
                            Documents in index
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-400">
                            {stats.indexed_document_count}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Unique sources in corpus</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">
                            Total chunks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-400">{stats.total_chunks}</div>
                        <p className="mt-1 text-[10px] text-slate-500">Chunks available for retrieval</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-slate-400">
                            Vector index
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-lg font-bold ${stats.index_complete ? "text-emerald-400" : "text-slate-500"}`}
                        >
                            {stats.index_complete ? "Ready" : "Not complete"}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">Chroma + corpus marker</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export function GraphView({ data }: { data: GraphData | null }) {
    if (!data) {
        return <div className="p-4 text-slate-400">No data loaded yet.</div>
    }

    const stats = data.rag_stats
    const entities = data.entities ?? []
    const relationships = data.relationships ?? []
    const hasKnowledgeGraph = entities.length > 0 || relationships.length > 0

    return (
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 custom-scrollbar">
            {stats && <RagStatsSection stats={stats} />}

            {!hasKnowledgeGraph && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                    <p className="font-medium text-slate-300">No knowledge-graph entities</p>
                    <p className="mt-1 text-xs text-slate-500">
                        GraphRAG-style entity and relationship tables appear here when that pipeline is built.
                        Query answers still use RAG over the chunks above.
                    </p>
                </div>
            )}

            {hasKnowledgeGraph && (
                <div className="flex min-h-0 flex-1 flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-400">Total entities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400">{entities.length}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-400">Total relationships</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-400">{relationships.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="entities" className="flex min-h-0 flex-1 flex-col">
                        <div className="flex items-center justify-between px-1">
                            <TabsList className="bg-slate-800">
                                <TabsTrigger value="entities">Entities</TabsTrigger>
                                <TabsTrigger value="relationships">Relationships</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent
                            value="entities"
                            className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/50"
                        >
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="sticky top-0 bg-slate-800 text-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {entities.map((entity) => (
                                        <tr key={entity.id} className="hover:bg-slate-800/30">
                                            <td className="px-4 py-3 font-medium text-emerald-400">
                                                {entity.name ?? entity.title ?? entity.id}
                                            </td>
                                            <td className="px-4 py-3 text-xs uppercase tracking-wider">
                                                {entity.type ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 line-clamp-2 max-w-md">
                                                {entity.description ?? "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TabsContent>

                        <TabsContent
                            value="relationships"
                            className="custom-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/50"
                        >
                            <table className="w-full text-left text-sm text-slate-400">
                                <thead className="sticky top-0 bg-slate-800 text-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Source</th>
                                        <th className="px-4 py-3 font-medium">Target</th>
                                        <th className="px-4 py-3 font-medium">Weight</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {relationships.map((rel) => (
                                        <tr key={rel.id} className="hover:bg-slate-800/30">
                                            <td className="px-4 py-3 text-emerald-400">{rel.source ?? "—"}</td>
                                            <td className="px-4 py-3 text-blue-400">{rel.target ?? "—"}</td>
                                            <td className="px-4 py-3">{rel.weight ?? "—"}</td>
                                            <td className="px-4 py-3 line-clamp-2 max-w-md">
                                                {rel.description ?? "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    )
}
