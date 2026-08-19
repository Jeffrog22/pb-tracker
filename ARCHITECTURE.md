# ARCHITECTURE — PBTracker

> Documento de Arquitetura Técnica
> Última atualização: 2026-07-31

---

## 1. Visão Geral

O PBTracker é uma **Single Page Application (SPA)** construída com **HTML, CSS e
JavaScript puro (vanilla, ES modules)**, sem framework e sem backend. Todo o
processamento é feito no navegador:

- **Importação** de balizamento em PDF (via PDF.js), JSON e CSV.
- **Persistência** local de logs em `localStorage`.
- **PWA**: `manifest.webmanifest` + `sw.js` para instalação e uso offline.

A aplicação opera em três telas: **Importação**, **Filtro de Provas** e **Controle**,
com um **dialog de cronômetro** sobreposto à tela de controle.

## 2. Stack e Dependências

| Item | Tecnologia |
|---|---|
| Linguagem | JavaScript (ES modules, sem build) |
| Markup | HTML5 semântico (`<section>`, `<dialog>`, `<table>`) |
| Estilos | CSS custom (variáveis de tema, grid) |
| Leitura de PDF | **PDF.js** v4.4.168 via CDN (`pdf.min.mjs`) |
| Exportação XLSX | **SheetJS** via CDN (carregado sob demanda em `exporter.js`) |
| PWA | Manifest + Service Worker + ícones SVG |
| Persistência | `localStorage` (log de atividades) |

Sem dependências de build, bundler ou servidor. O SheetJS só é baixado no
primeiro clique em "Exportar Excel" (com rede); sem rede, o app usa fallback CSV.

## 3. Estrutura de Arquivos

```
PBSwimTrack/
├── index.html              # Estrutura das telas, dialogs (cronômetro/SwimBase), manifesto
├── app.js                  # Toda a lógica da aplicação (estado, parsing, cronômetro, UI, roteamento de modos)
├── utils.js                # Helpers compartilhados (máscara de tempo, normalização, uid)
├── db.js                   # Wrapper IndexedDB (SwimBase: atletas/turmas/registros/prs/settings)
├── swimbase.js             # SwimBase (Tier 2): atletas, turmas, Modo Treino, PRs, Análise
├── charts.js               # Gráficos Canvas nativos (progressão temporal + evolução de PR)
├── exporter.js             # Exportação CSV/XLSX (SheetJS sob demanda + fallback CSV) + registros/PRs
├── styles.css              # Tema, layout mobile-first, cartões, telas, dialog
├── sw.js                   # Service worker: cache offline e estratégia de fetch
├── manifest.webmanifest    # Metadados PWA (nome, ícones, orientação, cores)
├── icons/
│   ├── icon-192.svg        # Ícone PWA 192x192
│   └── icon-512.svg        # Ícone PWA 512x512
├── project-action-log.js   # Script Node para registrar ações de desenvolvimento em log
├── project-summary.md      # Resumo de desenvolvimento
├── PDR.md                  # Definição do produto e requisitos (este repositório)
├── PDR-SwimBase.md         # Requisitos do SwimBase (Tier 2) — MVP = Fase 1
├── ARCHITECTURE.md         # Este documento
├── .gitignore              # Ignora logs (*.log), temporários e .DS_Store
├── pbcards.png             # Screenshot (tela de controle) usada no shell PWA
└── pbcrono.png             # Screenshot (cronômetro) usada no shell PWA
```

## 4. Arquitetura de Telas (SPA)

O app tem **dois modos** controlados por `state.appMode` ("balizamento" |
"swimbase"). A tela de Modos (`#screenMode`) roteia para cada área; a bottom-nav
é renderizada dinamicamente por `renderNav()` conforme o modo. Seções
`.screen`:

| Seção | ID | Função |
|---|---|---|
| Perfil | `#screenLogin` | Cadastro/seleção de professor + equipe (perfil local) |
| Modos | `#screenMode` | Escolha entre Balizamento e SwimBase |
| Importação | `#screenImport` | Formulário (equipe preenchida do perfil, arquivo) e status |
| Filtro | `#screenFilter` | Lista de provas com checkboxes e detalhes |
| Controle | `#screenControl` | Cartões de atleta e botões de abrir cronômetro |
| SB Home | `#screenSbHome` | Resumo do SwimBase (links/atalhos) |
| SB Atletas | `#screenSbAtletas` | CRUD de turmas e atletas + categoria automática |
| SB Treino | `#screenSbTreino` | Wizard de treino (turma → atletas → config) |
| SB Análise | `#screenSbAnalise` | Gráfico de progressão, PRs, registros e export |

O **cronômetro** de balizamento é um `<dialog>` (`#chronoDialog`) com visor,
botões, lista de capturas pendentes e paleta de balizas. O **cronômetro do
SwimBase** é outro `<dialog>` (`#sbChronoDialog`, tela cheia) com relógio mestre
e raias individuais.

## 5. Estado Global

Um único objeto `state` centraliza os dados em `app.js`:

```js
const state = {
  appMode,                // "balizamento" | "swimbase" (área ativa)
  teamName,               // Equipe preenchida (perfil ativo ou editada)
  competitionDate,        // Data da competição (hoje, automática)
  importedAt,             // Timestamp da importação
  importedRows,           // Linhas normalizadas (atletas)
  groupedEvents,          // Map<eventKey, { eventName, series: Map<seriesKey, athletes[]> }>
  selectedProofs,         // Set<eventKey> provas escolhidas
  activityLog,            // Array de { timestamp, message }
  profiles,               // Array de { id, professor, equipe, createdAt } (localStorage)
  activeProfile,          // Perfil ativo ({ id, professor, equipe, createdAt } | null)
  activeChrono,           // Estado do cronômetro (ver §7)
};
```

O **SwimBase** mantém o próprio estado em `swimbase.js` (`sw`, `tr`, `an`),
persistido no **IndexedDB** (`pbtracker-swimbase` v1, via `db.js`):

```
stores
 ├── atletas    { id, turmaId, nome, nascimento, sexo, categoria, observacoes }
 ├── turmas     { id, professorId, nome, nivel, horario }
 ├── registros  { id, atletaId, professorId, dataHora, modo, tipoTreino,
 │                estilo, distancia, serie, tempos[], series, repeticoes,
 │                descanso, intervaloSeries, flagPr, observacoes, syncStatus }
 ├── prs        { id, atletaId, professorId, estilo, distancia, melhorTempo,
 │                tempoAnterior, melhoria, data, local, registroId }
 └── settings   (key/value)
```

PR é a chave `atletaId + estilo + distancia`; `checkPrAndFlag` grava
`flagPr` no registro e faz upsert no store `prs`. `sw.registros`/`sw.prs`
são mantidos em memória (fonte da tela Análise), sincronizados por
`persistRegistro`.

### Modelo do atleta (linha normalizada)

```js
{
  prova, serie, baliza, nome, equipe,
  sexo, tempoBalizado,       // provindos do parser/adaptador
  history: {},               // parcial (metros) -> tempo de histórico editável
  current: {},               // parcial (metros) -> tempo registrado na prova
}
```

As linhas são normalizadas por `normalizeImportedRow` e agregadas por
`groupByProofAndSeries`, que gera chave de evento `prova | sexo`.

## 6. Fluxo de Dados da Importação

```
Arquivo (PDF/JSON/CSV)
   │
   ├─ PDF  → extractPdfLines()      [PDF.js → linhas por coordenada x/y]
   │         parseRowsFromPdfLines() → parseAthleteLine()
   ├─ JSON → parseJsonFile() → adaptGenericRow()
   └─ CSV  → parseCsvFile()  → splitCsvLine() → adaptGenericRow()
   │
   ▼
normalizeImportedRow()        → modelo padrão de atleta
   ▼
groupByProofAndSeries()       → Map<prova|sexo, séries>
   ▼
renderProofList() → seleção  → renderControl() → cartões
   ▼
openChrono() → capturas → registerPendingTimes() → athlete.current[split]
```

### Parsing de PDF (detalhe)

1. `extractPdfLines` lê o texto com PDF.js e **reconstrói linhas** agrupando itens
   pela coordenada `y` (tolerância de 2 px) e ordenando por `x`.
2. `parseRowsFromPdfLines` percorre as linhas mantendo contexto de **prova**,
   **série**, **sexo** e **equipe** (estado de máquina `teamContextState`).
3. `parseAthleteLine` valida o padrão `série baliza código ... tempo` e extrai
   nome, equipe, categoria e tempo (aceitando `S/T`, `NT`, `00:00:00`).
4. Um **diagnóstico** (`window.__PBSWIM_DIAGNOSTIC__`) é exposto à UI quando
   linhas falham, exibindo índice, texto e motivo.
5. Estratégia em duas passadas: primeiro **estrito** (só equipe conhecida); se
   vazio, **tolerante** (`allowUnknownTeam: true`).

### Adaptadores JSON/CSV

- `adaptGenericRow` mapeia chaves flexíveis por similaridade
  (`prova/event`, `serie/série/heat`, `baliza/lane`, `equipe/team/clube`, ...).
- Filtro por equipe usa `isSameTeam` (correspondência fuzzy com acentos removidos
  e stop-words via `getTeamTokens`).

## 7. Arquitetura do Cronômetro

### Máquina de estados do `activeChrono`

| Estado | Transição | Ação |
|---|---|---|
| Parado | `Iniciar/Voltas` | Inicia timer (`setInterval` 30 ms) |
| Rodando | `Iniciar/Voltas` | `captureLap()` — registra parcial |
| Rodando | `Parar/Reiniciar` | `captureLap(true)` (último clique) e para |
| Parado | `Parar/Reiniciar` | Reinicia (`elapsedMs = 0`, limpa pendências) |

### Plano de parciais

`EVENT_SPLITS` define as marcas por distância (50 m a 1500 m, medley especial em
100/200 m). `getSplitsForEvent` detecta a distância pelo nome da prova e retorna
o plano correspondente.

### Captura e registro

1. `captureLap` adiciona `{ split, order, ms, lane: "" }` a `pendingCaptures`.
2. Avança para a próxima parcial quando o número de cliques atinge o total de
   balizas da série.
3. `refreshNextCapture` destaca o **próximo registro** (a última parcial da série
   é ressaltada como aviso).
4. Na lista de pendências, o usuário **atribui baliza**; `buildLaneOptionsForCapture`
   impede balizas repetidas por parcial.
5. `registerPendingTimes` grava `ms` convertido em `athlete.current[split]`
   (formato `MM:SS:CC` via `msToDisplay`).

### Utilidades de tempo

- `normalizeTime` — converte `S/T`, `NT`, `00:00:00` e variações `ss:cc`/`mm:ss:cc`
  para `MM:SS:CC`.
- `parseTimeToMs` / `msToDisplay` — conversões para comparação e exibição.
- `attachTimeMask` / `digitsToTimeMask` — máscara de entrada nos campos de histórico.
- `buildDiffLabel` — gera rótulo `+/-` comparando prova × histórico (verde = melhora).

## 8. Arquitetura PWA

### Manifest (`manifest.webmanifest`)

- `display: standalone` (sem trava de orientação — segue o dispositivo,
  retrato ↔ paisagem), cores e ícones SVG.
- Atendido offline graças ao service worker.

### Service Worker (`sw.js`) — ciclo de vida

1. **`install`**: abre o cache `pbtracker-v35` e pré-cacheia o *app shell*
   (`index.html`, `styles.css`, `app.js`, `utils.js`, `db.js`, `swimbase.js`,
   `charts.js`, `exporter.js`, manifest, ícones e screenshots). Chama
   `skipWaiting()`.
2. **`activate`**: remove caches antigos e executa `clients.claim()`.
3. **`fetch`** — estratégia:
   - **GET** de navegação ou arquivos core (`.html|.js|.css|.webmanifest`):
     **network-first** com fallback para o cache (ou `index.html`).
   - Demais GET: **cache-first** com fallback para a rede e cache em segundo plano.
4. **`message`**: responde a `SKIP_WAITING` para aplicação imediata de atualizações.

### Fluxo de atualização no `app.js`

`setupServiceWorkerUpdateFlow` monitora `updatefound`/`statechange`. Quando um
novo worker fica `installed`, o botão "Atualizar app" vira "Aplicar atualização"
(`markUpdateAvailable`). Ao clicar, o app envia `SKIP_WAITING`; o `controllerchange`
recarrega a página automaticamente.

## 9. Exportação de Resultados (`exporter.js`)

- `buildResultsRows(state, getSplitsForEvent)` — itera **todas** as provas de
  `state.groupedEvents` (ordem do filtro), ordena por série/baliza e monta
  colunas: prova, série, baliza, nome, sexo, tempo balizado e uma coluna por
  parcial de prova (`Prova Xm`, `00:00:00` quando vazio). A seleção de provas
  (`selectedProofs`) **não** restringe a exportação.
- `buildActivityLogRows(activityLog)` — abas com timestamp + mensagem.
- `exportResults(...)` — fluxo:
  1. **Online** → `loadSheetJs()` injeta o SheetJS do CDN **sob demanda** (primeiro
     clique) e gera **XLSX** com abas **Resultados** e **Log de Atividades**.
  2. **Offline ou falha** → `exportCsv` com **BOM UTF-8** e separador `;` (Excel
     pt-BR), com escape correto de células.
- O botão **Exportar Excel** (`#exportBtn`) fica no **topbar** (entre "Trocar
  usuário" e a engrenagem), disponível no **balizamento** (é ocultado no
  SwimBase via `enterMode`).
- O SheetJS, uma vez carregado, é cacheado em runtime pela estratégia
  **cache-first** do service worker (GET cross-origin).

### Exportação do SwimBase

- `exportSwimBaseRegistros` / `exportSwimBasePRs` (no `exporter.js`) geram
  XLSX (SheetJS) com fallback para CSV da primeira aba; arquivos
  `swimbase-registros-<data>.xlsx` / `swimbase-prs-<data>.xlsx`.
- `exportSpreadsheet({ sheets, filename })` é o helper comum (tenta XLSX;
  offline → CSV). Os botões ficam na tela Análise do SwimBase.

## 10. Persistência e Log de Atividades

- `logAction(message)` grava `{ timestamp, message }` no array `state.activityLog`
  e persiste em `localStorage["pbtracker_activity_log"]`.
- `downloadActivityLog` gera e baixa um `.txt` com todas as entradas.
- Ações logadas: início do app, importações (sucesso/falha), cliques do cronômetro,
  exportações de log e de resultados.
- **Perfis de professor/equipe** são persistidos em
  `localStorage["pbtracker_profiles"]` (array de `{ id, professor, equipe,
  createdAt }`); o perfil ativo fica em `localStorage["pbtracker_active_profile"]`
  (id). No carregamento, se houver perfil ativo, o app vai direto à importação
  com a equipe pré-preenchida; caso contrário, exibe a tela de perfil
  (`#screenLogin`). Perfis podem ser **excluídos individualmente** na lista
  (`deleteProfile` com confirmação).

### Versão do app

- A constante `APP_VERSION` em `app.js` define a versão exibida **no topbar, ao
  lado do nome do app** (`#appVersionTag`, via `renderVersionTags`). Deve ser
  **atualizada a cada release** junto do CHANGELOG e da tag SemVer.

## 11. Camada de UI e Estilos

- **Tema**: variáveis CSS em `:root` (cores de fundo, gradientes, `--ok`, `--danger`).
- **Mobile-first**: `@media`/breakpoints; bloqueio em larguras `> 1024px` **apenas
  no modo balizamento** (`applyDeviceGuard` ativa `.desktop-blocked` e o aviso
  `#desktopNotice`; o SwimBase é liberado em desktop).
- **Alto contraste**: `body.high-contrast` sobrescreve as custom properties
  (fundo preto, texto branco, ciano/amarelo), acionado pelo `#highContrastToggle`
  no dialog de Configurações e persistido em `localStorage`.
- **Componentes principais**:
  - `.bottom-nav` / `.nav-item` — navegação inferior **renderizada por
    `renderNav()`** conforme o modo ativo (`state.appMode`).
  - `.topbar-actions` — ações do topo: `#offlineBadge` (indicador offline),
    `#profileSwitchBtn` (Trocar usuário), `#exportBtn` (Exportar Excel) e
    `#settingsBtn` (engrenagem que abre o dialog `#settingsDialog`).
  - `#settingsDialog` — dialog modal de Configurações com `#highContrastToggle`
    (Alto contraste), `#refreshAppBtn` (Atualizar app) e `#downloadLogBtn`
    (Exportar log).
  - `.proof-row` / `.proof-details` — lista de provas e tabela de detalhes.
  - `.event-block` / `.series-block` — seções da tela de controle.
  - `.athletes-card` / `.athlete-row` / `.partials-grid` / `.partial-input` —
    cartão de atleta com badges e parciais lado a lado.
  - `.timer-container` / `.timer-display` / `.btn-pill` — header escuro do dialog
    do cronômetro com dígitos ciano e botões pill.
  - `.chrono-dialog` — dialog do cronômetro (visor, pendências, paleta de balizas).
  - `.sb-*` — componentes do SwimBase: cartões de modo, CRUD de turmas/atletas,
    wizard de treino, raias do cronômetro (`#sbChronoDialog`) e tela Análise
    (`.sb-chart` + `.sb-table`).
- **Segurança de renderização**: todo conteúdo vindo de arquivos passa por
  `escapeHtml` antes de ser injetado no DOM.

## 12. Decisões de Design (ADR resumido)

| Decisão | Justificativa |
|---|---|
| Vanilla JS sem framework | Zero dependências de build; fácil deploy estático e funcionamento offline |
| Estado global único (`state`) | Sincroniza telas/cronômetro sem biblioteca de estado |
| Parsing em duas passadas (estrito/tolerante) | Aumenta a taxa de importação com fallback controlado |
| Diagnóstico em tela no parser | Falhas de layout ficam visíveis para ajuste rápido em campo |
| Network-first p/ core, cache-first p/ assets | Garante versão atualizada do app e offline para o restante |
| Cartão compacto lado a lado | Densidade de informação para uso em tela pequena |

## 13. Limitações Conhecidas

- **Parser PDF acoplado ao layout** recebido; novas variações exigem ajustes em
  `parseRowsFromPdfLines`/`parseAthleteLine`.
- **Dados não persistidos entre sessões**: `importedRows`/`groupedEvents` vivem
  apenas em memória.
- **Sem backend/sincronização** entre dispositivos (SwimBase tem `syncStatus`
  no registro para futura sincronização; hoje exporta manualmente).
- **PDF.js carregado via CDN**: requer rede no primeiro carregamento para habilitar
  importação de PDF (o restante do app funciona offline).
- **XLSX depende do SheetJS (CDN)**: sem rede o app exporta em CSV (fallback).
- **Categoria automática** por idade usa a **data atual** (recalculada a cada
  render); limites de idade conforme `PDR-SwimBase.md` §2.3.
- **Modos 1 e 3 do SwimBase, multi-timer e sync ficam fora do MVP** (Fase 1).
