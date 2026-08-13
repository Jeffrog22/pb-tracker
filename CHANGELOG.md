# Changelog - PBTracker

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]
### Added
- (novas funcionalidades)

### Changed
- (mudanças em funcionalidades existentes)

### Fixed
- (correções de bugs)

### Removed
- (funcionalidades removidas)

## [v0.11.0] - 2026-08-12
### Added
- **Cores aleatórias por série nos toggles de baliza** (registros pendentes do
  cronômetro): cada série embaralha uma paleta de 10 cores (`LANE_COLORS`) em
  `state.activeChrono.laneColors` (via `getBalizaColor`) — toggles da paleta
  ganham `--lane-color` inline e a célula de baliza preenchida da tabela recebe
  o mesmo tint (`.lane-dropzone.filled`). Cores estáveis durante a série mesmo
  com re-renders; o ghost do drag herda a cor (cloneNode preserva o inline).

### Changed
- **Balizas extrapoladas com destaque opaco**: capturas criadas por
  `captureLap` nascem com `laneAssigned: false` (lane copiada do parcial
  anterior via `draftLaneForOrder`). Enquanto não há atribuição, a célula
  recebe `.lane-draft` (opacidade 0.45 + borda tracejada). O destaque volta ao
  normal ao atribuir (drag/swap em `dropLaneOnRow` ou auto-fill N=2 em
  `assignLaneToRow`) e ao tocar para limpar (`clearCaptureLane` reseta). O
  `registerPendingTimes` continua exigindo apenas baliza preenchida — o opaco é
  só feedback visual.
- `APP_VERSION` → **`0.11.0`** e cache do `sw.js` → **`pbtracker-v21`**.

## [v0.10.6] - 2026-08-12
### Fixed
- **"Tempo da prova" desatualizado no Filtro**: a tabela de detalhes era
  construída uma única vez (`dataset.loaded`) e a coluna "Tempo da prova" era
  impressa naquele momento — depois de cronometrar e registrar tempos, os
  parciais do olho recalculavam ao vivo (mostrando o Tempo Final) mas a coluna
  ficava com `00:00:00`. Agora a tabela é **reconstruída** sempre que a tela do
  Filtro é exibida (`showScreen`) e a cada clique em "Ver séries e atletas"
  (reopen), lendo os valores atuais de `athlete.current`. Mantém o lazy-load
  inicial e os checkboxes de `selectedProofs`.
- `APP_VERSION` → **`0.10.6`** e cache do `sw.js` → **`pbtracker-v20`**.

## [v0.10.5] - 2026-08-12
### Removed
- **Badge "Pronto" do dialog de Configurações** (`#appBadge`) removido — o status
  de atualização continua sendo sinalizado pelo botão `#refreshAppBtn`
  ("Atualizar app" → "Aplicar atualização"). Sem usos restantes de `el.appBadge`
  nem do CSS `.settings-row`.

### Changed
- **Label "Aguardando arquivo..." da Tela Inicial removido**: o `#importStatus`
  nasce oculto (`hidden`) e só aparece quando `setStatus()` recebe a primeira
  mensagem real (Processando/Concluído/Erro).
- `APP_VERSION` → **`0.10.5`** e cache do `sw.js` → **`pbtracker-v19`**.

## [v0.10.4] - 2026-08-11
### Removed
- **Workflow do GitHub Pages** (`.github/workflows/deploy.yml`) removido — o
  deploy do app estático migrou para o **Vercel** (`*.vercel.app`), publicado
  automaticamente via git (push em `master`, Framework `Other`, sem build).

### Changed
- Sem mudanças de código do app: `APP_VERSION` e cache do `sw.js`
  (`pbtracker-v18`) permanecem os mesmos; a versão v0.10.4 é apenas o bump do
  hook SemVer para o commit de infraestrutura.

## [v0.10.3] - 2026-08-11
### Changed
- **Tag de versão reposicionada para o topbar**: a versão (`v0.10.3`) agora
  aparece discreta e pequena ao lado do nome do app (`PBTracker v0.10.3`),
  preenchida via `#appVersionTag` em `renderVersionTags()`.
- **Removidas** as tags de versão do rodapé dos painéis de Perfil/Filtro/Controle
  (a `.version-tag` antiga e seu CSS deram lugar a `.version-tag-inline`).

### Fixed
- (sem correções nesta versão)

## [v0.10.2] - 2026-08-11
### Fixed
- **Baliza vira propriedade da linha** (registros pendentes do cronômetro): a
  atribuição deixou de ser global por **ordem** (`laneAssignments[ordem]`,
  retroativa a todas as passagens) e passou a ser **por parcial + ordem**
  (`capture.lane` é a fonte única).
  - Tocar numa baliza para limpar agora remove **somente aquela linha** — antes
    apagava todas as linhas "extrapoladas" da mesma ordem em todos os parciais.
  - Arrastar uma baliza sobre uma linha altera **apenas essa linha**, sem
    contaminar as parciais anteriores ou posteriores.
- **Pré-preenchimento por cópia** (`draftLaneForOrder`): nova captura herda a
  baliza da captura mais recente da mesma ordem (parcial anterior); se a baliza
  já estiver usada na parcial atual, a linha nasce em branco (evita colisão).
- **Swap ao soltar sobre linha ocupada** (`dropLaneOnRow`): arrastar a baliza A
  sobre uma linha que tem B troca A↔B dentro da mesma parcial — corrige
  permutações (ex.: 75m/100m invertidos) em um único gesto. Toggles em uso
  (`.used`) agora podem ser arrastados como origem do swap.
- **Indicador do parceiro do swap**: ao arrastar uma baliza já usada, a linha que
  ela ocupa na parcial atual ganha anel ciano (`.drop-pair`).
- **`registerPendingTimes`** continua exigindo baliza em todas as capturas, mas
  agora o atleta é resolvido por linha (`a.baliza === capture.lane`), atribuindo
  cada parcial ao corredor correto.

### Changed
- `app.js`: `APP_VERSION` → `0.10.2`.
- `sw.js`: cache `pbtracker-v16` → `pbtracker-v17`.

## [v0.10.1] - 2026-08-11
### Changed
- **Redesenho do drag-and-drop de balizas** (registros pendentes do cronômetro):
  - A bandeja de toggles por ordem e o board de dropzones foram substituídos por
    uma **paleta de balizas** (`.lane-palette`) fixa no topo à direita da lista,
    com um **toggle por valor de baliza** da série.
  - A célula **Baliza da tabela virou o dropzone** (`.lane-dropzone` por linha,
    com `data-split`/`data-order`): arrastar um valor da paleta solta direto na
    linha do registro.
  - **Arraste por cópia**: o ghost clona o toggle e o original permanece na
    paleta (como ctrl+c/v); soltar sobre a linha atribui
    `laneAssignments[ordem]` retroativamente às capturas daquela ordem.
  - **Toggle em uso bloqueado**: enquanto uma baliza está atribuída a uma ordem
    na parcial atual, o toggle correspondente fica esmaecido (`.used`) e não
    inicia arraste; sem colisão entre ordens.
  - **Toque na célula limpa**: tocar numa baliza já atribuída na linha remove o
    mapeamento da ordem (re-arrastar também substitui); o toggle volta a
    desbloquear.
  - **Auto-preenchimento com 2 atletas**: após o primeiro drop, a ordem restante
    da parcial recebe automaticamente a baliza livre.
  - Removidos `buildLaneBoard`, `buildLaneToggle`, `.lane-board`,
    `.lane-dropzones`, `.dropzone`, `.lane-tray` e o CSS de `select` da tabela.
- Cache do service worker de `pbtracker-v15` para `pbtracker-v16`.

## [v0.10.0] - 2026-08-11
### Added
- **Drag-and-drop para atribuir balizas aos registros pendentes do cronômetro**:
  - Os selects numéricos de baliza foram substituídos por **toggles arrastáveis**
    (um por ordem/atleta da série) e **dropzones** (as balizas reais da série).
  - O usuário arrasta cada toggle com o dedo ou mouse e solta na baliza
    correspondente à ordem (1 = Baliza 1, 2 = Baliza 5...).
  - Toggle segue o ponteiro (ghost), dropzones destacam em dourado no hover,
    toggle cresce/ganha sombra durante o arraste e há animação de snap no drop.
  - Dois toggles não podem ocupar a mesma baliza (drop recusado volta à origem).
  - O mapeamento `ordem → baliza` é guardado em `laneAssignments` e **persiste
    entre as parciais** da mesma série (capturas novas já nascem atribuídas).
  - Toggles começam na bandeja, sem atribuição; a coluna Baliza da tabela vira
    texto somente leitura.

### Changed
- Cache do service worker de `pbtracker-v14` para `pbtracker-v15`.

## [v0.9.3] - 2026-08-11
### Changed
- **Moldura ao redor dos dígitos do cronômetro**: o quadro ciano agora contorna
  somente os números `00:00:00` (`.timer-display`, retângulo com cantos
  arredondados), removida a borda que envolvia o container escuro do timer.
- **Inputs de PR Parcial com altura reduzida**: no touch (`pointer: coarse`), o
  input de PR Parcial perde o `min-height` de 42px e fica com a mesma altura
  compacta do valor de Voltas/Tempo Final, no Controle e no cronômetro
  (igualar ao menor).
- Cache do service worker de `pbtracker-v13` para `pbtracker-v14`.

## [v0.9.2] - 2026-08-11
### Changed
- **Cronômetro mais compacto no mobile**: removido o label "Cronômetro"; o
  display do timer foi movido para o espaço do label (entre os botões
  Iniciar/Voltas e Parar/Reiniciar) com fonte reduzida. O container do timer
  ganhou borda ciano contornando todo o timer.
- **Descrição da prova e próximo registro** (`#chronoTitle` e `#nextCapture`)
  em fonte menor, mais discreta e alinhadas à esquerda.
- **Botões Registrar/Fechar** menores e alinhados à direita; moldura top/down do
  dialog reduzida (paddings/margens) para dar mais espaço à lista de registros.
- **Parciais**: `.current-value` (Voltas Xm / Tempo Final Xm) com a mesma altura
  do input de PR Parcial no touch (`pointer: coarse`), no Controle e no cronômetro.
- Cache do service worker de `pbtracker-v12` para `pbtracker-v13`.

## [v0.9.1] - 2026-08-10
### Changed
- **Cabeçalhos das parciais no export XLSX** agora acompanham os labels da tela:
  `Prova Xm` → `Volta Xm` (demais parciais) e a última parcial → `Tempo Final Xm`.
  Somente no Excel — o fallback CSV mantém `Prova Xm`.
- Cache do service worker de `pbtracker-v11` para `pbtracker-v12`.

## [v0.9.0] - 2026-08-10
### Changed
- **Exportação Excel sem a coluna Sexo**: o arquivo XLSX deixa de incluir a
  coluna **Sexo** (somente no Excel). O fallback CSV mantém a coluna Sexo.
  Resultado no XLSX: `Prova | Série | Baliza | Nome | Tempo Balizado | Prova Xm...`.
- **Labels das parciais no Controle e no cronômetro**: os títulos `Prova Xm`
  passam a `Volta Xm`; na última parcial (ex.: 200m numa prova de 200), o label
  vira `Tempo Final Xm`. Mudança apenas de texto — chaves `current[split]` e
  históricos inalterados.
- Cache do service worker de `pbtracker-v10` para `pbtracker-v11`.

## [v0.8.1] - 2026-08-08
### Removed
- **Colunas do arquivo exportado (Excel/CSV)**: removidas a coluna **Equipe** e
  as colunas **PR Parcial Xm**. O export passa a conter apenas:
  `Prova | Série | Baliza | Nome | Sexo | Tempo Balizado | Prova Xm...`
  (somente os tempos das parciais de prova). As telas (controle/filtro) não são
  alteradas.

### Changed
- Cache do service worker de `pbtracker-v9` para `pbtracker-v10`.

## [v0.8.0] - 2026-08-08
### Changed
- **Exportação passa a incluir TODAS as provas importadas (filtro)**, e não apenas
  as provas selecionadas no controle. `buildResultsRows` itera `groupedEvents`
  (mesma ordem do filtro); guarda atualizada para "Nenhum resultado disponível
  para exportar".
- Botão **Exportar Excel** movido da tela de Controle para o **topbar**, entre
  "Trocar usuário" e a engrenagem de configurações.
- Cache do service worker de `pbtracker-v8` para `pbtracker-v9`.

## [v0.7.0] - 2026-08-08
### Added
- **Engrenagem de configurações no topbar**: o chip "Pronto" foi substituído por
  um botão de engrenagem que abre um **dialog modal de Configurações**.
- No dialog ficam a **linha de status** (Pronto / Nova versão), o botão
  **Atualizar app** e o botão **Exportar log** (realocados do topbar).

### Changed
- Botão "Trocar usuário" permanece no topbar.
- Cache do service worker de `pbtracker-v7` para `pbtracker-v8`.

## [v0.6.0] - 2026-08-08
### Added
- **Excluir perfil individualmente** na tela de perfil: cada perfil da lista
  ganha um botão `×` que remove o perfil (com confirmação); se for o perfil
  ativo, ele é desativado.
- **Tag de versão no rodapé** das telas de **perfil, filtro e controle**,
  preenchida pela constante `APP_VERSION` (`app.js`), ex.: `v0.6.0`.

### Changed
- Labels do cadastro de perfil simplificados: "Professor" e "Equipe" (sem
  placeholders).
- Cache do service worker de `pbtracker-v6` para `pbtracker-v7`.

## [v0.5.0] - 2026-08-07
### Added
- **Tela de perfil (login/cadastro local)**: cadastro de professor + equipe
  salvo em `localStorage` (`pbtracker_profiles` + `pbtracker_active_profile`).
  Ao abrir o app, seleciona o perfil salvo (ou uma lista de perfis); a equipe da
  importação já vem preenchida. Botão "Trocar usuário" no topo.
- Persistência dos perfis de professor/equipe no dispositivo.

### Removed
- **Campo "Data da Competição"** da tela de importação: a data agora é definida
  automaticamente para a data atual (`todayISO`) e usada apenas no nome do
  arquivo exportado.

### Changed
- `handleImport` não exige mais data; exige apenas equipe + arquivo.
- Cache do service worker de `pbtracker-v5` para `pbtracker-v6`.

## [v0.4.1] - 2026-08-06
### Changed
- **Parciais do filtro reveladas inline na coluna do olho**: o clique no ícone
  ver não abre mais um card abaixo da linha; em vez disso, o próprio ícone é
  substituído pelas parciais da prova (só `current`, juntadas por `/`, ex. 50m →
  `00:23:70/00:26:07`) na mesma coluna, entre **Tempo balizado** e **Tempo da
  prova**. Clicar novamente nas parciais restaura o ícone (toggle).
- Cabeçalho da coluna do olho passa a exibir **ver**.

## [v0.4.0] - 2026-08-06
### Added
- **Tabela "Ver séries e atletas" do filtro com 'Tempo da prova' e parciais**:
  - Nova coluna **Tempo da prova** mostra o tempo final registrado da prova
    (último parcial registrado no cronômetro, via `athlete.current`).
  - Entre **Tempo balizado** e **Tempo da prova**, um **botão ícone de olho por
    atleta** que, ao ser clicado, revela as parciais da prova na própria coluna.

## [v0.3.4] - 2026-08-03
### Fixed
- **Dialog do cronômetro aparecia travado na tela inicial**: o `display: flex`
  do v0.3.3 foi aplicado a `.chrono-dialog` sem escopar ao estado aberto; como
  regra de autor vence a regra do navegador (`dialog:not([open]) { display:none }`),
  o dialog ficava sempre visível cobrindo o app (cronômetro visível sem abrir,
  sem fechar, e com a barra de navegação bloqueada). Agora o flex é escopado a
  `.chrono-dialog[open]`; fechado, o dialog volta a ficar oculto.
- **Fechamento por clique fora do dialog**: clique no `::backdrop` (fora do
  retângulo) agora chama `closeChrono()` — rede de segurança para o botão Fechar.

### Changed
- Cache do service worker de `pbtracker-v4` para `pbtracker-v5` (força shell
  novo e limpa caches antigos em dispositivos com a versão travada).

## [v0.3.3] - 2026-08-03
### Changed
- **Dialog do cronômetro com cabeçalho fixo e lista rolável**: `chrono-dialog`
  vira flex column com `max-height: min(100dvh, 100vh)`; o bloco do cronômetro
  (`.timer-container`) e os botões "Registrar/Fechar" (`.action-footer`) ficam
  fixos, e pendências + atletas (`#pendingList` / `#chronoAthletes`) ficam num
  novo contêiner `.chrono-scroll` (`flex:1; min-height:0; overflow-y:auto`).
  Antes o dialog tinha `overflow: hidden` sem `max-height`, cortando a lista e
  os botões em séries grandes, sem possibilidade de rolagem.

## [v0.3.2] - 2026-08-03
### Fixed
- **Máscara de PR parcial engolia dígitos digitados**: antes cada tecla era lida
  do valor já formatado (`00:00:00`) e os zeros pré-preenchidos ocupavam as 6
  posições, então "001923" ficava sempre `00:00:00`. A máscara agora mantém um
  buffer de dígitos crus (`data-digits`), acumula apenas os dígitos digitados
  (colagem e backspace também tratados via `beforeinput`) e re-emite `input`
  para persistência/atualização do diff. Digitar `001923` agora exibe
  `00:19:23`.

## [v0.3.1] - 2026-08-03
### Fixed
- **Inputs de PR parcial não recebiam valores**: inputs de histórico no dialog
  do cronômetro não tinham nenhum listener (máscara/persistência); na tela de
  controle, cada tecla disparava um re-render total (`renderControl()`) perdendo
  o foco. Agora a máscara de tempo seleciona o conteúdo no foco, os listeners
  persistem em `athlete.history` e só o rótulo de diferença do split é atualizado
  em tempo real (sem re-render da tela).

### Changed
- **Label "Histórico" renomeada para "PR Parcial"** nos cartões de atleta e no
  dialog do cronômetro, mantendo a mesma divisão de parciais do "Prova Xm"
  (`getSplitsForEvent`). Cabeçalho da coluna no exportador (Excel/CSV) também
  renomeado de `Hist Xm` para `PR Parcial Xm`.

## [v0.3.0] - 2026-08-03
### Changed
- **Redesign completo do front do cronômetro**: nova paleta de cores, header
  escuro no dialog com dígitos ciano, botões `pill` (Iniciar/Voltas verde,
  Parar/Reiniciar magenta, Registrar laranja, Fechar transparente).
- **Bottom navigation fixa** com 3 abas (Início, Provas, Controle) substituindo
  a navegação por botões isolados; `showScreen()` sincroniza a aba ativa.
- **Cartões de atleta** reestruturados para `.athlete-row` dentro de
  `.athletes-card`, com badges de baliza/balizado/categoria e grid de parciais
  (`partials-grid`/`partial-input`) no lugar dos blocos compactos antigos.
- Guarda na tela de Controle: mensagem "Selecione provas" quando acessada sem
  seleção, com botão de atalho para o filtro.
- Cache do service worker de `pbtracker-v3` para `pbtracker-v4`.

## [v0.2.0] - 2026-08-02
### Added
- Exportação de resultados em **XLSX** (SheetJS via CDN, carregado sob demanda)
  com abas Resultados e Log de Atividades.
- **Fallback automático para CSV** (BOM UTF-8, separador `;`) quando offline.
- Botão **Exportar Excel** na tela de controle.
- Novo módulo `exporter.js` (`buildResultsRows`, `buildActivityLogRows`,
  `exportResults`).
- Inicialização do repositório git e ativação do hook SemVer.

### Changed
- Cache do service worker de `pbtracker-v2` para `pbtracker-v3` (+ `exporter.js`).

## [v0.1.0] - 2026-07-31
### Added
- Aplicação PWA mobile/tablet-first (manifest, service worker, ícones SVG).
- Importação de balizamento em PDF (via PDF.js), JSON e CSV.
- Filtro de atletas por equipe com correspondência fuzzy (acentos e stop-words).
- Agrupamento por prova + sexo e por séries/balizas.
- Tela de controle com cartões compactos de atleta (histórico × tempo de prova).
- Cronômetro com captura de parciais por volta, atribuição de baliza e registro.
- Comparação de diferença entre prova e histórico (melhor/pior).
- Diagnóstico visual de falhas do parser em tela.
- Log de atividades persistente em `localStorage` e exportação em `.txt`.
- Bloqueio de uso em larguras > 1024px com aviso de desktop.
- Documentação do projeto (PDR.md, ARCHITECTURE.md) e kit de documentação
  (AGENTS.md, CHANGELOG.md, DEVELOPMENT.md, README.md, scripts/, templates/).
