/**
 * Client HTTP pour l'orchestrateur FastAPI.
 *
 * Wrapper minimaliste autour de fetch, typé sur les schémas générés depuis
 * openapi.json par openapi-typescript. Ne pas utiliser fetch() directement
 * dans les composants — toujours passer par ce module.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

export const BASE_URL = 'http://localhost:8001'

// ─── Erreurs typées ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string
  ) {
    super(`HTTP ${status}: ${detail}`)
    this.name = 'ApiError'
  }
}

// ─── Primitives ───────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (res.status === 204) {
    return undefined as T
  }

  if (res.redirected) {
    return res.url as T
  }

  const data: unknown = await res.json()

  if (!res.ok) {
    const detail =
      typeof data === 'object' &&
      data !== null &&
      'detail' in data &&
      typeof (data as { detail: unknown }).detail === 'string'
        ? (data as { detail: string }).detail
        : res.statusText
    throw new ApiError(res.status, detail)
  }

  return data as T
}

// ─── Méthodes HTTP ────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (path: string) =>
    request<void>(path, { method: 'DELETE' }),
}

// ─── Types générés depuis openapi.json ───────────────────────────────────────

import type { components } from '../../api/types/api'

export type SpecimenRead   = components['schemas']['SpecimenRead']
export type SpecimenCreate = components['schemas']['SpecimenCreate']
export type SessionRead    = components['schemas']['SessionRead']
export type SessionDetail  = components['schemas']['SessionDetail']
export type SessionCreate  = components['schemas']['SessionCreate']
export type PresetRead     = components['schemas']['PresetRead']
export type PresetCreate   = components['schemas']['PresetCreate']
export type JobRead        = components['schemas']['JobRead']
export type AssetRead      = components['schemas']['AssetRead']
export type QaCheckRead    = components['schemas']['QaCheckRead']
export type CalibrationRead = components['schemas']['CalibrationRead']

// ─── Endpoints par domaine ────────────────────────────────────────────────────

export const healthApi = {
  check: () => api.get<Record<string, string>>('/health'),
}

export const specimensApi = {
  list: (params?: { limit?: number; offset?: number; category?: string; search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.limit    !== undefined) qs.set('limit',    String(params.limit))
    if (params?.offset   !== undefined) qs.set('offset',   String(params.offset))
    if (params?.category)               qs.set('category', params.category)
    if (params?.search)                 qs.set('search',   params.search)
    const q = qs.toString()
    return api.get<SpecimenRead[]>(`/specimens${q ? `?${q}` : ''}`)
  },

  search: (query: string, category?: string) => {
    const qs = new URLSearchParams({ q: query })
    if (category) qs.set('category', category)
    return api.get<SpecimenRead[]>(`/specimens/search?${qs.toString()}`)
  },

  get:    (id: string) => api.get<SpecimenRead>(`/specimens/${id}`),
  create: (body: SpecimenCreate) => api.post<SpecimenRead>('/specimens', body),
  update: (id: string, body: Partial<SpecimenCreate>) =>
    api.patch<SpecimenRead>(`/specimens/${id}`, body),
  delete: (id: string) => api.delete(`/specimens/${id}`),

  // Thumbnail — upload multipart (ne pas passer Content-Type : fetch le génère avec le boundary)
  uploadThumbnail: async (id: string, file: File): Promise<SpecimenRead> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${BASE_URL}/specimens/${id}/thumbnail`, {
      method: 'POST',
      body: formData,
      // Pas de Content-Type : fetch le génère automatiquement avec le boundary multipart
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const detail = (data as { detail?: string }).detail ?? res.statusText
      throw new ApiError(res.status, detail)
    }
    return res.json() as Promise<SpecimenRead>
  },
  getThumbnailUrl: async (id: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/specimens/${id}/thumbnail`, {
      method: 'GET',
      redirect: 'follow',
    })
    console.log('thumbnail redirected:', res.redirected, 'url:', res.url)
    return res.url
  },

  thumbnailUrl: (id: string) => `${BASE_URL}/specimens/${id}/thumbnail`,
}

export const sessionsApi = {
  list: (params?: { status?: string; specimen_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status)                  qs.set('status',      params.status)
    if (params?.specimen_id)             qs.set('specimen_id', params.specimen_id)
    if (params?.limit    !== undefined)  qs.set('limit',       String(params.limit))
    if (params?.offset   !== undefined)  qs.set('offset',      String(params.offset))
    const q = qs.toString()
    return api.get<SessionRead[]>(`/sessions${q ? `?${q}` : ''}`)
  },
  get:              (id: string) => api.get<SessionDetail>(`/sessions/${id}`),
  create: async (body: SessionCreate, thumbnail?: File): Promise<SessionRead> => {
    // Avec image → multipart/form-data
    if (thumbnail) {
        const formData = new FormData()
        Object.entries(body).forEach(([k, v]) => {
        if (v !== null && v !== undefined) formData.append(k, String(v))
        })
        formData.append('thumbnail', thumbnail)
        const res = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        body: formData,
        // Pas de Content-Type : fetch génère le boundary multipart
        })
        if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new ApiError(res.status, (data as { detail?: string }).detail ?? res.statusText)
        }
        return res.json()
    }
    // Sans image → JSON classique
    return api.post<SessionRead>('/sessions', body)
  },
  startAcquisition: (id: string) => api.post<SessionRead>(`/sessions/${id}/start-acquisition`),
  startProcessing:  (id: string) => api.post<SessionRead>(`/sessions/${id}/start-processing`),
  retry:            (id: string) => api.post<SessionRead>(`/sessions/${id}/retry`),
  close:            (id: string) => api.post<SessionRead>(`/sessions/${id}/close`),
  delete:           (id: string) => api.delete(`/sessions/${id}`),
}

export const presetsApi = {
  list: (params?: { is_system?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.is_system !== undefined) qs.set('is_system', String(params.is_system))
    const q = qs.toString()
    return api.get<PresetRead[]>(`/capture-presets${q ? `?${q}` : ''}`)
  },
  get:       (id: string) => api.get<PresetRead>(`/capture-presets/${id}`),
  create:    (body: PresetCreate) => api.post<PresetRead>('/capture-presets', body),
  update:    (id: string, body: Partial<PresetCreate>) =>
    api.patch<PresetRead>(`/capture-presets/${id}`, body),
  delete:    (id: string) => api.delete(`/capture-presets/${id}`),
  duplicate: (id: string, name: string) =>
    api.post<PresetRead>(`/capture-presets/${id}/duplicate`, { name }),
}

export const jobsApi = {
  list: (params?: { session_id?: string; status?: string; type?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.session_id)            qs.set('session_id', params.session_id)
    if (params?.status)                qs.set('status',     params.status)
    if (params?.type)                  qs.set('type',       params.type)
    if (params?.limit !== undefined)   qs.set('limit',      String(params.limit))
    const q = qs.toString()
    return api.get<JobRead[]>(`/jobs${q ? `?${q}` : ''}`)
  },
  get:    (id: string) => api.get<JobRead>(`/jobs/${id}`),
  cancel: (id: string) => api.post<JobRead>(`/jobs/${id}/cancel`),
  logs:   (id: string) => api.get<{ logs: string }>(`/jobs/${id}/logs`),
}

export const assetsApi = {
  list: (params?: { session_id?: string; asset_type?: string }) => {
    const qs = new URLSearchParams()
    if (params?.session_id) qs.set('session_id', params.session_id)
    if (params?.asset_type) qs.set('asset_type', params.asset_type)
    const q = qs.toString()
    return api.get<AssetRead[]>(`/assets${q ? `?${q}` : ''}`)
  },
  get:         (id: string) => api.get<AssetRead>(`/assets/${id}`),
  downloadUrl: (id: string) => `${BASE_URL}/assets/${id}/download`,
  previewUrl:  (id: string) => `${BASE_URL}/assets/${id}/preview`,
}

export const qaApi = {
  list: (sessionId: string) =>
    api.get<QaCheckRead[]>(`/sessions/${sessionId}/qa`),
  summary: (sessionId: string) =>
    api.get<{ passed: number; failed: number; by_type: Record<string, unknown> }>(
      `/sessions/${sessionId}/qa/summary`
    ),
}