// Cliente HTTP da API. Em dev o Vite faz proxy de /api para o Spring Boot (porta 8080).
// Em producao, VITE_API_URL pode apontar para o backend (ou o Netlify faz o proxy de /api).

const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'dramahub.token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* privado */ } }

/** URL absoluta para recursos servidos pelo backend (ex: /api/stream/1) com o token na query. */
export const mediaUrl = (path) => (path?.startsWith('/api/') ? `${BASE}${path}?t=${encodeURIComponent(getToken() || '')}` : path)

async function request(path, options = {}) {
  const headers = {}
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { ...options, headers: { ...headers, ...(options.headers || {}) } })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) { setToken(null); window.dispatchEvent(new Event('dramahub:session-lost')) }
    throw new Error(data?.error || `Erro ${res.status}`)
  }
  return data
}

const json = (body) => JSON.stringify(body)

export const api = {
  // sessão (sem login)
  authStatus: () => request('/api/auth/status'),
  newSession: () => request('/api/auth/session', { method: 'POST' }),
  endSession: () => request('/api/auth/session', { method: 'DELETE' }),
  me: () => request('/api/auth/me'),
  updateMe: (body) => request('/api/auth/me', { method: 'PUT', body: json(body) }),
  unlockAdmin: (code) => request('/api/auth/admin', { method: 'POST', body: json({ code }) }),

  // catálogo
  series: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return request(`/api/series${qs ? `?${qs}` : ''}`)
  },
  genres: () => request('/api/genres'),
  seriesDetail: (id) => request(`/api/series/${id}`),
  episode: (id) => request(`/api/episodes/${id}`),
  feed: () => request('/api/feed'),

  // meu progresso / favoritos
  saveProgress: (episodeId, positionSec, completed, keepalive = false) =>
    request(`/api/me/progress/${episodeId}`, { method: 'PUT', body: json({ positionSec, completed }), keepalive }),
  seriesProgress: (seriesId) => request(`/api/me/progress/series/${seriesId}`),
  continueWatching: () => request('/api/me/continue'),
  favorites: () => request('/api/me/favorites'),
  isFavorite: (seriesId) => request(`/api/me/favorites/${seriesId}`),
  toggleFavorite: (seriesId) => request(`/api/me/favorites/${seriesId}/toggle`, { method: 'POST' }),

  // estúdio (admin)
  createSeries: (body) => request('/api/series', { method: 'POST', body: json(body) }),
  updateSeries: (id, body) => request(`/api/series/${id}`, { method: 'PUT', body: json(body) }),
  deleteSeries: (id) => request(`/api/series/${id}`, { method: 'DELETE' }),
  addEpisodeByUrl: (seriesId, body) => request(`/api/series/${seriesId}/episodes`, { method: 'POST', body: json(body) }),
  deleteEpisode: (id) => request(`/api/episodes/${id}`, { method: 'DELETE' }),

  // roteirista IA (admin)
  aiStatus: () => request('/api/ai/status'),
  aiScript: (body) => request('/api/ai/script', { method: 'POST', body: json(body) }),

  // importacao (YouTube)
  importPreview: (url) => request(`/api/import/preview?url=${encodeURIComponent(url)}`),
  importRun: (body) => request('/api/import', { method: 'POST', body: json(body) }),
}

/** Upload multipart com progresso (fetch nao expoe progresso de envio). */
export function uploadEpisode(seriesId, fields, file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== '' && form.append(k, v))
    form.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/api/series/${seriesId}/episodes`)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken() || ''}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* vazio */ }
      xhr.status < 300 ? resolve(data) : reject(new Error(data?.error || `Erro ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Falha de rede no upload'))
    xhr.send(form)
  })
}

export const fmtTime = (s) => {
  s = Math.max(0, Math.floor(s || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
