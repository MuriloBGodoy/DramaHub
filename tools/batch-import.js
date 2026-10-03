// Bateria de importacao: le os uploads dos canais oficiais via a API do DramaHub,
// filtra dramas completos em portugues e importa por genero.
// Uso: [ADMIN_CODE=...] node tools/batch-import.js [--dry]   (API=https://... para producao)
const API = process.env.API || 'http://localhost:8080'
let TOKEN = ''
const DRY = process.argv.includes('--dry')
const ONLY = process.env.ONLY // ex: ONLY=ai roda so os canais de IA

const SOURCES = [
  { name: 'ShortMax - Latinoamérica', playlist: 'UUUlvMtNmSGc8lBDhfKEppTw', langCheck: true },
  { name: 'MoboReels PT', playlist: 'UUOsd0pXCLHkO512hcX2waGw', langCheck: false },
  { name: 'StardustTV Português', playlist: 'UUuVMQvJ4299hZtlAnypVYSA', langCheck: false },
  // canais de dramas GERADOS POR IA (conteudo proprio do canal) -> source "ai"
  { name: 'Amor em Série IA', playlist: 'UUMTu_hf3U9LYkCkEkYqwTwg', langCheck: false, source: 'ai' },
  { name: 'Império IA', playlist: 'UUJnnqPKuwHFsqs8kSlKI9CA', langCheck: false, source: 'ai' },
  { name: 'Teatro da Lua', playlist: 'UUqzTt1aagtRl9zN_vz8ymVw', langCheck: false, source: 'ai' },
  { name: 'PoPo Drama Vício IA', playlist: 'UUEKmOYvoHzmfsp0My_FWciA', langCheck: false, source: 'ai' },
  { name: 'Next_Episode (Drama de IA)', playlist: 'UUg4bKWN64z2sV20ZR24vu6Q', langCheck: true, source: 'ai' },
  { name: 'DramaTales (IA)', playlist: 'UUiC5X3RSsFXqHJuaVc9ymUA', langCheck: true, source: 'ai' },
]
const MIN_SEC = 40 * 60
const EXCLUDE = /\b(parte|part)\s*\d|\bep\.?\s*\d|epis[oó]dio\s*\d|cap[ií]tulo\s*\d|trailer|teaser|\b(1|2|3)\/\d\b|\[(1|2|3)\]/i

// Heuristica de idioma para o canal LatAm (mistura espanhol e portugues)
const PT = /\b(não|nao|você|voce|ela|ele|com|foi|até|ate|mas|para|seu|sua|dele|dela|casamento|noiva|esposa|marido|bilionário|bilionario|chefão|chefao|máfia|mafia|é|são|sao|ficou|virou|descobriu|salvou|dublado|completo|filha|filho|mãe|mae|pai|rei|rainha|dragão|dragao|vingança|vinganca|coração|coracao|amor)\b/gi
const ES = /\b(no|ella|él|el|con|fue|hasta|pero|para|su|boda|novia|esposa|esposo|marido|millonario|jefe|mafia|es|son|se|descubrió|salvó|doblado|completo|hija|hijo|madre|padre|rey|reina|dragón|venganza|corazón|amor|mujer|hombre|después|ahora|nadie|todos|siempre|nunca|cuando|quien|quién)\b/gi
const ES_STRONG = /[ñ]|\b(ella|él|hasta|después|mujer|hombre|nadie|siempre|cuando|quién|doblado|boda|jefe|millonario|hija|hijo|dragón|venganza|corazón|descubrió|salvó|está|están|fue|pero|con la|con el|de la|del)\b/i
const PT_STRONG = /[ãõç]|\b(não|você|ela|ele|até|mas|dele|dela|meu|minha|meus|marido|depois|demais|tarde|quando|todos|ninguém|sabia|dublado|noiva|casamento|chefão|bilionário|é|são|foi|ficou|virou|descobriu|salvou|filha|filho|mãe|dragão|vingança|coração|com a|com o|da|do)\b/i

function isPortuguese(title) {
  const t = title.normalize('NFC')
  if (/[Ѐ-ӿ一-鿿぀-ヿ]/.test(t)) return false // russo / chines / japones
  if (/(the|my|he|she|his|her|me|you|was|were|with|and|for|until|after|before|wife|husband|love|never)/i.test(t) && !PT_STRONG.test(t)) return false
  if (PT_STRONG.test(t) && !ES_STRONG.test(t)) return true
  if (ES_STRONG.test(t) && !PT_STRONG.test(t)) return false
  const pt = (t.match(PT) || []).length, es = (t.match(ES) || []).length
  return pt > es
}

const GENRES = [
  ['Fantasia', /drag[ãa]o|alfa|lobo|lobisomem|vampir|feiticeir|bruxa|deus|deusa|imortal|renasc|reencarn|mágic|magic|imperador|imperatriz|dinastia|antig|reino|príncipe|princesa|feras?\b|monstro|demônio|inferno|lúcifer|anjo|sobrenatural|poder oculto|cultiv/i],
  ['Ação', /máfia|mafia|chefão|assassin|atirador|soldado|guerra|general|marechal|comandante|matou|vingança|vinganca|guarda-costas|espião|piloto|lutador|combate|rei do submundo|cartel|gangue|inimigo/i],
  ['Suspense', /segredo|mentira|traição|traida|traído|sequestr|desapareceu|acusada|presa|prisão|golpe|impostor|trocada|falsa|sumiu|verdade|escondid/i],
  ['Romance', /ceo|bilion|milion|casamento|casou|noiva|noivo|esposa|marido|amor|apaixon|beijo|contrato|grávida|gravida|bebê|gêmeos|trigêmeos|filhos|herdeira|herdeiro|ex\b|divórcio|divorci|namorad/i],
]
const genreOf = (title) => (GENRES.find(([, re]) => re.test(title)) || ['Drama'])[0]

const auth = () => ({ Authorization: `Bearer ${TOKEN}` })
async function get(u) { const r = await fetch(u, { headers: auth() }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j }
async function post(u, body) { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j }

(async () => {
  const session = await fetch(`${API}/api/auth/session`, { method: 'POST' }).then((r) => r.json())
  if (!session.token) throw new Error(session.error || 'nao foi possivel criar a sessao')
  TOKEN = session.token
  // sem ADMIN_CODE no servidor qualquer sessao ja e admin
  if (session.user.role !== 'ADMIN') await post(`${API}/api/auth/admin`, { code: process.env.ADMIN_CODE || '' })
  const summary = []
  for (const src of SOURCES.filter((x) => !ONLY || (ONLY === 'ai' ? x.source === 'ai' : x.source !== 'ai'))) {
    console.log(`\n===== ${src.name}`)
    const p = await get(`${API}/api/import/preview?url=${encodeURIComponent('https://www.youtube.com/playlist?list=' + src.playlist)}`)
    const all = p.videos
    const long = all.filter((v) => v.available && (v.durationSec || 0) >= MIN_SEC)
    const complete = long.filter((v) => !EXCLUDE.test(v.title))
    const pt = src.langCheck ? complete.filter((v) => isPortuguese(v.title)) : complete
    console.log(`videos: ${all.length} | >=40min: ${long.length} | completos: ${complete.length} | em português: ${pt.length}`)
    if (src.langCheck) complete.filter((v) => !isPortuguese(v.title)).slice(0, 5).forEach((v) => console.log('   [ES?] ' + v.title.slice(0, 80)))

    const byGenre = {}
    pt.forEach((v) => (byGenre[genreOf(v.title)] ||= []).push(v))
    for (const [genre, vids] of Object.entries(byGenre)) {
      console.log(`  ${genre}: ${vids.length}`)
      vids.slice(0, 3).forEach((v) => console.log(`     ${Math.round(v.durationSec / 60)}min  ${v.title.slice(0, 80)}`))
      if (DRY) continue
      const r = await post(`${API}/api/import`, {
        url: 'https://www.youtube.com/playlist?list=' + src.playlist,
        mode: 'collection', genre, source: src.source || 'yt',
        tags: src.source === 'ai' ? 'ia, gerado por ia, drama completo' : 'dublado, drama completo',
        credit: `YouTube · canal oficial ${src.name}`,
        episodes: vids.map((v) => ({ videoId: v.videoId })),
      })
      console.log(`     -> importadas ${r.created.length} séries (${r.skipped.length} puladas)`)
      summary.push({ source: src.name, genre, created: r.created.length, skipped: r.skipped.length })
    }
  }
  console.log('\n===== RESUMO'); console.table(summary)
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
