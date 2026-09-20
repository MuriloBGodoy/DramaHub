import { useMemo, useState } from 'react'
import { api, fmtTime } from '../api'

const GENRES = ['Romance', 'Drama', 'Comédia', 'Suspense', 'Fantasia', 'Sci-Fi', 'Ação', 'Terror', 'Outro']

/** Importa uma playlist/vídeo de um canal oficial do YouTube para o catálogo. */
export default function YouTubeImport({ onDone }) {
  const [form, setForm] = useState({ url: '', mode: 'collection', genre: 'Romance', tags: '', minMin: 40, titleFilter: '', excludeFilter: '', featured: false, source: 'yt' })
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // videos que passam nos filtros atuais
  const passes = useMemo(() => {
    if (!preview) return () => true
    const inc = form.titleFilter ? new RegExp(form.titleFilter, 'i') : null
    const exc = form.excludeFilter ? new RegExp(form.excludeFilter, 'i') : null
    const min = Number(form.minMin || 0) * 60
    return (v) => v.available && (v.durationSec || 0) >= min && (!inc || inc.test(v.title)) && (!exc || !exc.test(v.title))
  }, [preview, form.titleFilter, form.excludeFilter, form.minMin])

  const doPreview = async () => {
    setBusy(true); setMsg(null); setPreview(null)
    try {
      const p = await api.importPreview(form.url)
      setPreview(p)
      setSelected(new Set(p.videos.filter(passes).map((v) => v.videoId)))
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const applyFilters = () => preview && setSelected(new Set(preview.videos.filter(passes).map((v) => v.videoId)))

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const doImport = async () => {
    if (!preview || selected.size === 0) return
    setBusy(true); setMsg(null)
    try {
      const r = await api.importRun({
        url: form.url, mode: form.mode, genre: form.genre, tags: form.tags, featured: form.featured, source: form.source,
        episodes: preview.videos.filter((v) => selected.has(v.videoId)).map((v) => ({ videoId: v.videoId })),
      })
      const skipped = r.skipped.length ? ` · ${r.skipped.length} pulados (${r.skipped[0].includes('ja importado') ? 'já importados' : 'indisponíveis'})` : ''
      setMsg({ type: 'ok', text: `Importado: ${r.created.length} série(s), ${r.episodes} episódio(s)${skipped}` })
      setPreview(null)
      onDone?.()
    } catch (e) { setMsg({ type: 'err', text: e.message }) } finally { setBusy(false) }
  }

  const avail = preview?.videos.filter((v) => v.available).length ?? 0

  return (
    <div className="form">
      <h3>Importar do YouTube (canais oficiais)</h3>
      <div className="notice info">
        Cole o link de uma <b>playlist</b> ou <b>vídeo</b> de um canal oficial (ShortMax, MoboReels, StardustTV...).
        <b> Coleção</b>: cada vídeo vira uma série (drama completo em 1 vídeo). <b>Série</b>: a playlist inteira vira uma série com episódios.
      </div>
      {msg && <div className={`notice ${msg.type}`}>{msg.text}</div>}

      <label>Link da playlist ou vídeo
        <div className="inline" style={{ gap: 8 }}>
          <input style={{ flex: 1 }} value={form.url} onChange={set('url')} placeholder="https://www.youtube.com/playlist?list=..." />
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !form.url} onClick={doPreview}>{busy ? '...' : 'Ler'}</button>
        </div>
      </label>

      <div className="two">
        <label>Modo
          <select value={form.mode} onChange={set('mode')}>
            <option value="collection">Coleção (1 vídeo = 1 série)</option>
            <option value="series">Série (1 vídeo = 1 episódio)</option>
          </select>
        </label>
        <label>Gênero
          <select value={form.genre} onChange={set('genre')}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
      </div>
      <div className="two">
        <label>Duração mínima (min)<input type="number" min="0" value={form.minMin} onChange={set('minMin')} onBlur={applyFilters} /></label>
        <label>Tags (vírgula)<input value={form.tags} onChange={set('tags')} placeholder="dublado, ceo" /></label>
      </div>
      <div className="two">
        <label>Só títulos contendo (regex)<input value={form.titleFilter} onChange={set('titleFilter')} onBlur={applyFilters} placeholder="Dublado|PT DUB" /></label>
        <label>Excluir títulos contendo (regex)<input value={form.excludeFilter} onChange={set('excludeFilter')} onBlur={applyFilters} placeholder="Parte|Trailer" /></label>
      </div>
      <div className="two">
        <label>Origem do conteúdo
          <select value={form.source} onChange={set('source')}>
            <option value="yt">Plataforma oficial (YouTube)</option>
            <option value="ai">✨ Gerado por IA (canal de dramas IA)</option>
          </select>
        </label>
        <label className="inline" style={{ alignSelf: 'end' }}><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Destacar na tela inicial</label>
      </div>

      {preview && (
        <>
          <div className="card-sub">
            <b style={{ color: 'var(--text)' }}>{preview.title}</b> · {preview.channel} · {preview.videos.length} vídeos ({avail} disponíveis) · {selected.size} selecionados
          </div>
          <div className="import-list">
            {preview.videos.map((v) => (
              <label key={v.videoId} className={`import-item ${v.available ? '' : 'off'}`}>
                <input type="checkbox" disabled={!v.available} checked={selected.has(v.videoId)} onChange={() => toggle(v.videoId)} />
                <img src={v.thumbnailUrl} alt="" loading="lazy" />
                <span className="t">{v.title}</span>
                <span className="d">{v.durationSec ? fmtTime(v.durationSec) : ''}</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary" disabled={busy || selected.size === 0} onClick={doImport}>
            {busy ? 'Importando...' : `Importar ${selected.size} vídeo(s)`}
          </button>
        </>
      )}
    </div>
  )
}
