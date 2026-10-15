# DramaHub 💖

App de short dramas (estilo DramaBox/ReelShort) para assistir séries curtas em episódios verticais,
sem paywall e com catálogo próprio. Feito para a Julia.

- **Frontend:** React 19 + Vite + React Router, PWA. Hospedado no **Netlify**.
- **Dados:** **Supabase** (Postgres + login anônimo + Edge Functions). Não tem servidor próprio.
- **Conteúdo:** quatro fontes legítimas:
  1. **Canais oficiais no YouTube** das plataformas de short drama (ShortMax, MoboReels, StardustTV),
     que publicam dramas completos dublados ou legendados em português. O app toca pelo embed
     oficial (API IFrame do YouTube).
  2. **Canais de dramas gerados por IA** no YouTube (Amor em Série IA, Império IA, Teatro da Lua, PoPo Drama Vício IA,
     Next_Episode, DramaTales), com o selo ✨ IA.
  3. Dramas que vocês mesmos produzem com IA: o **Roteirista IA** do Estúdio escreve a série (sinopse,
     personagens, episódios, diálogos e prompts de vídeo).
  4. Vídeos com licença livre (Creative Commons): os *open movies* da Blender vêm como exemplo.

## Como funciona

```
Netlify (site estático) ──► Supabase
                             ├─ Postgres: series, episode (catálogo público)
                             │            profile, watch_progress, favorite (por navegador, RLS)
                             ├─ Auth: login anônimo (cada navegador = 1 usuário)
                             └─ Edge Functions: youtube-import, ai-script (só admin)
```

- **Sem login:** na primeira visita o navegador entra como usuário anônimo do Supabase (sessão no `localStorage`).
  Progresso, favoritos, nome e avatar ficam nesse usuário, e as regras de RLS garantem que cada um só vê os seus.
  Em outro aparelho, ou com os dados do navegador apagados, começa uma sessão nova. **Perfil → Começar do zero** apaga a atual.
- **Estúdio:** em **Perfil → Estúdio**, digite o código de administrador (`ADMIN_CODE` no `.env`, gravado na
  tabela `app_secret`). Só perfis liberados criam ou apagam séries; o banco confere pelo RLS.

## Rodando local

Pré-requisito: **Node 22.18+**.

1. Copie `frontend/.env.example` para `frontend/.env` (os valores são os mesmos do `netlify.toml`).
2. Rode `dev.bat` (ou `cd frontend && npm run dev`) e abra <http://localhost:5173>.

O app local usa o mesmo banco do Supabase que o site publicado.

## Publicar

O Netlify publica sozinho a cada push no `main`. O `netlify.toml` já tem o build e as variáveis públicas
(`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; a chave publicável pode ficar no repositório).

Mudanças no Supabase são feitas com o CLI, a partir da raiz do projeto:

| Comando | O que faz |
|---|---|
| `supabase migration new nome` + `supabase db push` | Altera o esquema do banco (`supabase/migrations/`) |
| `supabase functions deploy youtube-import --no-verify-jwt --use-api` | Publica uma Edge Function (idem `ai-script`) |
| `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` | Liga o Roteirista IA |

## Importar dramas dos canais oficiais (YouTube)

No **Estúdio → Importar do YouTube**, cole o link de uma playlist ou de um vídeo, clique em **Ler** e depois em
**Importar**. Há dois modos:

- **Coleção:** cada vídeo vira uma série com 1 episódio. É o formato de ShortMax, MoboReels e StardustTV, que publicam o drama completo em um vídeo.
- **Série:** a playlist inteira vira uma série, com um episódio por vídeo. O app detecta "EP 1, EP 2..." nos títulos.

Os filtros de duração mínima e de título (regex) ajudam a pegar só os dramas inteiros e só os em português.
O importador lê a playlist completa (com paginação), confere a disponibilidade de cada vídeo e ignora os que já foram importados.

Carga em lote a partir do PC (grava direto no banco com a chave secreta do `.env` da raiz):

```
node tools/batch-import.mjs --dry     # só mostra o que faria
node tools/batch-import.mjs           # importa
ONLY=ai node tools/batch-import.mjs   # só os canais de drama gerado por IA
```

A lógica do YouTube fica em `supabase/functions/_shared/` e é a mesma na Edge Function e no script.

Canais **que não servem**: DramaBox PT, ReelShort Brasil, iQIYI Portuguese e DramaWave só publicam trechos
de 10 a 30 min ou escondem os episódios depois do 5º.

## Produzir seus próprios dramas com IA (Roteirista IA)

1. Ligue o Roteirista com `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (chave em console.anthropic.com;
   usa o modelo `claude-opus-5-5`, cobrado por token).
2. **Estúdio → Roteirista IA**: escreva a premissa, escolha o gênero, a quantidade de episódios e o tom, e clique em *Escrever a série*.
   O resultado traz título, sinopse, personagens com descrição visual fixa (pra manter a mesma aparência em todos os clipes)
   e cada episódio com diálogos e **um prompt em inglês por cena** (5 a 10 s cada, formato 9:16).
3. *Criar a série no catálogo*: o roteiro fica salvo na série.
4. Gere os clipes (Kling, Veo, Sora, Runway...), junte as cenas num editor (CapCut), exporte em **mp4 vertical 9:16**,
   hospede o arquivo (Supabase Storage, archive.org...) e cadastre em *Adicionar episódio* pela URL.

Roteiros com muitos episódios podem passar do limite de tempo das Edge Functions no plano grátis (150 s).
Se der erro de tempo, peça menos episódios por vez.

## PWA

O app é instalável: no Android/Chrome aparece o botão **Instalar** em *Perfil*; no iPhone, Safari → Compartilhar →
*Adicionar à Tela de Início*. O catálogo e as capas ficam em cache pra abrir offline; os vídeos do YouTube precisam de internet.

## Estrutura

```
frontend/             React (src/api.js fala com o Supabase; src/pages: Home, Feed, Search, Library, SeriesPage, Player, Studio)
supabase/migrations/  esquema do banco + RLS
supabase/functions/   Edge Functions (youtube-import, ai-script) e _shared/ (leitura do YouTube)
tools/                batch-import.mjs (carga em lote)
```

## Sobre o conteúdo

Este app **não** extrai vídeos do DramaBox, do ReelShort ou de plataformas parecidas, porque esse conteúdo é protegido por
direitos autorais. Os dramas do catálogo tocam pelo **embed oficial do YouTube** (com os anúncios do
YouTube, que sustentam os canais), a partir de vídeos que as próprias plataformas publicaram. Se a
plataforma remover um vídeo, ele também some do app.
