import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { SparkIcon } from '../components/Icons'

const GENRES = ['Romance', 'Drama', 'Comédia', 'Suspense', 'Fantasia', 'Sci-Fi', 'Ação', 'Terror']
const TONES = ['intenso e viciante', 'romântico e doce', 'sombrio e vingativo', 'cômico e leve', 'épico e fantástico']

/** Roteirista IA: premissa -> série completa (sinopse, personagens, episódios, prompts de vídeo). */
export default function ScriptWriter({ onDone }) {
  const [enabled, setEnabled] = useState(null)
  const [form, setForm] = useState({ premise: '', genre: 'Romance', episodes: 6, tone: TONES[0] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [script, setScript] = useState(null)
  const [open, setOpen] = useState(0)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => { api.aiStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false)) }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const generate = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null); setScript(null); setCreated(null)
    try {
      const s = await api.aiScript({ ...form, episodes: Number(form.episodes) })
      setScript(s); setOpen(0)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const createSeries = async () => {
    setBusy(true); setError(null)
    try {
      const s = await api.createSeries({
        title: script.title, synopsis: script.synopsis, genre: script.genre || form.genre,
        tags: (script.tags || []).join(', '), source: 'ai', credit: 'Roteiro: Roteirista IA · Vídeo: gerado por IA',
        script: JSON.stringify(script),
      })
      setCreated(s)
      onDone?.(s)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch { /* sem clipboard */ }
  }

  const allPrompts = (ep) => ep.scenes?.map((sc, i) => `Cena ${i + 1} (${sc.durationSec || 8}s): ${sc.videoPrompt}`).join('\n\n') || ''

  return (
    <div className="form">
      <h3><SparkIcon /> Roteirista IA</h3>
      <div className="notice info">
        Você dá a premissa, a IA escreve a série inteira: sinopse, personagens (com descrição visual fixa pra manter a
        consistência), episódios com diálogos e <b>um prompt em inglês por cena</b> pra colar no Kling, Veo, Sora ou Runway.
        Depois é gerar os clipes, juntar (CapCut resolve) e subir cada episódio em <b>Adicionar episódio</b>.
      </div>

      {enabled === false && (
        <div className="notice err">
          Desativado: defina a variável de ambiente <code>ANTHROPIC_API_KEY</code> (chave em console.anthropic.com) e reinicie o servidor.
        </div>
      )}

      <form onSubmit={generate} style={{ display: 'grid', gap: 12 }}>
        <label>Premissa *<textarea required value={form.premise} onChange={set('premise')} placeholder="Ex: Ela aceita um casamento por contrato com o CEO pra salvar a empresa do pai — sem saber que ele é o garoto que ela humilhou na escola." /></label>
        <div className="two">
          <label>Gênero<select value={form.genre} onChange={set('genre')}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></label>
          <label>Episódios<input type="number" min="1" max="12" value={form.episodes} onChange={set('episodes')} /></label>
        </div>
        <label>Tom<select value={form.tone} onChange={set('tone')}>{TONES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <button className="btn btn-primary" disabled={busy || enabled === false}>{busy ? 'Escrevendo... (até 1 min)' : 'Escrever a série'}</button>
      </form>

      {error && <div className="notice err">{error}</div>}

      {script && (
        <div className="script">
          <h2 style={{ fontSize: 22 }}>{script.title}</h2>
          <p className="card-sub" style={{ fontStyle: 'italic' }}>{script.logline}</p>
          <p className="synopsis">{script.synopsis}</p>
          <div className="tags">{(script.tags || []).map((t) => <span key={t} className="tag">#{t}</span>)}</div>

          <h3>Personagens</h3>
          {(script.characters || []).map((c) => (
            <div key={c.name} className="script-char">
              <b>{c.name}</b> <span className="card-sub">({c.role})</span>
              <div>{c.description}</div>
              <div className="prompt-box">
                <span>{c.visualPrompt}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(c.visualPrompt, c.name)}>{copied === c.name ? 'Copiado!' : 'Copiar'}</button>
              </div>
            </div>
          ))}

          <h3>Episódios</h3>
          {(script.episodes || []).map((ep, i) => (
            <div key={ep.number} className="script-ep">
              <button type="button" className="script-ep-head" onClick={() => setOpen(open === i ? -1 : i)}>
                <b>EP {ep.number} · {ep.title}</b>
                <span className="card-sub">{open === i ? '▲' : '▼'}</span>
              </button>
              {open === i && (
                <div className="script-ep-body">
                  <p>{ep.summary}</p>
                  {ep.hook && <p><b>Gancho:</b> {ep.hook}</p>}
                  <details>
                    <summary>Roteiro / diálogos</summary>
                    <pre>{ep.script}</pre>
                  </details>
                  <div className="row-head" style={{ marginTop: 10 }}>
                    <h4 style={{ margin: 0 }}>Cenas e prompts de vídeo</h4>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(allPrompts(ep), `ep${i}`)}>{copied === `ep${i}` ? 'Copiado!' : 'Copiar todos'}</button>
                  </div>
                  {(ep.scenes || []).map((sc, j) => (
                    <div key={j} className="script-scene">
                      <div><b>Cena {j + 1}</b> · {sc.durationSec || 8}s — {sc.description}</div>
                      {sc.dialogue && <div className="card-sub">🗣 {sc.dialogue}</div>}
                      <div className="prompt-box">
                        <span>{sc.videoPrompt}</span>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(sc.videoPrompt, `${i}-${j}`)}>{copied === `${i}-${j}` ? 'Copiado!' : 'Copiar'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {created ? (
            <div className="notice ok">
              Série criada! <Link to={`/series/${created.id}`} style={{ textDecoration: 'underline' }}>Abrir</Link> — agora envie os episódios em "Adicionar episódio" (o roteiro fica salvo na série).
            </div>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={createSeries}>Criar a série no catálogo com esse roteiro</button>
          )}
        </div>
      )}
    </div>
  )
}
