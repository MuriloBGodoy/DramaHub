// Roteirista IA: a partir de uma premissa, gera titulo, sinopse, personagens e os episodios de um
// short drama, com roteiro (dialogos) e prompts em ingles prontos para geradores de video
// (Kling, Veo, Sora, Runway). Precisa do secret ANTHROPIC_API_KEY (supabase secrets set).
import Anthropic from 'npm:@anthropic-ai/sdk'
import { cors, json, requireAdmin, userClient } from '../_shared/http.ts'

const MODEL = 'claude-opus-5-5'

const SYSTEM = `Você é roteirista-chefe de um estúdio de short dramas verticais (estilo DramaBox/ReelShort) \
produzidos inteiramente com ferramentas de geração de vídeo por IA. Escreve em português do Brasil, \
com ganchos fortes no fim de cada episódio, reviravoltas e diálogos curtos e intensos. Episódios têm \
1 a 3 minutos, formato vertical 9:16, e cada um é composto por 3 a 6 cenas curtas (5 a 10 segundos cada), \
porque os geradores de vídeo por IA produzem clipes curtos.

Responda SOMENTE com um JSON válido (sem markdown, sem comentários) exatamente neste formato:
{
  "title": "título curto e chamativo",
  "logline": "uma frase de venda",
  "synopsis": "sinopse de 3 a 5 frases",
  "genre": "gênero principal",
  "tags": ["tag1", "tag2", "tag3"],
  "characters": [
    {"name": "Nome", "role": "protagonista/antagonista/...", "description": "quem é e o que quer, em 2 frases",
     "visualPrompt": "descrição visual detalhada EM INGLÊS, consistente para reutilizar em todos os prompts (idade, rosto, cabelo, roupa característica)"}
  ],
  "episodes": [
    {"number": 1, "title": "título do episódio", "summary": "resumo em 2 frases",
     "hook": "o gancho final do episódio",
     "script": "roteiro com cabeçalhos de cena e diálogos, em português",
     "scenes": [
       {"description": "o que acontece, em português", "durationSec": 8,
        "videoPrompt": "prompt EM INGLÊS para o gerador de vídeo: vertical 9:16, cinematic, descrição da ação, personagens (repita o visualPrompt do personagem), cenário, luz, câmera, emoção",
        "dialogue": "fala(s) da cena em português, ou vazio"}
     ]}
  ]
}`

const key = Deno.env.get('ANTHROPIC_API_KEY')
const client = key ? new Anthropic({ apiKey: key }) : null

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = userClient(req)
  const denied = await requireAdmin(db)
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  if (body.status) return json({ enabled: !!client })
  if (!client) return json({ error: 'Roteirista IA desativado: rode "supabase secrets set ANTHROPIC_API_KEY=..."' }, 503)
  if (!body.premise?.trim()) return json({ error: 'Escreva a premissa' }, 400)

  const n = Math.max(1, Math.min(12, Number(body.episodes) || 6))
  const prompt = `Premissa: ${body.premise.trim()}
Gênero: ${body.genre?.trim() || 'Romance'}
Tom: ${body.tone?.trim() || 'intenso e viciante'}
Quantidade de episódios: ${n}

Crie a série completa com exatamente ${n} episódios, seguindo o formato JSON pedido.`

  try {
    // streaming: resposta longa, evita timeout de requisicao HTTP
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    } as Parameters<typeof client.beta.messages.stream>[0])
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'refusal') return json({ error: 'O modelo recusou essa premissa. Tente reformular.' }, 422)

    let text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
    // tolera ```json ... ``` caso o modelo envolva a resposta
    text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '')
    const start = text.indexOf('{'), end = text.lastIndexOf('}')
    if (start < 0 || end < start) return json({ error: 'O modelo não devolveu um roteiro válido. Tente de novo.' }, 502)
    return json(JSON.parse(text.slice(start, end + 1)))
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Chave da Anthropic inválida' }, 502)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Limite da API da Anthropic atingido, tente mais tarde' }, 429)
    if (e instanceof Anthropic.APIError) return json({ error: `A API da Anthropic recusou a chamada (${e.status}). Confira a chave e os créditos.` }, 502)
    if (e instanceof SyntaxError) return json({ error: 'O modelo não devolveu um roteiro válido. Tente de novo.' }, 502)
    console.error(e)
    return json({ error: 'Falha ao gerar o roteiro' }, 500)
  }
})
