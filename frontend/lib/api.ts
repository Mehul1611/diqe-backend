const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface FileData {
    doc_id: string
    file_path: string
    domain: string
    title: string
}

export interface ChatMessagePayload {
    role: 'user' | 'assistant'
    content: string
}

export interface ModelCard {
    id: string
    user_id: string
    name: string
    description?: string
    doc_count: number
    status: string
    created_at?: string
    updated_at?: string
}


function authHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
}

export const api = {
    processDocument: async (modelId: string, files: FileData[], token: string) => {
        const res = await fetch(`${API_BASE}/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ model_id: modelId, user_id: '', files_data: files }),
        })
        if (!res.ok) throw new Error('Processing failed')
        return res.json()
    },

    queryDocument: async (
        modelId: string,
        query: string,
        type: 'local' | 'global' = 'local',
        language: string = 'English',
        mode: string = 'fast',
        chatHistory: ChatMessagePayload[] = [],
        token?: string,
    ) => {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ model_id: modelId, user_id: '', query, type, language, mode, chat_history: chatHistory }),
        })
        if (!res.ok) throw new Error('Query failed')
        return res.json()
    },

    streamQueryDocument: async (
        modelId: string,
        query: string,
        type: 'local' | 'global' = 'local',
        language: string = 'English',
        mode: string = 'fast',
        token: string,
        chatHistory: ChatMessagePayload[] = [],
        signal?: AbortSignal,
    ) => {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ model_id: modelId, user_id: '', query, type, language, mode, chat_history: chatHistory }),
            signal,
        })
        if (!res.ok) throw new Error('Query failed')
        return res
    },

    getSources: async (modelId: string, token: string) => {
        const res = await fetch(`${API_BASE}/model/${modelId}/sources`, {
            headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed to fetch sources')
        return res.json()
    },

    getGraph: async (modelId: string, token: string) => {
        const res = await fetch(`${API_BASE}/model/${modelId}/graph`, {
            headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed to fetch data')
        return res.json()
    },

    uploadFiles: async (modelId: string, files: File[], token: string) => {
        const formData = new FormData()
        files.forEach((file) => formData.append('files', file))

        const res = await fetch(`${API_BASE}/upload/${modelId}`, {
            method: 'POST',
            headers: authHeaders(token),
            body: formData,
        })
        if (!res.ok) throw new Error('Upload failed')
        return res.json()
    },

    getStatus: async (modelId: string, token: string) => {
        const res = await fetch(`${API_BASE}/api/status/${modelId}`, {
            headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed to fetch status')
        return res.json()
    },

    getModels: async (token: string): Promise<ModelCard[]> => {
        const res = await fetch(`${API_BASE}/user/models`, {
            headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed to fetch models')
        return res.json()
    },

    createModel: async (name: string, description: string | undefined, token: string): Promise<ModelCard> => {
        const res = await fetch(`${API_BASE}/user/models`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ name, description }),
        })
        if (!res.ok) throw new Error('Failed to create model')
        return res.json()
    },

    updateModel: async (modelId: string, updates: Partial<ModelCard>, token: string): Promise<ModelCard> => {
        const res = await fetch(`${API_BASE}/user/models/${modelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error('Failed to update model')
        return res.json()
    },

    deleteModel: async (modelId: string, token: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/user/models/${modelId}`, {
            method: 'DELETE',
            headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed to delete model')
    },
}
