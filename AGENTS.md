<!-- última-sessão: 02/08/2026 — Fase A: exportação CSV/XLSX → v0.2.0 -->
# AGENTS.md — Histórico Completo do Projeto

## Regras de Ouro

- **Report style**: ao finalizar, responder com `Done.` + bullets do que foi feito + `commit hash + tag → destino` (nunca omitir bullets).
  Ex:
  ```
  Done.
  - Corrige A
  - Adiciona B
  `abc123 + v1.9.20 → origin/master`
  ```
- **AGENTS.md é o único histórico**: SESSION.md não existe mais. Toda sessão registrada aqui. O `project-summary.md` permanece apenas como resumo do desenvolvimento inicial (legado).
- **Registrar ações**: além da sessão no AGENTS.md, rodar `node project-action-log.js "descrição"` para gravar em `project-actions.log`.
- **Commits + Push**: ao receber "done" (ou "anote ai! done", "done + commit tag destino", etc), executar automaticamente o ciclo completo: `git add -A → git commit -m "..." → git push origin master && git push origin <tag>`. Sempre. Sem perguntar. **Nunca perguntar se deve push** — fazer sempre.
- **Consultar antes de codificar**: ler `ARCHITECTURE.md` e `PDR.md` antes de gerar ou modificar código.

## Versionamento Semântico (SemVer 2.0.0)

O post-commit hook (.githooks/post-commit) detecta automaticamente o bump baseado na mensagem do commit (Conventional Commits):

| Mensagem do commit | Bump | Exemplo |
|---|---|---|
| `BREAKING CHANGE` no body ou `!:` no subject | **MAJOR** (vX.0.0) | `feat!: remove deprecated endpoint` |
| `feat:` no subject | **MINOR** (v0.X.0) | `feat: add new feature` |
| `fix:`, `refactor:`, `chore:`, `docs:`, etc | **PATCH** (v0.0.X) | `fix: corrige calculo` |

Regras:
- **MAJOR**: mudança incompatível na API ou no banco (breaking change)
- **MINOR**: adição de funcionalidade retrocompatível
- **PATCH**: correção de bugs e pequenas melhorias
- O hook usa `git log -1` para ler a mensagem do commit recém-criado
- Tags conflitantes (orphan) são puladas automaticamente (loop `while` incrementa PATCH)

> O hook roda automaticamente após `git init && git config core.hooksPath .githooks`
> (ambos já executados nesta sessão — o repositório está ativo).

## Identidade
- **Nome:** PBTracker
- **Descrição:** Balizamento e controle rápido de parciais para competição de natação — PWA mobile/tablet-first, sem backend.
- **Repositório:** git ativo localmente (remote ainda não configurado — push exige definir a URL remota).
- **Versão atual:** v0.2.0
- **Stack:** HTML + CSS + JavaScript puro (ES modules, sem build) + PDF.js via CDN + PWA (manifest + service worker). Sem backend, sem banco, sem testes automatizados.
- **Deploy:** estático (qualquer host de arquivos estáticos; ex.: GitHub Pages, Netlify, Cloudflare Pages). PDF.js requer rede no primeiro carregamento.
- **Ferramenta de IA:** opencode (lê este arquivo automaticamente)

---

## Sumário de Arquivos Relevantes

| Arquivo | Função |
|---------|--------|
| `ARCHITECTURE.md` | Documento de arquitetura do sistema |
| `PDR.md` | Requisitos e definição do produto (nota: o template usa `PRD.md`; aqui é `PDR.md`) |
| `CHANGELOG.md` | Histórico de versões |
| `DEVELOPMENT.md` | Diretrizes de desenvolvimento |
| `AGENTS.md` | Histórico completo do projeto (substitui SESSION.md) |
| `README.md` | Porta de entrada + como rodar/testar |
| `project-summary.md` | Resumo legado do desenvolvimento inicial |
| `project-action-log.js` | Script para registrar ações em `project-actions.log` |
| `app.js` | Toda a lógica da aplicação (estado, parsing, cronômetro, UI) |
| `exporter.js` | Exportação CSV/XLSX (SheetJS sob demanda, fallback CSV) |
| `index.html` | Telas e dialog do cronômetro |
| `styles.css` | Tema e layout mobile-first |
| `sw.js` | Service worker (PWA offline) |
| `manifest.webmanifest` | Metadados PWA |
| `icons/` | Ícones PWA (SVG) |
| `scripts/` | Kit de documentação (init-projeto, nova-sessao) |
| `templates/` | Kit de documentação (templates + hook SemVer) |
| `.githooks/post-commit` | Hook SemVer automático (exige git init) |

---

## Contexto Crítico (Conhecimento Adquirido)

> Uma IA nova deve conseguir trabalhar no projeto lendo só o `AGENTS.md`.

- **Parser de PDF acoplado ao layout** recebido: `parseRowsFromPdfLines`/`parseAthleteLine` em `app.js` esperam o padrão `série baliza código ... tempo` e mantêm contexto de prova/série/sexo/equipe. Novos layouts de balizamento podem exigir ajuste.
- **Tempos `S/T`, `NT` e `00:00:00`** são aceitos e normalizados — nunca quebrar o fluxo com eles.
- **Correspondência de equipe é fuzzy** (`isSameTeam`/`getTeamTokens`): remove acentos e stop-words; pede interseção de tokens. O filtro seleciona apenas atletas da equipe informada.
- **Importação em duas passadas**: primeiro estrita (só equipe conhecida); se vazia, tolerante (`allowUnknownTeam: true`).
- **Mobile/tablet-first**: largura > 1024px bloqueia o uso (`applyDeviceGuard` + `#desktopNotice`). Para testar no desktop, usar device emulation do DevTools.
- **`file://` não funciona**: ES modules + service worker exigem servir via HTTP (`npx serve .` ou `python -m http.server 8080`).
- **PDF.js via CDN**: requer internet no primeiro carregamento; o restante funciona offline via service worker.
- **UTF-8 garantido** em toda a cadeia para evitar problemas de acentuação.
- **Dados de importação não persistem** entre sessões (só em memória); apenas o log de atividades fica em `localStorage["pbtracker_activity_log"]`.
- **Diagnóstico do parser** exposto em `window.__PBSWIM_DIAGNOSTIC__` e renderizado em `#diagnostic-area`.
- **Cache do service worker**: nome `pbtracker-v3` em `sw.js` (app shell inclui
  `exporter.js`). Ao subir versão, atualizar o nome do cache.
- **Exportação de resultados**: `exporter.js` — XLSX via SheetJS (CDN, sob demanda,
  lazy-load no clique) com abas Resultados + Log; offline cai para CSV (BOM UTF-8,
  separador `;`). SheetJS é cacheado em runtime pelo service worker.

---

## Sessão: 31/07/2026 — Kit de documentação aplicado e adaptado

### O que foi feito
- Aplicado e adaptado o kit de documentação ao PBTracker (stack vanilla JS PWA, sem backend/banco).
- Criados `README.md`, `AGENTS.md`, `CHANGELOG.md`, `DEVELOPMENT.md` e `.githooks/post-commit`.
- Adicionada a seção "Documentação do Projeto" (mapa + regras de atualização) no `PDR.md`.
- Adicionadas orientações de execução e teste do projeto no `README.md`.

### Decisões
- `README.md` passou a documentar o PBTracker; o conteúdo original do kit foi resumido numa seção final (origem: Fiz! App).
- Nome do documento de requisitos mantido como `PDR.md` (o template do kit usa `PRD.md`).
- Substituição do "typecheck front/back" por validação estática `node --check` (não há testes automatizados).
- A pasta ainda não é repositório git: hook SemVer criado mas inativo até `git init && git config core.hooksPath .githooks`.

### Arquivos
- `README.md` (reescrito)
- `AGENTS.md` (criado)
- `CHANGELOG.md` (criado)
- `DEVELOPMENT.md` (criado)
- `.githooks/post-commit` (criado)
- `PDR.md` (seção "Documentação do Projeto" adicionada)

### Verificações
- `node --check app.js sw.js project-action-log.js`: 0 erros

---

## Sessão: 01/08/2026 — Plano de implementação (3 tiers de produto)

### O que foi feito
- Criado `plano de implementacao.md` com o plano de negócio em 3 camadas:
  **Tier 1** (balizamento + export CSV/XLSX, free), **Tier 2** (banco de atletas,
  modo treino/prova, gráficos, licença única) e **Tier 3** (calculadora de ritmo,
  Strava/Garmin, sync nuvem, assinatura).
- Decidida a **integração de produto**: 1 PWA único com upgrades por patch
  (feature flags), em vez de 2 apps separados.
- Definidas arquitetura (IndexedDB, Canvas nativo, SheetJS via CDN, módulos
  `db.js`/`exporter.js`/`charts.js`/`licenses.js`/`pace.js`/`wearables/`/`sync.js`),
  roadmap por fases A→D, monetização, riscos e critérios de aceite.

### Decisões (consultas do usuário)
- 1 app + upgrades por patch (recomendado).
- Licença única Tier 2 + assinatura Tier 3 (recomendado).
- Exportação CSV + XLSX (SheetJS via CDN, fallback CSV offline).
- Calculadora de ritmo alocada no Tier 3.
- Vestíveis-alvo: Strava + Garmin (Apple Health/Google Fit fora de escopo PWA).

### Arquivos
- `plano de implementacao.md` (criado)

### Verificações
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- A pasta ainda não é repositório git: sem commit/tag nesta sessão.

---

## Sessão: 01/08/2026 — Monetização revisada, PB por treino, Tier 3 adiado

### O que foi feito
- Atualizado `plano de implementacao.md` com novas decisões de monetização e produto.
- **Monetização revisada**: Tier 1 **pago de baixo valor** com **trial de 3 meses**
  (gratuito, sem anúncios) e **versionamentos gratuitos** para licenciados;
  alternativa free **com anúncios esportivos** (pagamento remove anúncios);
  **Tier 2** (upgrade) com licença **anual ou vitalícia**; **micro-transações**
  (R$ 4,99 / 9,99 / 19,90) para features pequenos e lojinhas.
- **Regra de PB alterada**: resultado de **treino pode atualizar o PB** quando for
  o melhor tempo obtido (PB = melhor tempo entre `prova` e `treino`).
- **Tier 3 adiado**: vira "visão futura (possível), sem foco agora"; Fase D
  removida do roadmap ativo. Backend/vestíveis mantidos só como referência.
- **Estratégia de anúncios definida**: anúncios só em **contexto online**;
  a licença remove anúncios e mantém o **offline limpo**.
- **Calculadora de ritmo** rebaixada do Tier 3 para **micro-transação** (compra
  única, feature separado com integração) e **bônus na licença vitalícia do Tier 2**.
- **Lojinhas/cosméticos**: adiado (decisão do usuário).

### Decisões (consultas do usuário)
- Trial sem anúncios → ao expirar, free com anúncios OU licença Tier 1 sem anúncios.
- Calculadora de ritmo: compra única + bônus vitalício (os dois).
- Lojinha/cosméticos: fica para depois.
- Estratégia de anúncios offline: confirmada (anúncios só online).

### Arquivos
- `plano de implementacao.md` (atualizado)

### Verificações
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- A pasta ainda não é repositório git: sem commit/tag nesta sessão.

---

## Sessão: 02/08/2026 — Fase A: exportação CSV/XLSX (Tier 1) + git ativo

### O que foi feito
- **`git init` + `core.hooksPath .githooks`**: repositório ativo, hook SemVer
  funcionando (remote ainda não configurado — push pendente).
- Criado **`exporter.js`** (módulo ES):
  - `buildResultsRows(state, getSplitsForEvent)` — provas selecionadas →
    colunas prova/série/baliza/nome/equipe/sexo/tempo balizado + parciais
    `Hist Xm`/`Prova Xm`.
  - `buildActivityLogRows(activityLog)` — aba de log.
  - `exportResults(...)` — **XLSX** (SheetJS via CDN, lazy-load no clique) com
    abas Resultados + Log; **fallback CSV** (BOM UTF-8, `;`) quando offline.
- **`index.html`**: botão **"Exportar Excel"** na tela de Controle.
- **`app.js`**: `import { exportResults }` + `handleExportResults` (guarda sem
  provas selecionadas, registra ação no log).
- **`sw.js`**: cache `pbtracker-v2` → **`pbtracker-v3`** (+ `exporter.js` no shell).
- **Docs**: `PDR.md` (RF-23, UC-09, CA-07, fluxo 5.6), `ARCHITECTURE.md` (seção 9
  de exportação, cache v3, limitações), `CHANGELOG.md` (v0.2.0), `README.md`
  (instruções + estrutura), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Começar pela **Fase A** do plano (exportação).
- Inicializar o **git** agora (hooks SemVer ativos).
- CSV com **separador `;`** + BOM UTF-8 (Excel pt-BR).

### Arquivos
- `exporter.js` (criado)
- `index.html`, `app.js`, `styles.css`, `sw.js` (alterados)
- `PDR.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: exportacao de resultados em CSV e XLSX` → MINOR → **v0.2.0**.
- **Remote configurado**: `origin https://github.com/Jeffrog22/pb-tracker.git`;
  `master` + tags `v0.1.0`/`v0.2.0` publicados (push ativo).
