<!-- última-sessão: 03/08/2026 — Máscara de PR parcial acumula dígitos (001923 → 00:19:23) → v0.3.2 -->
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
- **Versão atual:** v0.3.2
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
- **Cache do service worker**: nome `pbtracker-v4` em `sw.js` (app shell inclui
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

---

## Sessão: 03/08/2026 — Redesign do front (bottom-nav + novo visual do cronômetro)

### O que foi feito
- **`styles.css` reescrito** no novo design system: paleta nova em `:root`
  (`--bg-header-timer` escuro, `--timer-digits` ciano, `--btn-start` verde,
  `--btn-reset` magenta, `--btn-save` laranja), botões `pill`, `body` com
  `padding-bottom` para o bottom-nav. Mantidas as classes funcionais (device
  guard, telas, status, tabelas, media queries, `pointer: coarse`).
- **`index.html`**:
  - Novo `<nav class="bottom-nav">` fixo com 3 abas (Início, Provas, Controle)
    em SVG inline + `data-screen`.
  - `#chronoDialog` reestruturado: `.timer-container` escuro (botões pill
    Iniciar/Parar + `.timer-display`), pendências, `.athletes-card` dos atletas,
    `.action-footer` com Registrar (`btn-save`) e Fechar (`btn-cancel`).
- **`app.js`**: bind dos `.nav-item` → `showScreen()`; `showScreen` sincroniza a
  aba ativa; cartões de atleta migrados para `.athlete-row`/`.partials-grid`/
  `.partial-input`; guarda na tela de Controle ("Selecione provas primeiro").
- **`sw.js`**: cache `pbtracker-v3` → **`pbtracker-v4`**.

### Decisões (consultas do usuário)
- Reestruturar **todo** o front para o design do CSS colado.
- Cronômetro **mantido como dialog** (não vira header fixo); o header escuro do
  dialog usa o `timer-container` do novo design.

### Arquivos
- `styles.css` (reescrito)
- `index.html`, `app.js`, `sw.js` (alterados)
- `ARCHITECTURE.md`, `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js`: 0 erros
- Teste visual via `npx serve .` (device emulation): importar → filtro →
  controle → cronômetro → registrar.
- Ação registrada em `project-actions.log` via `node project-action-log.js`.

---

## Sessão: 03/08/2026 — Correção dos inputs de PR parcial (histórico) + label

### O que foi feito
- **Inputs de histórico não recebiam valores** (2 causas):
  - No dialog do cronômetro (`renderChronoAthletes`), os inputs `data-role="history"`
    eram criados **sem nenhum listener** (nem máscara, nem persistência).
  - Na tela de controle (`renderAthleteCard`), cada tecla chamava `renderControl()`,
    re-renderizando a tela inteira e perdendo o foco após a 1ª tecla.
- **Correções em `app.js`**:
  - `attachTimeMask`: `input.select()` no foco → digitar substitui o `00:00:00`
    pré-preenchido independente da posição do cursor.
  - `renderAthleteCard`: persistência em `athlete.history[split]` + atualização
    **pontual** do `.current-value` (com `data-split`) ao lado, sem re-render.
  - `renderChronoAthletes`: anexados `attachTimeMask` + listener de input
    (mesma lógica pontual), gravando em `athlete.history`.
- **Label renomeada**: `Histórico Xm` → **`PR Parcial Xm`** nos 4 pontos
  (tela de controle + dialog), mantendo a divisão via `getSplitsForEvent`
  (mesma lógica do `Prova Xm`).
- **`exporter.js`**: cabeçalho `Hist Xm` → `PR Parcial Xm` (Excel/CSV).
- **Docs**: `CHANGELOG.md` (v0.3.1), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Renomear também o cabeçalho da coluna no exportador (`PR Parcial Xm`).
- Commit classificado como `fix:` → PATCH → **v0.3.1**.

### Arquivos
- `app.js`, `exporter.js` (alterados)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js exporter.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: corrige inputs de PR parcial e renomeia label Historico para PR Parcial`
  → PATCH → **v0.3.1** → push origin master + tag.

---

## Sessão: 03/08/2026 — Máscara de PR parcial acumula dígitos (001923 → 00:19:23)

### O que foi feito
- **Bug na máscara de tempo** (`attachTimeMask` em `app.js`): cada tecla era lida
  do valor DOM já formatado (`input.value.replace(/\D/g,"")`), e como o campo
  vinha pré-preenchido com `00:00:00`, os zeros ocupavam as 6 posições — digitar
  "001923" resultava sempre em `00:00:00` (dígitos engolidos).
- **Correção**: `attachTimeMask` reescrita para modelo de **buffer de dígitos
  crus** em `input.dataset.digits`:
  - `beforeinput` intercepta digitação (acumula até 6 dígitos), colagem e
    backspace (`deleteContentBackward/Forward`), grava `input.value =
    digitsToTimeMask(buffer)` e re-emite `input` (bubbles) para que os listeners
    de persistência/diff existentes rodem.
  - `focus` inicializa o buffer a partir do valor (tratando `00:00:00` como
    vazio) e seleciona o texto.
- **Resultado**: digitar `0 0 1 9 2 3` → `00:19:23`, na tela de controle e no
  dialog do cronômetro (ambos usam `attachTimeMask`).
- **Docs**: `CHANGELOG.md` (v0.3.2), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Modelo **simples**: digitar acumula dígitos e backspace remove o último
  (sem edição avançada de cursor).

### Arquivos
- `app.js` (alterado)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js`: 0 erros
- Simulação do buffer: `001923` → `00:19:23`
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: mascara de PR parcial acumula digitos (001923 -> 00:19:23)`
  → PATCH → **v0.3.2** → push origin master + tag.
