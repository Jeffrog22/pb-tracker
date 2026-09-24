# AGENTS.md — PBTracker

## Regras de Ouro

- **Report style**: ao finalizar, responder com `Done.` + bullets do que foi feito + `commit hash + tag → destino`.
  Ex:
  ```
  Done.
  - Corrige A
  - Adiciona B
  `abc123 + v1.9.20 → origin/master`
  ```
- **AGENTS.md é o único histórico**: SESSION.md não existe. Toda sessão registrada aqui. O `project-summary.md` é legado.
- **Registrar ações**: além da sessão no AGENTS.md, rodar `node project-action-log.js "descrição"` para gravar em `project-actions.log`.
- **Commits + Push**: ao receber "done", executar automaticamente: `git add -A → git commit -m "..." → git push origin master && git push origin <tag>`. **Nunca perguntar se deve push** — fazer sempre.
- **Consultar antes de codificar**: ler `ARCHITECTURE.md` e `PDR.md` antes de gerar ou modificar código.

## Versionamento (SemVer via hook)

- Hook `.githooks/post-commit` lê a mensagem do commit e faz o bump automaticamente:
  - `feat:` → MINOR (v0.X.0)
  - `fix:`/`refactor:`/`chore:`/`docs:` → PATCH (v0.0.X)
  - `BREAKING CHANGE` ou `!:` → MAJOR (vX.0.0)
  - Tags conflitantes (orphan) são puladas automaticamente.
- O mesmo hook também atualiza `APP_VERSION` em `app.js` e faz `git commit --amend --no-edit --no-verify` (guard `PBTRACKER_AMENDING` contra loop), garantindo que o commit empurrado/deployado já tenha a versão correta (Vercel). Hooks `pre-commit`/`commit-msg` não servem para isso: no git 2.52 só o staging do `pre-commit` entra no commit, e o `pre-commit` não tem acesso à mensagem.
- Hook ativa após `git init && git config core.hooksPath .githooks` (já executado no repositório).
- **`APP_VERSION` em `app.js` é a fonte da versão exibida no app** — atualizar a cada release junto do CHANGELOG e da tag SemVer (app é estático, não lê tag git).
- `CHANGELOG.md` deve sempre refletir a versão lançada.

## Identidade

- **Nome:** PBTracker — Balizamento + SwimBase (Modo Treino).
- **Stack:** HTML + CSS + JS puro (ES modules, sem build) + PWA (manifest + SW) + IndexedDB (SwimBase) + Canvas (gráficos). Sem backend, sem testes automatizados. Validação via `node --check`.
- **Repositório:** git ativo; remote `origin https://github.com/Jeffrog22/pb-tracker.git`.
- **Deploy:** Vercel (integração git, push em master publica automaticamente, Output Directory na raiz).
- **Versão atual:** APP_VERSION `"0.28.0"` em `app.js`; cache SW `pbtracker-v66` em `sw.js`.

## Estrutura de Arquivos

| Arquivo | Função |
|---------|--------|
| `app.js` | Lógica principal: estado, parsing, cronômetro (balizamento), UI, roteamento de modos |
| `swimbase.js` | SwimBase (Tier 2): atletas, turmas, Modo Treino, PRs, Análise (3 abas) |
| `utils.js` | Helpers compartilhados: máscara de tempo, normalização, `uid`, `todayStamp` |
| `db.js` | Wrapper IndexedDB (`pbtracker-swimbase`): atletas/turmas/registros/prs/settings |
| `charts.js` | Gráficos Canvas nativos (progressão temporal + evolução de PR) |
| `exporter.js` | Exportação CSV/XLSX (SheetJS sob demanda, fallback CSV) + registros/PRs SwimBase |
| `styles.css` | Tema, layout mobile-first, design system (dark mode, alto contraste) |
| `sw.js` | Service worker: cache offline (`pbtracker-v66`) — **atualizar nome ao subir versão** |
| `index.html` | Telas, dialogs (cronômetro com HUD layer, SwimBase), manifest |
| `manifest.webmanifest` | Metadados PWA (sem trava de orientação; sigue o dispositivo) |
| `icons/` | Ícones PWA (SVG) |
| `project-action-log.js` | Script para registrar ações em `project-actions.log` |
| `PDR.md` | Requisitos do produto (Tier 1 — balizamento) |
| `PDR-SwimBase.md` | Requisitos do SwimBase (Tier 2) |
| `ARCHITECTURE.md` | Arquitetura técnica |

## Modos e Roteamento

- `state.appMode` controla o modo: `"balizamento"` ou `"swimbase"`.
- Tela de Modos (`#screenMode`) roteia para cada área; bottom-nav é renderizada dinamicamente por `renderNav()`.
- `enterMode` esconde o `#exportBtn` no SwimBase.
- **Device guard** (`applyDeviceGuard`) bloqueia **somente o balizamento** (>1024px). SwimBase é liberado em desktop.
- Cronômetro do Balizamento (`#chronoDialog`) e do SwimBase (`#sbChronoDialog`) são modais separados; o do balizamento tem HUD layer arrastável (`#chronoHudLayer`).

## Pontos de Atenção (Não Óbvios)

- **`file://` não funciona**: ES modules + service worker exigem HTTP (`npx serve .` ou `python -m http.server 8080`).
- **Parser de PDF acoplado ao layout**: `parseRowsFromPdfLines`/`parseAthleteLine` em `app.js` esperam o padrão `série baliza código ... tempo`. Novos layouts podem exigir ajuste.
- **Tempos `S/T`, `NT` e `00:00:00`** são aceitos e normalizados — nunca quebrar o fluxo com eles.
- **Correspondência de equipe é fuzzy** (`isSameTeam`/`getTeamTokens`): remove acentos e stop-words; pede interseção de tokens.
- **Importação em duas passadas**: estrita (só equipe conhecida) → se vazia, tolerante (`allowUnknownTeam: true`).
- **Exportação**: XLSX via SheetJS (CDN, lazy-load no clique); fallback CSV (BOM UTF-8, separador `;`). `#exportBtn` no topbar exporta **todas** as provas (`groupedEvents`). Células de parcial sem metragem viram `--`.
- **Cache do service worker**: nome `pbtracker-v66` em `sw.js`. Ao subir versão, atualizar o nome do cache para forçar o app a baixar a nova versão.
- **Tag de versão no topbar** (`#appVersionTag`) renderiza `PBTracker v0.28.0` a partir de `APP_VERSION` — manter sincronizado em cada release.
- **Configurações**: engrenagem `#settingsBtn` abre `#settingsDialog` (Atualizar app + Exportar log + alto contraste + dark mode). Badge "Pronto" removido (v0.10.5); aviso de atualização fica só no botão Atualizar.
- **Perfil**: cadastro/login local (sem senha), uma equipe por perfil, persistido em `localStorage["pbtracker_profiles"]` / `localStorage["pbtracker_active_profile"]`.
- **PR = melhor tempo por `atletaId + estilo + distância`** (prova ou treino). `checkPrAndFlag` grava `flagPr`; badge `PR!` dourado + haptics.
- **`sw.registros`** é a fonte da Análise (não re-lê IndexedDB por tela); `persistRegistro` mantém sincronia em memória.
- **Wake Lock**: acionado em `startTreino`, liberado em `finalizeTreino`/`closeTreino` (re-adquirido em `visibilitychange`).
- **Alto contraste**: `body.high-contrast` + persistência em `localStorage["pbtracker_high_contrast"]`.
- **Indicador offline**: `#offlineBadge` no topbar via `bindOnlineStatus`.
- **Export SwimBase**: `exportSwimBaseRegistros`/`exportSwimBasePRs` em `exporter.js` (XLSX via SheetJS, fallback CSV).
- **Categoria automática** por idade: Pré-Mirim → M80+; hint atualizada no campo nascimento.
- **M2 sync de descanso (≤10s)**: atletas com diferença ≤10s são congelados/liberados juntos; relógio mestre para quando todos liberados.
- **M2 split só ≥ 50m**: `recordM2Split` retorna se `dist < 50`; botão mostra "Iniciar" (não "Split") para dist < 50m.
- **Comparador de Atletas**: 3 abas na Análise — Análise (individual), Comparação (VS, 2 atletas), Desempenho (Chart.js via CDN). Dados reais do IndexedDB.
- **Cronômetro do Balizamento**: visual unificado com SwimBase (frame escuro `#0c101c`, clock icon, status badge). Display usa `maskTimeHTML` (formato `MM'SS"CC` com centésimos em `<span class="cc-mini">`).
- **Cores de baliza**: aleatórias por série (`LANE_COLORS`), estáveis durante a série. Balizas extrapoladas ficam opacas (`.lane-draft`) até atribuição.

## Configuração do Ambiente

- **Node.js** para `node --check` (validação estática) e `node project-action-log.js`.
- **Navegador moderno** para execução (Chrome/Edge/Safari com ES modules, dialog, Map/Set, localStorage, SW, fetch).
- **Internet no primeiro carregamento**: PDF.js via CDN; depois funciona offline via SW.
- **Testar em mobile/tablet**: usar device emulation do DevTools (>1024px bloqueia balizamento com `#desktopNotice`).

## Validação Estática

```bash
node --check app.js
node --check utils.js
node --check db.js
node --check swimbase.js
node --check charts.js
node --check exporter.js
node --check sw.js
node --check project-action-log.js
```
