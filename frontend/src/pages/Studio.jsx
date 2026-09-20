import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadEpisode } from '../api'
import { SparkIcon } from '../components/Icons'
import YouTubeImport from '../components/YouTubeImport'
import ScriptWriter from '../components/ScriptWriter'

const emptySeries = { title: '', synopsis: '', coverUrl: '', genre: 'Romance', tags: '', credit: '', featured: false, source: 'ai' }
const emptyEp = { seriesId: '', number: 1, title: '', videoUrl: '', thumbnailUrl: '', mode: 'file' }

export default function Studio() {
  const [list, setList] = useState([])
  const [sForm, setSForm] = useState(emptySeries)
  const [eForm, setEForm] = useState(emptyEp)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const reload = () => api.series().then(setList).catch(() => {})
  useEffect(() => { reload() }, [])

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000) }

  const createSeries = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const s = await api.createSeries(sForm)
      flash('ok', `Série "${s.title}" criada! Agora adicione os episódios abaixo.`)
      setSForm(emptySeries)
      setEForm((f) => ({ ...f, seriesId: String(s.id), number: 1 }))
      reload()
    } catch (err) { flash('err', err.message) } finally { setBusy(false) }
  }

  const addEpisode = async (e) => {
    e.preventDefault()
    if (!eForm.seriesId) return flash('err', 'Escolha a série')
    setBusy(true)
    try {
      const fields = { number: eForm.number, title: eForm.title, thumbnailUrl: eForm.thumbnailUrl }
      if (eForm.mode === 'file') {
        if (!file) throw new Error('Selecione o arquivo de vídeo')
        setProgress(0)
        await uploadEpisode(eForm.seriesId, fields, file, setProgress)
      } else {
        if (!eForm.videoUrl) throw new Error('Informe a URL do vídeo')
        await api.addEpisodeByUrl(eForm.seriesId, { ...fields, videoUrl: eForm.videoUrl })
      }
      flash('ok', `Episódio ${eForm.number} adicionado!`)
      setEForm((f) => ({ ...f, number: Number(f.number) + 1, title: '', videoUrl: '', thumbnailUrl: '' }))
      setFile(null)
      reload()
    } catch (err) { flash('err', err.message) } finally { setBusy(false); setProgress(null) }
  }

  const removeSeries = async (s) => {
    if (!confirm(`Apagar "${s.title}" e todos os episódios?`)) return
    try { await api.deleteSeries(s.id); reload() } catch (err) { flash('err', err.message) }
  }

  const sf = (k) => (e) => setSForm({ ...sForm, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const ef = (k) => (e) => setEForm({ ...eForm, [k]: e.target.value })

  // sugere o proximo numero de episodio ao trocar de serie
  const onPickSeries = (e) => {
    const id = e.target.value
    const s = list.find((x) => String(x.id) === id)
    setEForm({ ...eForm, seriesId: id, number: (s?.episodeCount || 0) + 1 })
  }

  return (
    <div className="page">
      <h1 className="page-title">Estúdio</h1>

      <div className="notice info" style={{ marginBottom: 16 }}>
        <b><SparkIcon /> Como funciona:</b> gere os vídeos dos episódios em uma ferramenta de IA
        (Kling, Runway, Veo, Sora, Pika...), crie a série aqui e envie cada episódio como arquivo (mp4/webm).
        Vídeos verticais 9:16 de 1 a 3 minutos ficam perfeitos no player.
      </div>

      {msg && <div className={`notice ${msg.type}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <ScriptWriter onDone={(s) => { reload(); setEForm((f) => ({ ...f, seriesId: String(s.id), number: 1 })) }} />

      <YouTubeImport onDone={reload} />

      <form className="form" onSubmit={createSeries}>
        <h3>Nova série (vídeos próprios / IA)</h3>
        <label>Título *<input required value={sForm.title} onChange={sf('title')} placeholder="Ex: Casada com o CEO por Engano" /></label>
        <label>Sinopse<textarea value={sForm.synopsis} onChange={sf('synopsis')} placeholder="Do que é a história?" /></label>
        <div className="two">
          <label>Gênero
            <select value={sForm.genre} onChange={sf('genre')}>
              {['Romance', 'Drama', 'Comédia', 'Suspense', 'Fantasia', 'Sci-Fi', 'Ação', 'Terror', 'Outro'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label>Tags (vírgula)<input value={sForm.tags} onChange={sf('tags')} placeholder="ceo, vingança, amor" /></label>
        </div>
        <label>URL da capa (imagem vertical)<input value={sForm.coverUrl} onChange={sf('coverUrl')} placeholder="https://..." /></label>
        <div className="two">
          <label>Origem
            <select value={sForm.source} onChange={sf('source')}>
              <option value="ai">Gerado por IA</option>
              <option value="cc">Creative Commons</option>
              <option value="own">Produção própria</option>
            </select>
          </label>
          <label>Crédito / licença<input value={sForm.credit} onChange={sf('credit')} placeholder="Ex: Roteiro: Murilo · Vídeo: Kling" /></label>
        </div>
        <label className="inline"><input type="checkbox" checked={sForm.featured} onChange={sf('featured')} /> Destacar na tela inicial</label>
        <button className="btn btn-primary" disabled={busy}>Criar série</button>
      </form>

      <form className="form" onSubmit={addEpisode}>
        <h3>Adicionar episódio</h3>
        <label>Série *
          <select required value={eForm.seriesId} onChange={onPickSeries}>
            <option value="">Escolha...</option>
            {list.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.episodeCount} ep)</option>)}
          </select>
        </label>
        <div className="two">
          <label>Número *<input type="number" min="1" required value={eForm.number} onChange={ef('number')} /></label>
          <label>Título<input value={eForm.title} onChange={ef('title')} placeholder="Ex: O Contrato" /></label>
        </div>
        <label>Fonte do vídeo
          <select value={eForm.mode} onChange={ef('mode')}>
            <option value="file">Enviar arquivo (recomendado)</option>
            <option value="url">URL externa (mp4)</option>
          </select>
        </label>
        {eForm.mode === 'file' ? (
          <label>Arquivo de vídeo *<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setFile(e.target.files[0] || null)} /></label>
        ) : (
          <label>URL do vídeo *<input value={eForm.videoUrl} onChange={ef('videoUrl')} placeholder="https://.../episodio1.mp4" /></label>
        )}
        <label>URL da miniatura (opcional)<input value={eForm.thumbnailUrl} onChange={ef('thumbnailUrl')} placeholder="https://..." /></label>
        {progress !== null && (
          <div>
            <div className="upload-bar"><i style={{ width: `${progress}%` }} /></div>
            <div className="card-sub" style={{ marginTop: 6 }}>Enviando... {progress}%</div>
          </div>
        )}
        <button className="btn btn-primary" disabled={busy}>Adicionar episódio</button>
      </form>

      <h3 style={{ marginBottom: 10 }}>Catálogo ({list.length})</h3>
      <div className="studio-list">
        {list.map((s) => (
          <div key={s.id} className="studio-item">
            {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div style={{ width: 44, height: 60, borderRadius: 8, background: 'var(--bg-3)' }} />}
            <div className="grow">
              <b>{s.title}</b>
              <span>{s.episodeCount} episódios · {s.genre} · {{ ai: 'IA', yt: 'YouTube', cc: 'CC' }[s.source] || s.source}</span>
            </div>
            <Link to={`/series/${s.id}`} className="btn btn-ghost btn-sm">Abrir</Link>
            <button className="link-danger" onClick={() => removeSeries(s)}>Apagar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
