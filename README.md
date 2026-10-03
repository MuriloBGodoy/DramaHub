# DramaHub 💖

App de short dramas (estilo DramaBox/ReelShort) para assistir séries curtas em episódios verticais —
sem paywall, com catálogo próprio. Feito para a Julia.

- **Backend:** Java 21 + Spring Boot 4 + H2 (banco em arquivo, zero configuração)
- **Frontend:** React 19 + Vite + React Router
- **Conteúdo:** três fontes legítimas:
  1. **Canais oficiais no YouTube** das plataformas de short drama (ShortMax, MoboReels, StardustTV),
     que publicam dramas completos dublados/legendados em português. O app importa e toca via embed
     oficial (API IFrame do YouTube). ~585 dramas já importados.
  2. **Canais de dramas gerados por IA** no YouTube (Amor em Série IA, Império IA, Teatro da Lua, PoPo Drama Vício IA,
     Next_Episode, DramaTales) — conteúdo próprio dos canais, ~330 dramas importados com o selo ✨ IA.
  3. Vídeos gerados por IA que vocês mesmos produzem: o **Roteirista IA** do Estúdio escreve a série (sinopse,
     personagens, episódios, diálogos e prompts de vídeo) e vocês geram os clipes e fazem o upload.
  4. Vídeos com licença livre (Creative Commons) — os *open movies* da Blender vêm como exemplo.

## Sessões (sem login)

- Não tem cadastro nem senha: na primeira visita cada navegador ganha uma **sessão anônima** (token aleatório
  salvo no `localStorage`; no banco só fica o hash). Progresso, favoritos, nome e avatar ficam nessa sessão.
- Outro aparelho ou dados do navegador apagados = sessão nova. Em **Perfil → Começar do zero** dá pra apagar a atual.
- **Estúdio**: se a env `ADMIN_CODE` estiver definida, só sessões liberadas com esse código (Perfil → Estúdio)
  alteram o catálogo. Sem `ADMIN_CODE` (uso local) qualquer sessão pode. **Em produção, defina `ADMIN_CODE`.**

## PWA

O app é instalável (manifest + service worker via `vite-plugin-pwa`): no Android/Chrome aparece o botão
**Instalar** em *Perfil*; no iPhone, Safari → Compartilhar → *Adicionar à Tela de Início*. O catálogo e as capas ficam em
cache pra abrir offline; os vídeos do YouTube precisam de internet.

## Rodando

Pré-requisitos: **Java 21** (já instalado) e **Node 18+**. Maven não precisa — o projeto usa o wrapper `mvnw`.

| Comando | O que faz |
|---|---|
| `build.bat` | Instala deps, faz build do frontend e empacota tudo num `.jar` |
| `start.bat` | Abre o app em <http://localhost:8080> (roda `build.bat` se precisar) |
| `dev.bat` | Modo desenvolvimento: backend (8080) + frontend com hot reload (5173) |

Para usar no **celular**: conecte no mesmo Wi-Fi e abra `http://IP-DO-PC:8080`
(descubra o IP com `ipconfig`). No Safari/Chrome, "Adicionar à tela de início" vira um app.

## Importar dramas dos canais oficiais (YouTube)

No **Estúdio → Importar do YouTube**, cole o link de uma playlist ou vídeo, clique em **Ler** e depois
**Importar**. Modos:

- **Coleção** — cada vídeo vira uma série com 1 episódio (drama completo em um vídeo, como ShortMax/MoboReels/StardustTV publicam).
- **Série** — a playlist inteira vira uma série com um episódio por vídeo (o app detecta "EP 1, EP 2..." nos títulos).

Filtros de duração mínima e de título (regex) ajudam a pegar só os dramas inteiros e só os em português.
O importador lê a playlist completa (com paginação), confere a disponibilidade de cada vídeo e ignora os já importados.

Canais oficiais usados na carga inicial (uploads completos, ≥ 40 min):

| Canal | Handle | Dramas |
|---|---|---|
| ShortMax – Latinoamérica | `@ShortMax-Latinoamérica` | 78 (só os em português) |
| MoboReels PT | `@MoboReelsPT` | 120 |
| StardustTV Português | `@NoviaMiniDrama` | 386 (44 legendados, resto dublado) |
| Amor em Série IA · Império IA · Teatro da Lua · PoPo Drama Vício IA · Next_Episode · DramaTales | canais de drama **gerado por IA** | ~330 (selo ✨ IA; `ONLY=ai node tools/batch-import.js`) |

Canais que **não** servem: DramaBox PT, ReelShort Brasil, iQIYI Portuguese e DramaWave só publicam trechos
de 10–30 min ou escondem os episódios depois do 5º.

Para repetir a carga (ex.: pegar lançamentos novos): `ADMIN_CODE=... node tools/batch-import.js`
(`--dry` só mostra o que faria).

## Publicar na internet (Netlify + Render + Neon)

O frontend é estático (Netlify), mas o backend é Java e precisa de um host próprio. Fluxo sugerido, tudo no plano grátis:

1. **Banco** — crie um projeto no [Neon](https://neon.tech) e copie host, database, usuário e senha.
2. **Backend** — suba o repositório no GitHub e crie um *Web Service* no [Render](https://render.com) apontando
   para a pasta `backend` (Docker; o `render.yaml` já descreve). Envs:
   `JDBC_DATABASE_URL=jdbc:postgresql://HOST/DB?sslmode=require`, `DB_USER`, `DB_PASSWORD`,
   `ALLOWED_ORIGINS=https://SEU-SITE.netlify.app`, `H2_CONSOLE=false` e `ADMIN_CODE` (código que libera o Estúdio).
   Anote a URL (ex.: `https://dramahub-api.onrender.com`).
3. **Frontend** — no [Netlify](https://netlify.com), *Add new site → Import from Git*. O `netlify.toml` já configura
   build e publish; edite nele a linha `to = "https://SEU-BACKEND.onrender.com/api/:splat"` com a URL do Render.
   O Netlify faz proxy de `/api` → o app fica num domínio só (sem CORS, PWA instalável).
4. Rode `API=https://SEU-SITE.netlify.app ADMIN_CODE=... node tools/batch-import.js`
   para carregar o catálogo em produção.

Avisos: no Render free o serviço dorme após 15 min sem uso (primeiro acesso demora ~1 min) e o disco é
temporário — por isso o banco vai no Neon; uploads de vídeo próprio (`media/`) não persistem lá (os dramas do
YouTube não dependem disso). Alternativas ao Render com o mesmo Dockerfile: Railway, Fly.io, Koyeb.

## Produzir seus próprios dramas com IA (Roteirista IA)

1. Crie um arquivo `.env` na raiz (modelo em `.env.example`) com `ANTHROPIC_API_KEY=sk-ant-...`
   (chave em console.anthropic.com; uso do modelo `claude-opus-5`, cobrado por token). Reinicie com `start.bat`.
2. **Estúdio → Roteirista IA**: escreva a premissa, escolha gênero, quantidade de episódios e tom → *Escrever a série*.
   Sai título, sinopse, personagens com descrição visual fixa (para manter a mesma cara em todos os clipes),
   e cada episódio com diálogos e **um prompt em inglês por cena** (5–10 s cada, formato 9:16).
3. *Criar a série no catálogo* — o roteiro fica salvo na série (o admin vê na página da série).
4. Cole os prompts no gerador de vídeo (Kling, Veo, Sora, Runway, Pika, Hailuo), junte as cenas do episódio
   num editor (CapCut) com a dublagem/legendas, exporte em **mp4 vertical 9:16** e envie em *Adicionar episódio*.
5. Os vídeos ficam em `backend/media/` e o banco em `backend/data/` — faça backup dessas pastas.

Sem a chave, a seção fica desativada com a instrução na tela; o restante do app funciona normalmente.

Também dá para cadastrar episódios por **URL externa** (qualquer `.mp4` público), e usar
`startSec`/`endSec` na API para dividir um vídeo longo em vários episódios.

## API (resumo)

```
GET    /api/series?genre=&q=              lista/busca séries
GET    /api/series/{id}                   detalhe + episódios
GET    /api/episodes/{id}                 episódio
GET    /api/feed                          feed "Para você" (1º ep de cada série)
GET    /api/genres
POST   /api/series                        cria série (JSON)
PUT    /api/series/{id}                   edita série (título, gênero, tags, destaque...)
GET    /api/ai/status ; POST /api/ai/script  {premise, genre, episodes, tone} (admin, precisa ANTHROPIC_API_KEY)
GET    /api/import/preview?url=           lê playlist/vídeo do YouTube (admin)
POST   /api/import                        importa (admin) {url, mode, genre, tags, episodes[], minDurationSec, titleRegex}
POST   /api/series/{id}/episodes          JSON {number, title, videoUrl, startSec, endSec}
POST   /api/series/{id}/episodes          multipart: number, title, file
DELETE /api/series/{id} | /api/episodes/{id}
GET    /api/stream/{episodeId}            vídeo enviado (suporta Range → seek)

POST   /api/auth/session                  cria a sessão anônima -> {token,user}
GET    /api/auth/me ; PUT /api/auth/me {name,avatar} ; DELETE /api/auth/session
POST   /api/auth/admin                    {code} libera o Estúdio nesta sessão

(todas abaixo exigem Authorization: Bearer <token>)
PUT    /api/me/progress/{episodeId}       {positionSec, completed}
GET    /api/me/progress/series/{seriesId}
GET    /api/me/continue                   continuar assistindo
GET    /api/me/favorites ; POST /api/me/favorites/{seriesId}/toggle
```

Console do banco: <http://localhost:8080/h2> (JDBC URL `jdbc:h2:file:./data/dramahub`, usuário `sa`, sem senha).

## Estrutura

```
backend/   Spring Boot (com.dramahub: model, repo, service, web, seed)
frontend/  React (src/pages: Home, Feed, Search, Library, SeriesPage, Player, Studio)
```

## Sobre o conteúdo

Este app **não** extrai vídeos do DramaBox, ReelShort ou similares — esse conteúdo é protegido por
direitos autorais. Os dramas do catálogo tocam pelo **embed oficial do YouTube** (com os anúncios do
YouTube, que sustentam os canais) a partir de vídeos que as próprias plataformas publicaram. Se a
plataforma remover um vídeo, ele some do app também.
