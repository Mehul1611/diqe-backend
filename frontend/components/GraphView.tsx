import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface Entity {
    id: string
    name: string
    type: string
    description: string
    human_readable_id: number
}

interface Relationship {
    id: string
    source: string
    target: string
    weight: number
    description: string
}

interface GraphData {
    entities: Entity[]
    relationships: Relationship[]
}

export function GraphView({ data }: { data: GraphData }) {
    if (!data || (!data.entities.length && !data.relationships.length)) {
        return <div className="text-slate-400 p-4">No graph data found.</div>
    }

    return (
        <div className="h-full flex flex-col p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">Total Entities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">{data.entities.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-400">Total Relationships</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">{data.relationships.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="entities" className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-1">
                    <TabsList className="bg-slate-800">
                        <TabsTrigger value="entities">Entities</TabsTrigger>
                        <TabsTrigger value="relationships">Relationships</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="entities" className="flex-1 min-h-0 overflow-y-auto mt-4 custom-scrollbar rounded-lg border border-slate-800 bg-slate-900/50">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-800 text-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.entities.map((entity) => (
                                <tr key={entity.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3 font-medium text-emerald-400">{entity.name}</td>
                                    <td className="px-4 py-3 text-xs uppercase tracking-wider">{entity.type}</td>
                                    <td className="px-4 py-3 line-clamp-2 max-w-md">{entity.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TabsContent>

                <TabsContent value="relationships" className="flex-1 min-h-0 overflow-y-auto mt-4 custom-scrollbar rounded-lg border border-slate-800 bg-slate-900/50">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-800 text-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 font-medium">Source</th>
                                <th className="px-4 py-3 font-medium">Target</th>
                                <th className="px-4 py-3 font-medium">Weight</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data.relationships.map((rel) => (
                                <tr key={rel.id} className="hover:bg-slate-800/30">
                                    <td className="px-4 py-3 text-emerald-400">{rel.source}</td>
                                    <td className="px-4 py-3 text-blue-400">{rel.target}</td>
                                    <td className="px-4 py-3">{rel.weight}</td>
                                    <td className="px-4 py-3 line-clamp-2 max-w-md">{rel.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TabsContent>
            </Tabs>
        </div>
    )
}
