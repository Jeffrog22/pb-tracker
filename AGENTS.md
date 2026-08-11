<!-- última-sessão: 11/08/2026 — Drag-and-drop de balizas nos registros pendentes (v0.10.0) -->
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
- **Versão atual:** v0.10.0
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
- **Tag de versão no rodapé** (perfil/filtro/controle) usa a constante
  `APP_VERSION` do `app.js` — **atualizar a cada release** junto do CHANGELOG e
  da tag SemVer (app é estático; não lê a tag git).
- **Exclusão de perfil**: botão `×` em cada `.profile-item` chama `deleteProfile`
  (confirmação via `confirm`); perfil ativo excluído é desativado.
- **Configurações no topbar**: o chip "Pronto" virou a **engrenagem**
  (`#settingsBtn`) que abre o dialog `#settingsDialog` — dentro dele ficam o
  status (`#appBadge`), `#refreshAppBtn` (Atualizar app) e `#downloadLogBtn`
  (Exportar log). `#profileSwitchBtn` permanece no topbar.
- **Exportação de resultados**: `exporter.js` — XLSX via SheetJS (CDN, sob demanda,
  lazy-load no clique) com abas Resultados + Log; offline cai para CSV (BOM UTF-8,
  separador `;`). SheetJS é cacheado em runtime pelo service worker. O botão
  `#exportBtn` fica no **topbar** e exporta **todas** as provas importadas
  (`groupedEvents`), independente de `selectedProofs`. Colunas atuais:
  `Prova | Série | Baliza | Nome | Sexo | Tempo Balizado | Prova Xm...`
  (sem Equipe e sem PR Parcial).
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

---

## Sessão: 03/08/2026 — Dialog do cronômetro com cabeçalho fixo e lista rolável

### O que foi feito
- **Bug**: `.chrono-dialog` tinha `overflow: hidden` **sem `max-height`**; como o
  `<dialog>` abre em posição fixa (modal), o conteúdo que passava da viewport era
  cortado sem rolagem — a lista de atletas e os botões Registrar/Fechar ficavam
  fora da tela ("falta diagramação").
- **Correção (opção B: cabeçalho fixo + conteúdo rolável)**:
  - `index.html`: pendências + atletas envolvidos num novo `.chrono-scroll`
    (timer-container fica fora, acima; action-footer fora, abaixo).
  - `styles.css `.chrono-dialog``: `display:flex; flex-direction:column;
    max-height: 100vh; max-height: min(100dvh,100vh)`.
  - `styles.css`: novo `.chrono-scroll { flex:1; min-height:0; overflow-y:auto;
    -webkit-overflow-scrolling:touch }` → rola só pendências + atletas; cabeçalho
    do cronômetro e botões ficam fixos.
- **Docs**: `CHANGELOG.md` (v0.3.3), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Opção B (cabeçalho fixo e lista rolável) em vez de rolar o dialog inteiro.

### Arquivos
- `index.html`, `styles.css` (alterados)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js`: 0 erros
- Teste visual via `npx serve .` (device emulation): abrir série grande e
  conferir rolagem da lista com cronômetro e botões fixos.
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: dialog do cronometro com cabecalho fixo e lista rolavel`
  → PATCH → **v0.3.3** → push origin master + tag.

---

## Sessão: 03/08/2026 — Dialog do cronômetro aparecia travado na tela inicial

### O que foi feito
- **Bug**: `display: flex` aplicado a `.chrono-dialog` (v0.3.3) sem escopar ao
  estado aberto. Regra de autor vence a regra do navegador
  (`dialog:not([open]) { display:none }`), então o dialog ficava **sempre
  visível**, cobrindo o app: cronômetro aparecia na tela inicial, não fechava e
  a barra de navegação ficava bloqueada (sintomas idênticos em desktop e mobile).
- **Correções**:
  - `styles.css`: flex/altura movidos para `.chrono-dialog[open]`
    (`display:flex; flex-direction:column; max-height:min(100dvh,100vh);
    overflow-y:auto`). Fechado → `display:none` do navegador volta a valer;
    aberto via `showModal()` → layout de cabeçalho fixo + lista rolável funciona.
  - `app.js`: listener de `click` no `#chronoDialog` fecha ao clicar fora do
    retângulo (backdrop) — rede de segurança ao botão Fechar.
  - `sw.js`: cache `pbtracker-v4` → `pbtracker-v5` (garante shell novo e limpa
    caches antigos com a versão travada).
- **Docs**: `CHANGELOG.md` (v0.3.4), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Adicionar clique-fora-para-fechar + bump do cache SW para v5 (ambos recomendados).

### Arquivos
- `styles.css`, `app.js`, `sw.js` (alterados)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js sw.js`: 0 erros
- Teste visual via `npx serve .` (emulação): tela inicial sem o cronômetro;
  abrir série → cronômetro aparece e fecha (botão Fechar e clique fora); nav
  responde.
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: dialog do cronometro visivel mesmo quando fechado (display flex fora do estado aberto)`
  → PATCH → **v0.3.4** → push origin master + tag.

---

## Sessão: 06/08/2026 — Tabela de detalhes do filtro com 'Tempo da prova' e botão olho das parciais

### O que foi feito
- **`buildEventDetailsTable` (`app.js`)** da tela Filtro ("Ver séries e atletas"):
  - Nova coluna **Tempo da prova** mostra o tempo final registrado da prova
    (último parcial salvo no cronômetro via `athlete.current`, ex.: 100m → `current[100]`).
  - Nova coluna de **botão olho por atleta** entre **Tempo balizado** e **Tempo da prova**:
    ao clicar, revela as parciais da prova na própria coluna.
  - Helpers novos: `getFinalRaceTime(athlete, eventName)` e
    `buildPartialsGrid(athlete, eventName)` (reuso de `getSplitsForEvent` +
    `buildDiffLabel`).
- **`styles.css`**: `.eye-btn` (botão ícone circular), `.partials-expand-row td`
  (fundo + padding), `.partials-expand-row .partials-grid` e `overflow-x: auto`
  em `.proof-details.open` (tabela de 6 colunas em telas estreitas).
- **Docs**: `CHANGELOG.md` (v0.4.0), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Botão olho **por linha de atleta** (não único no cabeçalho).
- Coluna **Tempo da prova** entre o olho e as parciais reveladas.

### Arquivos
- `app.js`, `styles.css` (alterados)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: coluna tempo da prova e botao olho com parciais na tabela de detalhes do filtro`
  → MINOR → **v0.4.0** → push origin master + tag.

---

## Sessão: 06/08/2026 — Parciais inline (toggle) na coluna do olho do filtro

### O que foi feito
- **Ajuste do v0.4.0** (`buildEventDetailsTable` em `app.js`): o clique no olho
  não abre mais card abaixo da linha. O próprio ícone é substituído pelas
  parciais da prova na mesma coluna (`eye-cell`), entre **Tempo balizado** e
  **Tempo da prova** — ex. 50m → `00:23:70/00:26:07` (só `athlete.current`, sem
  PR/diff), juntadas por `/`.
- **Toggle**: clicar novamente nas parciais (`role="button"`) restaura o ícone
  do olho, ocultando as parciais.
- Cabeçalho da coluna do olho passou a exibir **ver**.
- **`buildPartialsGrid` removido** (não usado); novo helper
  `buildPartialsInline(athlete, eventName)`. `getFinalRaceTime` mantido.
- **`styles.css`**: removidos `.partials-expand-row td` e
  `.partials-expand-row .partials-grid`; adicionado `.partials-inline`
  (monospace, `cursor:pointer`, `white-space:nowrap`); mantido `overflow-x: auto`
  em `.proof-details.open`.
- **Docs**: `CHANGELOG.md` (v0.4.1), `AGENTS.md` (esta sessão).

### Decisões (consultas do usuário)
- Não trazer card completo; só as parciais da prova, inline na coluna do olho.
- Toggle no próprio texto das parciais para restaurar o ícone.

### Arquivos
- `app.js`, `styles.css` (alterados)
- `CHANGELOG.md`, `AGENTS.md` (alterados)

### Verificações
- `node --check app.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: parciais inline (toggle) na coluna do olho da tabela de detalhes do filtro`
  → PATCH → **v0.4.1** → push origin master + tag.

---

## Sessão: 07/08/2026 — Perfil de professor/equipe (tela de login/cadastro local) + remoção da data

### O que foi feito
- **Tela de perfil** (`#screenLogin`) criada: **cadastro** (nome do professor +
  nome da equipe) e **login** (seleção de perfis salvos). Acesso via nav "Início"
  quando não há perfil ativo; botão **"Trocar usuário"** no topbar.
- **Persistência local**: `localStorage["pbtracker_profiles"]` (array de
  `{ id, professor, equipe, createdAt }`) e `localStorage["pbtracker_active_profile"]`
  (id ativo). No carregamento, perfil ativo → vai direto à importação com a
  equipe pré-preenchida; senão → tela de perfil.
- **Campo "Data da Competição" removido** da importação (`handleImport` agora
  exige só equipe + arquivo; `state.competitionDate = todayISO()`). A data é
  usada apenas no nome do arquivo exportado (exporter.js já tinha fallback).
- `showScreen` ganhou o modo `login`; o nav "Início" roteia para o perfil quando
  não há perfil ativo. Chip `#activeProfileChip` exibe "Prof. X · Equipe Y".
- **`styles.css`**: seção de estilos `.profile-list/.profile-item/.profile-form/
  .profile-divider/.profile-chip`.
- **`sw.js`**: cache `pbtracker-v5` → **`pbtracker-v6`**.

### Decisões (consultas do usuário)
- Perfil **local sem senha** (app offline, sem backend).
- **Uma equipe por perfil**; equipe continua editável na importação (variações do PDF).
- Campo de data **removido** da importação (data atual automática no export).

### Arquivos
- `index.html`, `app.js`, `styles.css`, `sw.js` (alterados)
- `PDR.md` (RF-24 a RF-27, UC-10/11, fluxo 5.1, cache SW v6), `ARCHITECTURE.md`
  (telas, estado, persistência de perfis, cache v6), `CHANGELOG.md` (v0.5.0),
  `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: perfil de professor e equipe (login/cadastro local) e remocao do campo de data da importacao`
  → MINOR → **v0.5.0** → push origin master + tag.

---

## Sessão: 08/08/2026 — Exclusão individual de perfil + tag de versão (APP_VERSION)

### O que foi feito
- **Excluir perfil individual**: cada item da lista de perfis virou
  `<div class="profile-item">` com botão principal (ativa o perfil) + botão `×`
  (`.profile-item-delete`) que chama `deleteProfile(id)` — confirma via `confirm`,
  remove do `state.profiles`, `saveProfiles()`, desativa o perfil se for o ativo,
  re-renderiza a lista e registra a ação no log.
- **Tag de versão**: nova constante `const APP_VERSION = "0.6.0"` no `app.js`;
  `renderVersionTags()` preenche os `<div class="version-tag">` (rodapé dos
  painéis de **perfil, filtro e controle**) com `v${APP_VERSION}`. Chamado no `init()`.
- **Labels do cadastro** simplificados (Professor/Equipe, sem placeholders) — ajuste feito pelo usuário.
- **`styles.css`**: `.profile-item` vira flex; novos `.profile-item-main`/
  `.profile-item-delete`/`.version-tag`.
- **`sw.js`**: cache `pbtracker-v6` → **`pbtracker-v7`**.

### Decisões (consultas do usuário)
- Clean button = **excluir perfil individual** (não apagar tudo nem limpar form).
- Tag de versão no **rodapé das 3 telas** (login/filtro/controle).
- `APP_VERSION` é a fonte da versão no app estático (não lê tag git) — **atualizar
  a cada release** junto do CHANGELOG e da tag SemVer.

### Arquivos
- `index.html`, `app.js`, `styles.css`, `sw.js` (alterados)
- `PDR.md` (RF-28/29, UC-12, cache SW v7), `ARCHITECTURE.md` (exclusão de perfil,
  seção "Versão do app", cache v7), `CHANGELOG.md` (v0.6.0), `AGENTS.md` (esta
  sessão)

### Verificações
- `node --check app.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: botao excluir perfil individual e tag de versao nas telas de login, filtro e controle`
  → MINOR → **v0.6.0** → push origin master + tag.

---

## Sessão: 08/08/2026 — Engrenagem de configurações (dialog) no topbar

### O que foi feito
- **Engrenagem no topbar**: o chip `#appBadge` ("Pronto") foi substituído pelo
  botão `#settingsBtn` (`.icon-btn`, SVG de engrenagem) que abre o dialog modal
  `#settingsDialog` de Configurações.
- **Dialog de Configurações** (`#settingsDialog`): cabeçalho com título +
  `#closeSettingsBtn` (Fechar); corpo com a **linha de status** (`#appBadge`,
  "Pronto"/"Nova versão"), `#refreshAppBtn` (Atualizar app) e `#downloadLogBtn`
  (Exportar log). Os IDs foram mantidos, então a lógica de `markUpdateAvailable`
  e `handleAppRefresh` continuou sem mudanças — só realocou o DOM.
- **`app.js`**: refs `settingsBtn/settingsDialog/closeSettingsBtn`; abertura via
  `showModal()`, fechamento por botão e clique no backdrop (padrão do cronômetro).
- **`#profileSwitchBtn`** (Trocar usuário) permanece no topbar.
- **`styles.css`**: `.icon-btn` (botão circular) e `.settings-dialog`/
  `.settings-head`/`.settings-body`/`.settings-row`.
- **`sw.js`**: cache `pbtracker-v7` → **`pbtracker-v8`**.

### Decisões (consultas do usuário)
- Configurações como **dialog modal** (não tela na bottom-nav).
- Botão **Trocar usuário permanece no topbar**.

### Arquivos
- `index.html`, `app.js`, `styles.css`, `sw.js` (alterados)
- `PDR.md` (RF-30, cache SW v8), `ARCHITECTURE.md` (topbar/dialog de configurações,
  cache v8), `CHANGELOG.md` (v0.7.0), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: engrenagem de configuracoes no topbar com atualizar app e exportar log no dialog`
  → MINOR → **v0.7.0** → push origin master + tag.

---

## Sessão: 08/08/2026 — Exportação de todos os resultados do filtro (botão no topbar)

### O que foi feito
- **Exportar tudo**: `buildResultsRows` (`exporter.js`) passou a iterar **todas**
  as provas de `state.groupedEvents` (mesma ordem do filtro) em vez de
  `selectedProofs`; `exportResults` não recebe mais `selectedProofs`; guarda
  "Nenhum resultado disponível para exportar.".
- **Botão no topbar**: `#exportBtn` saiu da tela de Controle e foi para o
  **topbar**, entre `#profileSwitchBtn` e `#settingsBtn` (id/binding mantidos).
  `#backToFilterBtn` permanece na tela de Controle.
- **`styles.css`**: regra `.topbar-actions #exportBtn` (tamanho compacto como os
  demais botões do topo).
- **`sw.js`**: cache `pbtracker-v8` → **`pbtracker-v9`**.

### Decisões (consultas do usuário)
- Exportar **todas** as provas importadas, independente da seleção no filtro.
- Botão de exportar posicionado no topbar **entre "Trocar usuário" e a engrenagem**.
- Colunas do Excel/CSV **mantidas** (Prova, Série, Baliza, Nome, Equipe, Sexo,
  Tempo Balizado, PR Parcial Xm, Prova Xm).

### Arquivos
- `exporter.js`, `app.js`, `index.html`, `styles.css`, `sw.js` (alterados)
- `PDR.md` (RF-23, fluxo 5.6, cache SW v9), `ARCHITECTURE.md` (seção 9, cache v9),
  `CHANGELOG.md` (v0.8.0), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: exportacao de todos os resultados do filtro com botao no topbar`
  → MINOR → **v0.8.0** → push origin master + tag.

---

## Sessão: 08/08/2026 — Remoção de colunas Equipe e PR Parcial do export (v0.8.1)

### O que foi feito
- **Export (Excel/CSV) enxuto**: `buildResultsRows` (`exporter.js`) removeu a
  coluna **Equipe** e as colunas **PR Parcial Xm** (histórico); o export passa a
  ter `Prova | Série | Baliza | Nome | Sexo | Tempo Balizado | Prova Xm...`
  (apenas os tempos das parciais de prova, via `athlete.current`).
- Mudança **somente no arquivo exportado** — telas (controle/filtro) inalteradas.
- **`sw.js`**: cache `pbtracker-v9` → **`pbtracker-v10`**.

### Decisões (consultas do usuário)
- Remover Equipe e PR Parcial **apenas no export** (não na UI).
- Coluna **Sexo mantida**.

### Arquivos
- `exporter.js`, `app.js` (APP_VERSION), `sw.js` (alterados)
- `CHANGELOG.md` (v0.8.1), `ARCHITECTURE.md` (seção 9, cache v10), `PDR.md`
  (fluxo 5.6, cache v10), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `refactor: remove colunas equipe e PR parcial do export mantendo apenas parciais de prova`
  → PATCH → **v0.8.1** → push origin master + tag.

---

## Sessão: 10/08/2026 — Label Volta/Tempo Final no controle + export XLSX sem Sexo (v0.9.0)

### O que foi feito
- **Export XLSX sem a coluna Sexo**: `buildResultsRows` (`exporter.js`) ganhou o
  parâmetro `includeSexo = true` — quando `false`, omitem o header `Sexo` e a
  célula correspondente. Em `exportResults`, a ramificação **XLSX** regenera os
  dados com `includeSexo: false` (`Prova | Série | Baliza | Nome | Tempo
  Balizado | Prova Xm...`); o **fallback CSV mantém a coluna Sexo**.
- **Labels das parciais no Controle + cronômetro**: novo helper `splitLabel(split,
  splits)` em `app.js` — retorna `Tempo Final Xm` para a última parcial
  (`splits[splits.length - 1]`, ex.: 200m numa prova de 200) e `Volta Xm` para as
  demais. Aplicado nos 4 pontos de label `Prova Xm`:
  `renderAthleteCard` (tela de Controle) e `renderChronoAthletes` (dialog do
  cronômetro). Somente o texto muda — `PR Parcial`, chaves `current[split]` e
  históricos intactos.
- **`app.js`**: `APP_VERSION` → **`0.9.0`**.
- **`sw.js`**: cache `pbtracker-v10` → **`pbtracker-v11`**.

### Decisões (consultas do usuário)
- Aplicar a troca de labels **no Controle e no cronômetro** (consistência visual).
- Última parcial com **distância no label**: `Tempo Final 200m` (mesmo padrão de
  `Volta 50m`, só trocando o prefixo).
- Remover Sexo **somente no XLSX** (CSV mantém).

### Arquivos
- `exporter.js`, `app.js` (APP_VERSION + splitLabel + labels), `sw.js` (alterados)
- `CHANGELOG.md` (v0.9.0), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: label Volta e Tempo Final no controle e cronometro e remocao da coluna Sexo no export XLSX`
  → MINOR → **v0.9.0** → push origin master + tag.

---

## Sessão: 10/08/2026 — Cabeçalhos do export XLSX com Volta/Tempo Final (v0.9.1)

### O que foi feito
- **Cabeçalhos das parciais no XLSX**: `buildResultsRows` (`exporter.js`) ganhou o
  parâmetro `splitLabels = false`. Quando `true`, os headers das parciais passam a
  espelhar o `splitLabel` do `app.js`: última parcial (`orderedSplits[...length-1]`)
  → `Tempo Final Xm`, demais → `Volta Xm`. A ramificação **XLSX** usa
  `buildResultsRows(state, getSplitsForEvent, false, true)` (Volta/Tempo Final,
  sem Sexo); o **CSV de fallback mantém `Prova Xm`** (com Sexo).
- **`app.js`**: `APP_VERSION` → **`0.9.1`**.
- **`sw.js`**: cache `pbtracker-v11` → **`pbtracker-v12`**.

### Decisões (consultas do usuário)
- Cabeçalhos novos **somente no XLSX** (mesmo escopo da remoção do Sexo);
  CSV inalterado.

### Arquivos
- `exporter.js`, `app.js` (APP_VERSION), `sw.js` (alterados)
- `CHANGELOG.md` (v0.9.1), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: cabecalhos das parciais no export XLSX acompanham labels Volta/Tempo Final`
  → PATCH → **v0.9.1** → push origin master + tag.

---

## Sessão: 11/08/2026 — Layout mobile: cronômetro compacto, parciais uniformes (v0.9.2)

### O que foi feito
- **`index.html`**: removido o label `Cronômetro` (h3) e `#chronoDisplay` movido
  para dentro de `.timer-controls`, no espaço do label — entre Iniciar/Voltas e
  Parar/Reiniciar.
- **`styles.css` (cronômetro)**:
  - `.timer-container` com **borda ciano** (`var(--timer-digits)`) contornando
    todo o timer + `border-radius` superior; padding reduzido (moldura top menor).
  - `.timer-display` menor (`clamp(1.4rem,6vw,2.2rem)`), `flex:1`, `nowrap`.
  - `#chronoTitle` e `#nextCapture`: `text-align:left`, `font-size:0.75rem`,
    `font-weight:500`, `opacity:0.75` (somente esses dois — tabela de pendentes
    mantém o estilo).
  - `.action-footer` com `justify-content:flex-end`; `.btn-save`/`.btn-cancel`
    menores (`padding:6px 16px`, `font-size:0.8rem`).
  - Moldura top/down reduzida: margens de `.action-footer`, `.pending-wrap` e
    `.chrono-dialog .athletes-card` menores → mais espaço vertical para a lista
    de registros.
- **`styles.css` (parciais)**: no `@media (pointer: coarse)`,
  `.partials-grid .current-value` ganha `min-height:42px` + flex centralizado —
  mesmo tamanho do `.partial-input` (PR Parcial), no Controle e no cronômetro.
- **`app.js`**: `APP_VERSION` → **`0.9.2`**.
- **`sw.js`**: cache `pbtracker-v12` → **`pbtracker-v13`**.

### Decisões (consultas do usuário)
- Borda do timer na cor **ciano** (mesma dos dígitos).
- Fonte menor/esquerda apenas em `#chronoTitle` e `#nextCapture` (pendentes sem mudança).

### Arquivos
- `index.html`, `styles.css`, `app.js` (APP_VERSION), `sw.js` (alterados)
- `CHANGELOG.md` (v0.9.2), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: melhorias de layout do cronometro e das parciais no mobile`
  → PATCH → **v0.9.2** → push origin master + tag.

---

## Sessão: 11/08/2026 — Moldura nos dígitos do cronômetro + inputs de parcial reduzidos (v0.9.3)

### O que foi feito
- **`styles.css` (cronômetro)**: a moldura ciano que envolvia o container inteiro
  foi **removida** do `.timer-container`; o quadro agora contorna somente os
  dígitos no `.timer-display` (`border: 1px solid var(--timer-digits)`,
  `border-radius: 8px`, `padding: 4px 8px`) — retângulo ao redor de `00:00:00`,
  preenchendo o espaço entre os botões.
- **`styles.css` (parciais)**: no `@media (pointer: coarse)`, o
  `.partials-grid .partial-input` ganhou `min-height: 0` (libera o 42px global de
  `input`); o `.partials-grid .current-value` perdeu o `min-height: 42px` (mantém
  o flex de centralização). Input de PR Parcial e box de Voltas/Tempo Final com a
  **mesma altura compacta (igualar ao menor)**, no Controle e no cronômetro.
- **`app.js`**: `APP_VERSION` → **`0.9.3`**.
- **`sw.js`**: cache `pbtracker-v13` → **`pbtracker-v14`**.

### Decisões (consultas do usuário)
- Moldura **somente nos números** do cronômetro (a do container removida).
- Inputs de parcial **iguais ao menor** (altura reduzida), não ao maior.

### Arquivos
- `styles.css`, `app.js` (APP_VERSION), `sw.js` (alterados)
- `CHANGELOG.md` (v0.9.3), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `fix: moldura ciano ao redor dos digitos do cronometro e inputs de parcial com altura reduzida`
  → PATCH → **v0.9.3** → push origin master + tag.

---

## Sessão: 11/08/2026 — Drag-and-drop de balizas nos registros pendentes (v0.10.0)

### O que foi feito
- **Substituição dos selects de baliza** na tabela de registros pendentes do
  cronômetro por **drag-and-drop** (`renderPending` em `app.js`):
  - `buildLaneBoard` cria os **dropzones** (balizas reais da série via
    `getSeriesBalizas`) e os **toggles** arrastáveis (um por ordem, 1..N atletas);
    toggles não atribuídos ficam na `.lane-tray`.
  - `buildPendingTable` mantém `Parcial | Ordem | Tempo | Baliza` com a baliza
    como **texto somente leitura**.
- **Drag com Pointer Events** (mouse + touch): `handleLanePointerDown/Move/Up/
  Cancel` com limiar de 6px antes de armar; `spawnLaneGhost` clona o toggle para
  dentro do dialog (`el.chronoDialog`, pois o top-layer do dialog cobre o body)
  com `position: fixed` seguindo o ponteiro; `highlightLaneDropzone` usa
  `elementFromPoint` para borda dourada (`.drop-active`) no hover.
- **Snap/Bounce**: `animateLaneGhostTo*` move o ghost ao centro do dropzone (snap
  com `transitionend` + fallback 240ms) ou de volta à origem; `assignLaneToOrder`
  grava em `ac.laneAssignments` e atualiza `capture.lane` de **todas** as capturas
  daquele `order` (retroativo entre parciais).
- **Colisão**: `getOrderForBaliza` detecta dropzone ocupado por outro toggle →
  drop recusado (volta à origem). `registerPendingTimes` segue exigindo `lane` em
  todas as capturas (toggles não atribuídos bloqueiam o registro).
- **Persistência**: `ac.laneAssignments = {}` em `openChrono`; `captureLap` já
  nasce com `lane = laneAssignments[order] || ""` → o mapeamento persiste entre
  as parciais da série.
- Removidos `buildLaneOptionsForCapture` e `groupPendingBySplit` (sem uso).
- **`styles.css`**: `.lane-board`, `.lane-dropzones` (flex wrap), `.dropzone`
  (tracejado, `drop-active` dourado), `.lane-toggle` (círculo, `touch-action:
  none`, `dragging` com opacity, `ghost` fixo com scale/sombra, `snapping` com
  transição), `.lane-tray`, `.lane-cell`.
- **`app.js`**: `APP_VERSION` → **`0.10.0`**.
- **`sw.js`**: cache `pbtracker-v14` → **`pbtracker-v15`**.

### Decisões (consultas do usuário)
- Toggles começam **na bandeja, sem atribuição** (usuário arrasta cada um).
- Coluna Baliza **mantida como leitura** na tabela.
- Colisão: **recusar e voltar** (sem swap).

### Arquivos
- `app.js`, `styles.css`, `sw.js` (alterados)
- `CHANGELOG.md` (v0.10.0), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `feat: drag-and-drop de balizas para os registros pendentes do cronometro`
  → MINOR → **v0.10.0** → push origin master + tag.

---

## Sessão: 11/08/2026 — Paleta de balizas com dropzone por linha no cronômetro (v0.10.1)

### O que foi feito
- **Redesenho do DnD** (`renderPending` em `app.js`): o board de dropzones +
  bandeja de toggles virou uma **paleta de balizas** (`.lane-palette`, sticky no
  topo à direita da lista) com **um toggle por valor de baliza** da série
  (`buildLanePalette`/`buildBalizaToggle`).
- **Dropzone por linha**: a célula Baliza da tabela virou um botão
  `.lane-dropzone` (com `data-split`/`data-order`/`data-lane`); `buildPendingTable`
  preenche com o valor atribuído ou `—`.
- **Arraste por cópia**: `handleLanePointerDown` agora inicia em `.baliza-toggle`
  (bloqueado quando `.used`) e guarda `laneDrag.baliza`; `spawnLaneGhost` clona o
  toggle (o original permanece na paleta); `highlightLaneDropzone` mira
  `.lane-dropzone`; `finishLaneDrag` derruba a baliza na ordem da linha alvo.
- **Bloqueio de toggle em uso**: `getUsedBalizasForSplit(ac, split)` calcula as
  balizas já atribuídas na parcial atual (`split = splitPlan[currentSplitIndex]`);
  toggles usados ficam esmaecidos (`.used`) e não iniciam arraste → colisão
  entre ordens fica impossível (guard `getOrderForBaliza` mantido como rede).
- **Toque limpa**: `handleLaneCellClick` + `clearLaneAssignment(order)` removem
  `laneAssignments[order]` e o `lane` das capturas da ordem (retroativo).
- **Auto-fill N=2**: `autoFillTwoAthletes` — com 2 atletas, após o primeiro drop
  a ordem restante da parcial recebe a baliza livre.
- **`styles.css`**: `.lane-palette` (sticky, flex-end, blur), `.baliza-toggle`
  (círculo + `used` tracejado/esmaecido), `.lane-dropzone` (pill tracejado,
  `filled` sólido com `cursor:pointer`, `drop-active` dourado); removidos
  `.lane-board`, `.lane-dropzones`, `.dropzone`, `.lane-dropzone-label`,
  `.lane-tray`, `.lane-toggle` e o CSS de `select` da tabela.
- Removidos `buildLaneBoard` e `buildLaneToggle` (sem uso).
- **`app.js`**: `APP_VERSION` → **`0.10.1`**.
- **`sw.js`**: cache `pbtracker-v15` → **`pbtracker-v16`**.

### Decisões (consultas do usuário)
- Corrigir atribuição: **toque na célula limpa** (re-arrastar também substitui).
- Toggle em uso na parcial atual: **bloqueado** (sem arrastar) até a parcial
  terminar (Iniciar/Voltas).

### Arquivos
- `app.js`, `styles.css`, `sw.js` (alterados)
- `CHANGELOG.md` (v0.10.1), `AGENTS.md` (esta sessão)

### Verificações
- `node --check app.js exporter.js sw.js`: 0 erros
- Ação registrada em `project-actions.log` via `node project-action-log.js`.
- Commit `refactor: paleta de balizas com dropzone por linha no cronometro (drag por copia, auto-fill N=2, tap limpa)`
  → PATCH → **v0.10.1** → push origin master + tag.
