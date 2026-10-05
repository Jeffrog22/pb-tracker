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
- **Versão atual:** APP_VERSION `"0.40.0"` em `app.js`; cache SW `pbtracker-v78` em `sw.js`.

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
| `sw.js` | Service worker: cache offline (`pbtracker-v78`) — **atualizar nome ao subir versão** |
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
- **Cache do service worker**: nome `pbtracker-v78` em `sw.js`. Ao subir versão, atualizar o nome do cache para forçar o app a baixar a nova versão.
- **Tag de versão no topbar** (`#appVersionTag`) renderiza `PBTracker v0.32.7` a partir de `APP_VERSION` — manter sincronizado em cada release.
- **Configurações (v0.38+)**: engrenagem `#settingsBtn` → `#settingsDialog` largo (720px) com **grid de 5 cards** (`grid-template-columns: 1fr` → `1fr 1fr` em ≥768px): 📤 Exportar (sub-abas Resultados/Registros/PRs/Log, filtros período+atleta, chama `exportSwimBaseFiltered`), 🔔 Notificações (permissão + lembrete local agendado), 🌓 Tema (dark mode), ♿ Acessibilidade (zoom + alto contraste), 🔄 Atualizações (versão, `checkForUpdate`, `applyUpdate`, `hardRefresh`). Cada card é `.settings-card` independente (header emoji+título, descrição, controles). Abre via `openSettingsDialog()` (renderiza status, popula atletas, checa update).
- **Zoom (card Acessibilidade)**: `document.documentElement.style.zoom` (80–150%, passo 10) + `localStorage["pbtracker_zoom"]`. **Não trocar por `font-size` no html** — o CSS do app é majoritariamente px (~398 usos) e font-size não escala paddings/cards.
- **Backdrop dos dialogs de Configurações**: fecha em `target === dialog` **ou** fora do retângulo, mas só com `event.isTrusted` — clique sintético (`.click()` programático em aba/botão) vem com `clientX/Y = 0` e fecharia o dialog. Mesma guarda em `#notifPrefsDialog`. Não remover.
- **`body.dark button` (0,1,2) vence `button.primary`/`button.ghost`**: no dark mode os `!important`/regras compensatórias em `styles.css` mantêm primary azul e ghost sem borda; qualquer novo estilo de botão precisa de especificidade ≥ 0,1,2 ou ser coberto ali.
- **Perfil**: cadastro/login local (sem senha), uma equipe por perfil, persistido em `localStorage["pbtracker_profiles"]` / `localStorage["pbtracker_active_profile"]`.
- **PR = melhor tempo por `atletaId + estilo + distância`** (prova ou treino). `checkPrAndFlag` grava `flagPr`; badge `PR!` dourado + haptics.
- **`sw.registros`** é a fonte da Análise (não re-lê IndexedDB por tela); `persistRegistro` mantém sincronia em memória.
- **Wake Lock**: acionado em `startTreino`, liberado em `finalizeTreino`/`closeTreino` (re-adquirido em `visibilitychange`).
- **Alto contraste**: `body.high-contrast` + persistência em `localStorage["pbtracker_high_contrast"]`.
- **Indicador offline**: `#offlineBadge` no topbar via `bindOnlineStatus`.
- **Fluxo de atualização (sem reload surpresa)**: o SW **não** usa `skipWaiting()` no install — update fica `waiting` até o usuário tocar em "Atualizar agora" (`applyUpdate` → `SKIP_WAITING` → `controllerchange` → reload). `controllerchange` (app.js) **só** recarrega se `swUpdateAvailable && !refreshingPage`; primeiro `registration.update()` roda no retorno ao 1º plano (throttle 30 min) e no `checkForUpdate()` do card 🔄, só para preparar o botão. **Não reintroduzir** `skipWaiting()` no install nem reload incondicional — causava reload no meio do uso voltando pra tela de modos. "Hard Refresh" (`hardRefresh`) é a única ação que apaga caches (com confirm) e recarrega.
- **Lembrete local de notificação (card 🔔)**: sem backend/push — `localStorage["pbtracker_notif_prefs"]` (`{enabled, horario, dias[], frequencia}`) + `startNotifScheduler()` (interval 60s em wall-clock, dispara `swRegistration.showNotification` quando passa do gatilho do dia; última disparada em `pbtracker_notif_last_fired`). Só com app aberto e `Notification.permission === "granted"`; iOS só em PWA instalada.
- **Restauração de sessão**: `sessionStorage["pbtracker_session"]` = `{appMode, screen}` gravado em `showScreen`; `restoreScreenSession()` no boot só restaura telas `sb-*` (fallback `mode`). `sessionStorage["pbtracker_session_analise"]` = `an`/`cmp` gravado em `pagehide` e na aba oculta, restaurado na carga de `swimbase.js` (`restoreAnaliseSession`).
- **Export SwimBase**: `exportSwimBaseRegistros`/`exportSwimBasePRs` em `exporter.js` (XLSX via SheetJS, fallback CSV).
- **Categoria automática** por idade: Pré-Mirim → M80+; hint atualizada no campo nascimento.
- **M2 sync de descanso (≤10s)**: atletas com diferença ≤10s são congelados/liberados juntos; relógio mestre para quando todos liberados.
- **M2 descanso/intervalo em wall-clock**: `raia.waitEndsAt = Date.now() + waitMs`; o tick calcula `waitEndsAt - now` — **nunca voltar a `waitMs -= 30`** (deriva; falha em 2º plano). `raia.waitKind` (`"descanso"`/`"intervalo"`) decide o label.
- **Cronômetro não fecha sozinho**: `#sbChronoDialog` tem listener `cancel` (Esc/Voltar) → `preventDefault` + `closeTreino()` com confirm; backdrop fecha **só se o gesto começar fora** do retângulo (`chronoPressInside` gravado no `pointerdown` capture — clique que começa em row/HUD/lista e termina na área de backdrop não fecha) e ignora `detail===0`, `hudDragMoved` (drag do HUD) e `m2Drag.suppressBackdrop`; `closeTreino` sempre pede confirm com dialog aberto (`inProgress` inclui `tr.raias.size > 0`); listener `close` derruba ticker/wake lock e zera `chronoPressInside`. Não remover esses guards.
- **Retoma do treino após Cancelar**: `resetTreinoSession(keepSelection = false)` — `closeTreino()` chama com `true` (mantém `tr.step`/`turmaId`/`atletas`/`waveAssigned`/`ondaAtiva`, zera só runtime e chama `renderSbTreino()` → wizard volta ao Passo 4 pronto para "Iniciar treino"); `finalizeTreino()` (Salvar) mantém o reset completo (limpa seleção). **Botão "Voltar" do wizard** zera `atletas`/`waveAssigned`/`ondaAtiva` e volta ao Passo 1 (turma e `tr.config` preservados). Próximo no Passo 1 continua zerando `tr.atletas`.
- **Rollover de registro por série (M2)**: após a última rep da série, `persistRegistro` snapshota `tempos` síncrono antes de `raia.tempos = []`/`registroId = null` (senão a rep final é perdida). `resetMaster` também zera `registroId`.
- **M2 split só ≥ 50m**: `recordM2Split` retorna se `dist < 50`; botão mostra "Iniciar" (não "Split") para dist < 50m.
- **M2 drag & drop de ordem**: alça `.sb-raia-handle` (única área com `touch-action: none`) no 1º filho de cada card; `initM2RowDrag()` delega `pointerdown` em `#sbChronoList` (sobrevive ao `innerHTML` do re-render). Reordenação ao vivo (`insertBefore` + ghost clonado `pointer-events:none` em `#sbChronoDialog`, auto-scroll nas bordas) e `commitM2Order()` renumera `lane` 1..N e reconstrói `tr.raias` na ordem do DOM. A ordem só reseta em `buildRaias` (novo treino); `resetMaster` (Zerar) preserva. **Não remover** `m2Drag.suppressClick`/`suppressBackdrop`: sem eles o clique pós-drag seleciona atleta e o backdrop fecha o dialog.
- **M2 sem terceira linha**: card = handle + raia + nome + parciais. Descanso vive no relógio, repetição na pill central, seleção na borda ciano e registro na linha de parciais; badge `PR!` não é exibido em M2 (só em M1/M3).
- **M3 layout = M2**: mesmo template (handle + badge + nome + parciais + tag + relógio), sem `.sb-raia-last` — o countdown/hint vive no relógio e nas pills. Drag habilitado no M3 (guard `modo !== 2 && modo !== 3` em `onM2RowPointerDown`) mas **restrito à mesma onda** (`data-onda` na row); `commitM2Order` renumera `lane` porém **não** escreve no badge de onda quando `modo === 3`.
- **M3 descanso entre séries**: campo "Descanso entre séries (s)" no Passo 4 (lido em `readTreinoConfig`). `startM3SeriesRest()` dispara no **último registro da 1ª onda** (wall-clock `tr.m3Rest.waitEndsAt`; guard `waitEndsAt !== 0 || pausedRemaining !== 0` contra retrigger) e a virada exige `waves.every(done) && m3RestSatisfied(now)` — **nunca avançar só com `waves.every(done)`**. Pausa preserva o restante (`stopMaster` grava `pausedRemaining`, `startMaster` renormaliza `waitEndsAt`). Na virada: zera `tempos`/`registroId` (rollover por série) e recalcula `startedAt` das ondas a partir de `Date.now()` (senão o escalonamento some a partir da 2ª série).
- **M3 alerta ≤5s**: `M3_ALERT_MS = 5000` → `r.restAlert` na espera de largada da onda e no descanso entre séries; `.rest-alert`/`.rest-countdown` aplicados no ramo M3 de `updateRaiaRow` (antes do `return`), pills `.sb-wave-pill.rest`/`.alert` em `updateModo3Status`. Linhas `done` só repintam durante o descanso via `restMs > 0 || restEnding` no `tickModo3` (sem isso o badge não tica).
- **Descanso ativo = fundo azul**: `updateRaiaRow` alterna `.resting` (`--sb-rest-bg`/`--sb-rest-border`, defs em `#sbChronoDialog`) enquanto `raia.waiting`; `.rest-alert` (≤5s) é `!important` e posterior no CSS → prevalece sobre o azul e sobre `.selected`.
- **M1 alerta ≤10s**: `updateModo1Ui()` aplica `red` + `alert` (pulso) em `#sbCountdown` quando `tr.masterRunning && phase !== "done" && remainingMs <= M1_ALERT_MS` (10000); badge `.rest-countdown` com os segundos **só na fase `rep`** (na `serieInt` o mostrador já é regressivo, ali só vermelho/pulso). Classes são removidas ao avançar de fase e em `done`; `stopMaster()` chama `updateModo1Ui()` no final. O botão Parar fica `disabled` em M1 durante a execução (`syncStopBtn(false, "Parar")`), então `stopMaster()` só é alcançável via M2.
- **Comparador de Atletas**: 3 abas na Análise — Análise (individual), Comparação (VS, 2 atletas), Desempenho (Chart.js). Dados reais do IndexedDB.
- **Análise — Chart.js lazy**: sem tag eager no `index.html`; `ensureChartJs()` (`swimbase.js`) carrega o CDN pinado 4.4.1 ao abrir a aba Desempenho, com `paintChartMessage` de fallback se falhar. `renderDesempenho` é async e só pinta os canvases após o load.
- **SwimBase — isolamento por perfil**: `inActiveProfile` filtra `professorId` do perfil ativo (tolerante a `null`) em `ensureLoaded` e nos re-loads de `saveAtleta`/`saveTurma`/importação CSV. Trocar/perfil chama `reloadSwimBase()` (exportado) e re-renderiza a tela `sb-*` ativa (`state.screen`).
- **SwimBase — `deleteAtleta` é cascata**: apaga também `registros` e `prs` do atleta (confirm avisa; log conta removidos).
- **Cronômetro do Balizamento**: visual unificado com SwimBase (frame escuro `#0c101c`, clock icon, status badge). Display usa `maskTimeHTML` (formato `MM'SS"CC` com centésimos em `<span class="cc-mini">`).
- **Cores de baliza**: aleatórias por série (`LANE_COLORS`), estáveis durante a série. Balizas extrapoladas ficam opacas (`.lane-draft`) até atribuição.
- **Gamepad (GameSir X5 Lite)**: bloco isolado no fim de `app.js` (Gamepad API + rAF). Sistema **View/Config/Home/Mode** ativos em qualquer tela **exceto com cronômetro aberto** (`cronometroVisivel()` — lá LT/RT são Iniciar/Parar); Home/Mode/View fecham modal aberto antes de agir, Config nunca reabre sobre si. **B** fecha qualquer modal (sem modal: `goToControl` no Balizamento). **LB** = `voltarTela()`: ignora com modal aberto → wizard `sb-treino` passo > 1 volta 1 passo via `voltarPassoTreino()` (export de `swimbase.js`, preserva seleção) → senão mapa estático `GP_VOLTAR` (tela → tela pai). **RB** continua o ciclo `GP_TELAS`. **RS** = scroll vertical (`rolarComRs`/`alvoRolagem`, alvo rolável cacheado 300ms: dialog → descendente com overflow → página); D-Pad + LS = cursor de foco. `GP.m` (Mode) segue `null` até achar o index real com `window.gamepadDebug = true`.

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
