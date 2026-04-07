const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface FileData {
    doc_id: string
    file_path: string
    domain: string
    title: string
}

export const api = {
    processDocument: async (modelId: string, files: FileData[]) => {
        const res = await fetch(`${API_BASE}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: modelId,
                files_data: files
            })
        })
        if (!res.ok) throw new Error('Processing failed')
        return res.json()
    },

    queryDocument: async (modelId: string, query: string, type: 'local' | 'global' = 'local', language: string = 'English', mode: string = 'fast') => {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: modelId,
                query: query,
                type: type,
                language: language,
                mode: mode
            })
        })
        if (!res.ok) throw new Error('Query failed')
        return res.json()
    },

    streamQueryDocument: async (modelId: string, query: string, type: 'local' | 'global' = 'local', language: string = 'English', mode: string = 'fast') => {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model_id: modelId,
                query: query,
                type: type,
                language: language,
                mode: mode
            })
        })
        if (!res.ok) throw new Error('Query failed')
        return res
    },

    getSources: async (modelId: string) => {
        const res = await fetch(`${API_BASE}/model/${modelId}/sources`)
        if (!res.ok) throw new Error('Failed to fetch sources')
        return res.json()
    },

    getGraph: async (modelId: string) => {
        const res = await fetch(`${API_BASE}/model/${modelId}/graph`)
        if (!res.ok) throw new Error('Failed to fetch graph data')
        return res.json()
    },

    uploadFiles: async (modelId: string, files: File[]) => {
        const formData = new FormData()
        files.forEach(file => {
            formData.append('files', file)
        })

        const res = await fetch(`${API_BASE}/upload/${modelId}`, {
            method: 'POST',
            body: formData
        })

        if (!res.ok) throw new Error('Upload failed')
        return res.json()
    },

    getStatus: async (modelId: string) => {
        const res = await fetch(`${API_BASE}/api/status/${modelId}`)
        if (!res.ok) throw new Error('Failed to fetch status')
        return res.json()
    }
}
