// Estudio: le playlists/videos dos canais oficiais no YouTube e importa como series do catalogo.
import { cors, json, requireAdmin, userClient } from '../_shared/http.ts'
import { preview, UserError } from '../_shared/youtube.ts'
import { planImport } from '../_shared/importer.ts'
import type { ImportRequest } from '../_shared/importer.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = userClient(req)
  const denied = await requireAdmin(db)
  if (denied) return denied

  try {
    const body = await req.json() as ImportRequest & { action: string }
    if (!body.url?.trim()) return json({ error: 'Informe o link' }, 400)
    const p = await preview(body.url)
    if (body.action === 'preview') return json(p)

    // ids ja importados (para nao duplicar)
    const existing = new Set<string>()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('episode').select('youtube_id').not('youtube_id', 'is', null).range(from, from + 999)
      if (error) throw error
      data.forEach((r) => existing.add(r.youtube_id))
      if (data.length < 1000) break
    }

    const plan = planImport(p, body, existing)
    const created = []
    let episodes = 0
    for (let i = 0; i < plan.series.length; i++) {
      const { data: s, error } = await db.from('series').insert(plan.series[i]).select().single()
      if (error) throw error
      const { error: e2 } = await db.from('episode').insert(plan.episodes[i].map((e) => ({ ...e, series_id: s.id })))
      if (e2) { await db.from('series').delete().eq('id', s.id); throw e2 }
      episodes += plan.episodes[i].length
      created.push({ id: s.id, title: s.title, coverUrl: s.cover_url, genre: s.genre, source: s.source, episodeCount: plan.episodes[i].length })
    }
    return json({ created, episodes, skipped: plan.skipped })
  } catch (e) {
    if (e instanceof UserError || e instanceof SyntaxError) return json({ error: e.message }, 400)
    console.error(e)
    return json({ error: (e as Error).message || 'Falha na importação' }, 500)
  }
})
